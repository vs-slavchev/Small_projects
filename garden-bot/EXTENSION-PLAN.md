# Garden Bot: remote-configurable watering — design plan

Extending the current system (ESP32 → AWS IoT → DynamoDB → Lambda → static site) so
watering rules can be changed from the website without reflashing, with accounts and
device ownership.

This is a design review as much as a plan. **§12 collects flaws, risks and open
questions**; each section flags problems inline where they belong.

---

## 0. Decisions already made

Settled in discussion, recorded here so they don't get relitigated:

| Decision | Note |
| --- | --- |
| **Transport stays MQTT over AWS IoT Core**, config delivered as a retained message | Mechanics in §2 |
| **One certificate and one topic namespace per device** | §3 |
| **One account owns a device, permanently.** No transfer or release. | Consequences in §4 |
| Keep the **hardcoded initial date**; watering at the wrong time beats not watering | §9 |
| **No external RTC**: track a last-watered *timestamp* and fast-forward it when NTP corrects the clock | Implemented, §9 |
| Keep the **30 s unclaimed poll loop**, falling back to 30 min after **2 hours** | §9 |
| The evaluator lives in **firmware C++ and front-end JS only** | Drift mitigation in §7 |
| **"Water now" is out of scope**; `mlPerSecond` is **hand-calibrated** | §7 |
| **Cost is not the deciding factor** — pick the pleasant option | Applies to §5 |
| Watering duration is set per update; the **UI asks for millilitres, total across all pots** | §7 |
| Rule order is for **UI stability only**, not evaluation precedence | §7 |
| **Control plane single-table, readings in their own table** | §6 |
| **`rejected` is a first-class config state** | §8 |
| **Sign-up is allowlisted** — authenticate anyone, authorize a list | §5 |
| **Device ids are immutable**; the editable `nickname` absorbs renaming | §3 |
| **One certificate per device and no others** — backend and console use IAM | §3 |
| **Threat model: remote attackers only.** Physical access is out of scope | §4 |
| **No compression**; `setBufferSize(4096)` and a 3 KB server-side cap | §2 |
| **The wake interval is fixed at 30 min**, not user-configurable | — |

---

## 1. What exists today

| Piece | State |
| --- | --- |
| Firmware | `firmware/garden-bot/garden-bot.ino`, wakes every 1800 s, hardcoded `shouldWater()`, publishes to `esp32/pub`, subscribes `esp32/sub` with a no-op handler |
| Device identity | Per-device X.509 cert + `AWS_THINGNAME` in `secrets.h`; `BOT_NAME` from `config.h` goes in the payload |
| Storage | DynamoDB `garden-bot-data`, key `(device HASH, timestamp RANGE)`, ms epoch |
| API | REST API Gateway → `lambda-timestream-query.py` (legacy name), `Access-Control-Allow-Origin: *`, **no auth** |
| Site | Static `front-end/`, re-implements the firmware rules in JS |
| Resilience | RTC-backed `message_queue` replays readings after outages |

Two pre-existing holes get fixed as a side effect: the API is a **public IDOR** (guess a
device name, read its history), and device identity is **asserted in the payload**
(`doc["device"] = BOT_NAME`) rather than proven, so any device with a valid cert can write
readings attributed to any other.

---

## 2. Transport: is MQTT even the right choice?

### The reframe

The device is awake for ~10 seconds every 30 minutes. **It is a batch client, not a
connected client.** Pub/sub's entire value proposition — a server pushing to a live
connection — is worth almost nothing here, because nothing can be pushed to a device that
is powered down 99.5% of the time. Everything downstream is *effectively polled* whether
or not the protocol calls it that.

So the honest framing is: you are choosing between polling mechanisms, and the criteria
are (a) how the device authenticates, (b) how many TLS handshakes per wake, (c) how much
firmware you write.

**(b) dominates energy.** The mutual-TLS handshake with an RSA-2048 client cert is the
expensive part of a wake — one to three seconds of CPU and radio. The protocol framing on
top of it is noise at 48 messages a day. Whatever you choose, the rule is: **one TLS
handshake per wake, all traffic over it.**

### Options

| Option | Device auth | Config down | Readings/ack up | Handshakes |
| --- | --- | --- | --- | --- |
| **A. MQTT + retained message** (planned) | X.509 mTLS, built in | retained msg delivered on SUBSCRIBE | PUBLISH | 1 |
| **B. MQTT + named Device Shadow** | same | shadow `/get` + delta | shadow `/update` + PUBLISH | 1, more round trips |
| **C. AWS IoT HTTPS data plane** | same certs, same host | `GET :8443/things/{t}/shadow?name=config` | `POST :8443/topics/devices/{id}/readings` | 1 (keep-alive) |
| **D. Your own REST API (API Gateway)** | **you must build it** | `GET /devices/{id}/config` | `POST /devices/{id}/readings` | 1 |
| **E. Poll a static JSON file on S3/CloudFront** | none | `GET config/{id}.json` + `If-None-Match` | still needs D or A | 2 |

### Why D is worse than it looks

"Just use REST" sounds simpler until you ask how the device proves who it is. API Gateway
gives you three choices and all are more work than IoT Core:

- **mTLS** — supported only on a **custom domain name**, and you must run your own CA and
  upload a truststore to S3. That is strictly more infrastructure than IoT Core, which
  already does this for free.
- **A bearer secret in flash** — weaker than a certificate, extractable over UART, and it
  reintroduces exactly the "secret compiled into firmware" problem §3 argues against.
- **SigV4 with per-device IAM credentials** — needs the IoT credentials provider or a
  Cognito identity pool, i.e. IoT Core again, with extra steps.

**The single strongest argument against rolling your own REST API is that you'd be
rebuilding the one thing AWS IoT gives you for nothing: per-device X.509 identity plus a
policy language that can authorize on it (§3).** Everything else about IoT Core is
replaceable; that part isn't.

### Why E is tempting and still wrong

Config as a JSON object on CloudFront is the cheapest, simplest downstream channel
imaginable — a plain `GET` with `If-None-Match`, CDN-cached, no service to run. But S3
can't validate a client certificate, so authorization would rest on the URL being
unguessable, and the upstream path still needs a real authenticated channel. You'd end up
with **two** trust models and two TLS handshakes to save perhaps 30 lines. Reject it.

### Decision: A — MQTT with a retained config message

Not because MQTT is the better protocol shape for this client (request/response genuinely
fits a 10-second batch client better), but because it already works, X.509 identity and
policy-variable authorization come free, and one flag buys the delivery property you need.

#### How retained messages actually work

Normal MQTT is **fire-and-forget to whoever is listening right now**. Publish to a topic
with no subscribers and the message is gone — there is no mailbox. That is fatal for a
device that is powered down 99.5% of the time, which is why this is the single most
important mechanic in the design.

Setting the **retain flag** changes the semantics of a topic from *event* to *state*:

- The broker stores **the last retained message per topic** — exactly one, indefinitely.
- Publishing a new retained message to that topic **replaces** the stored one.
- Any client that SUBSCRIBEs to that topic receives the stored message **immediately**, as
  part of the subscribe, without anyone republishing it.
- Publishing a zero-length payload with retain set **clears** it.

So the config topic becomes a one-slot mailbox that always holds the current desired
state. The device doesn't need to be listening when you save a config; it picks it up on
its next wake, whether that's in 5 seconds or 5 days. **You get durable delivery with no
queue, no session state, and no server-side retry logic.**

This is exactly the right split for your two directions of traffic:

| Traffic | Nature | Retain |
| --- | --- | --- |
| Readings, acks | **Events** — each one is a distinct fact with a timestamp | `false` |
| Config | **State** — only the current value matters | `true` |

#### Why this also solves the ack problem

**PubSubClient publishes at QoS 0 only** — there is no QoS parameter on `publish()`, and
no delivery confirmation. So an ack can be lost, and the config would sit at `pending`
forever.

Retention fixes this for free. Because the config is still sitting on the broker, the
device receives *the same config again* on its next wake. If it tracks which version it
last acked (in RTC memory / NVS), it can notice the ack didn't land and re-ack. **A lost
ack self-heals within one wake cycle.** No QoS 1, no retry queue, no dead-letter handling
— which is what makes QoS 0 acceptable here rather than a compromise.

That gives the device three cases on receiving a config:

| Received version vs. stored | Action |
| --- | --- |
| Newer | Validate, persist to RTC + NVS, ack `applied` (or `rejected`) |
| Same, already acked | Ignore silently — this is the steady state, ~48×/day |
| Same, not yet acked | Re-ack (the previous ack was lost) |

#### Wake-cycle sequence

Order matters:

```
connect TLS + MQTT (client id = thing name)
  └─ SUBSCRIBE devices/{id}/config       ← retained message arrives here, within ms
  └─ pump client.loop() for ~2 s         ← callback fires during this window
  └─ handle config, PUBLISH ack
  └─ PUBLISH reading (+ flush the RTC backlog)
  └─ disconnect, deep sleep
```

**Subscribe before publishing**, and subscribe as early as possible after connect, so the
retained message is already in flight while you do other work. The receive window is
mandatory (§9) — `setup()` currently calls `client.loop()` once, which is not enough for a
callback to fire.

Subscribe at **QoS 1** so the SUBACK confirms the subscription took; retained delivery
works at QoS 0 too, but QoS 1 costs nothing and PubSubClient supports it on subscribe.

#### Practical notes

#### Buffer sizing — 2048 is not enough

AWS IoT allows 128 KB per message, so the broker is never the constraint. **PubSubClient
is.** Its buffer defaults to `MQTT_MAX_PACKET_SIZE` = 256 bytes and is a single allocation
used for both inbound and outbound packets; anything larger is **silently dropped, with no
error and no callback**. You must call `setBufferSize()` — and the number matters.

Worst case at the §7 bounds (8 rules × 6 comparisons, longest variable name,
four-digit values, 20-character rule names), measured rather than estimated:

| Encoding | Bytes |
| --- | --- |
| Verbose objects, with rule names | **3058** |
| Verbose objects, names stripped on the wire | 2818 |
| Compact arrays `["hours_since_watering","gte",2000]` | 1842 |

So `setBufferSize(4096)`. 4 KB of heap is free money on an ESP32 even with mbedTLS
resident, and it leaves headroom for the bounds to grow.

Two changes worth making regardless of the buffer:

- **Strip rule `name` before publishing to the device.** Names are UI-only; the device
  never reads them. Beyond the 240 bytes, this removes the *only* unbounded user-controlled
  string from the device's parse path — everything the firmware then sees is a known token
  or an integer. The full version with names stays in DynamoDB for the UI.
- **Enforce a serialized-byte cap server-side** (3 KB), not just a rule/comparison count.
  Counts don't bound bytes, and the failure mode on the device is silence.

#### Compression: no

Gzip would take a 3 KB config to roughly 500 bytes. Don't do it:

- **The saving is worth nothing.** 2.5 KB over a link that just spent 1–3 seconds on a TLS
  handshake is ~20 ms of radio at any realistic rate. Handshake dominates everything (§2).
- **It costs more RAM, not less.** You'd need the compressed buffer *and* a decompression
  output buffer, i.e. more than the 4 KB you were trying to avoid.
- **It destroys your best debugging tool.** A retained message you can read in the AWS IoT
  MQTT test client is worth far more than 2.5 KB.

If size ever genuinely becomes a problem, the compact array encoding above buys 40% for
free and stays human-readable. Reach for that first; compression never.

Do note the recurring cost this implies: the retained config is re-delivered on **every**
subscribe, so ~3 KB × 48 wakes/day of downstream traffic per device, forever. That's fine
— it's the price of the delivery guarantee, and it's what makes lost acks self-heal.

#### Last Will and Testament, and why this device disconnects ungracefully

**LWT** is an MQTT dead-man's switch. At connect time a client can register a will — a
topic, a payload, and a retain flag — which the broker holds. If that client disconnects
**without sending a DISCONNECT packet**, the broker publishes the will on its behalf. The
classic use is `home/sensor/status = "offline"`, retained, so dashboards show liveness
without polling.

The distinction that matters:

| Disconnect | What happens | Will fires? |
| --- | --- | --- |
| **Graceful** — client sends an MQTT `DISCONNECT`, then closes TCP | Broker knows it was deliberate | **No**, will is discarded |
| **Ungraceful** — TCP drops with no DISCONNECT: crash, power cut, network loss, keepalive timeout | Broker can't tell why it vanished | **Yes** |

This device's disconnect is ungraceful **because nothing ever sends DISCONNECT**.
`deepSleep()` calls `disconnectWiFi()` and then `esp_deep_sleep_start()`; `client.disconnect()`
is never called, so the TCP connection simply evaporates when the radio goes down and the
CPU powers off. From the broker's side that is indistinguishable from the board falling in
a pond. It waits out the keepalive interval and then declares the client gone.

So: **don't register an LWT here** — it would fire 48 times a day on a perfectly healthy
device — and don't derive "online" from connect/disconnect events, which are pure noise at
this duty cycle. Liveness comes from `lastSeenAt` on the readings.

> Worth doing anyway: add `client.disconnect()` before `disconnectWiFi()` in `deepSleep()`.
> One line. It lets the broker release the session immediately instead of waiting out a
> keepalive timeout, and it makes an ungraceful disconnect *mean something* again — a real
> crash — if you ever want that signal. Not done in this branch; say the word.

- **Retained messages have an account quota** and are billed as messages. At tens of
  devices you are nowhere near any limit, and the cost is fractions of a cent.
- **Clearing a config** (zero-length retained publish) is how you'd return a device to
  "never water". Prefer publishing `rules: []` explicitly — same effect, but it's a
  versioned, acked, auditable config rather than an absence.

#### Keep option C in your back pocket

If the receive window or retained semantics get fiddly in practice, moving to the IoT
HTTPS data plane is a **firmware-only** change — the IoT rules, DynamoDB and Lambda paths
are identical because HTTPS publish lands on the same topics. It converts "subscribe, pump
the event loop, hope the callback fires before deep sleep" into a synchronous `GET` whose
response you either have or don't.

Its one real cost: `${iot:Connection.Thing.ThingName}` is tied to an **MQTT connection**,
so an HTTPS request must authorize on `${iot:Certificate.Subject.CommonName}` instead —
meaning the certificate's CN has to be the device id, meaning you sign your own CSR
(`CreateCertificateFromCsr`) rather than letting AWS mint the keypair. Doing that at
provisioning time anyway keeps the door open for ~10 extra lines in a script you only run
once per board. *(Verify policy-variable availability before relying on it — it's the
load-bearing detail of option C.)*

---

## 3. `topic(2)`, and why the device id belongs in the topic

### What a topic is

An MQTT topic is just a hierarchical string, segments separated by `/`, chosen by the
publisher at publish time:

```
devices/cherry-3-pot/readings
   1          2          3
```

There is no registry and no schema — `esp32/pub` (today) and
`devices/cherry-3-pot/readings` (proposed) are equally valid strings. Subscribers can use
wildcards: `+` matches exactly one segment, `#` matches the rest.

### What `topic(2)` is

AWS IoT **rules** are SQL statements evaluated against each message. `topic(n)` is a
built-in function returning the *n*-th segment of the topic the message arrived on,
**1-indexed**:

```sql
SELECT *, topic(2) AS device, timestamp() AS timestamp
FROM 'devices/+/readings'
```

One rule, one `+` wildcard, all devices. `topic(1)` = `devices`, `topic(2)` = the device
id, `topic(3)` = `readings`. (The 1-indexing catches everyone once.)

### How it gets set — and why it's trustworthy

The firmware builds the string itself:

```cpp
char topic[64];
snprintf(topic, sizeof(topic), "devices/%s/readings", DEVICE_ID);
client.publish(topic, jsonBuffer);
```

So on its own the topic is **exactly as forgeable as the payload** — a malicious device
could write `devices/someone-elses-bot/readings` just as easily as it could set
`"device": "someone-elses-bot"` in the JSON.

**What makes it trustworthy is the IoT policy, not the topic.** The policy grants publish
rights only on a topic containing a variable the *broker* substitutes from the
authenticated TLS identity:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "iot:Connect",
      "Resource": "arn:aws:iot:REGION:ACCT:client/${iot:Connection.Thing.ThingName}" },
    { "Effect": "Allow", "Action": "iot:Publish",
      "Resource": [
        "arn:aws:iot:REGION:ACCT:topic/devices/${iot:Connection.Thing.ThingName}/readings",
        "arn:aws:iot:REGION:ACCT:topic/devices/${iot:Connection.Thing.ThingName}/ack"
      ] },
    { "Effect": "Allow", "Action": "iot:Subscribe",
      "Resource": "arn:aws:iot:REGION:ACCT:topicfilter/devices/${iot:Connection.Thing.ThingName}/config" },
    { "Effect": "Allow", "Action": "iot:Receive",
      "Resource": "arn:aws:iot:REGION:ACCT:topic/devices/${iot:Connection.Thing.ThingName}/config" }
  ]
}
```

The trust chain is:

```
TLS client certificate  →  the thing it's attached to  →  ${iot:Connection.Thing.ThingName}
                        →  the only topics this connection may touch  →  topic(2) in the rule
```

If device A publishes to `devices/B/readings`, the broker's authorization check fails and
the message is dropped **before any rule sees it**. So `topic(2)` is a value the broker
has already vouched for; a device id inside the JSON body is a value the device merely
claimed.

Requirements for the variable to resolve: the certificate must be **attached to a thing**,
and the MQTT client id must equal the thing name (the firmware already does
`client.connect(AWS_THINGNAME)`). One policy document covers every device you will ever
own — no per-device IAM, no per-device policy.

Corollary for the rule: **take the device id from `topic(2)`, and drop `doc["device"]`
from the payload** (or keep it and ignore it) so nothing downstream can be fooled by a
forged body.

### The topic set

| Topic | Direction | Retained | Purpose |
| --- | --- | --- | --- |
| `devices/{id}/readings` | device → cloud | no | sensor readings (replaces `esp32/pub`) |
| `devices/{id}/config` | cloud → device | **yes** | desired watering config |
| `devices/{id}/ack` | device → cloud | no | `applied` / `rejected` / `unclaimed` |

### Proposal: two topics, not three — fold the ack into the reading

Worth deciding before any of this is built, because it simplifies several sections at once.

The ack topic exists to carry one fact: *"I am currently running config version N"*
(or *"I refused version N because…"*). But the device already publishes a reading on
**every single wake**, in the same connection, moments later. Putting `config_version` and
`config_status` in the reading payload costs ~30 bytes and deletes:

- one topic and its two policy statements,
- one IoT rule and one Lambda,
- the entire "what if the ack is lost" question — because **every reading re-states the
  device's current config version**, so the backend's view is refreshed 48 times a day
  instead of once per config change. The self-healing property of §2 stops being a clever
  consequence of retention and becomes structural.

Reading payload gains:

```json
{ "config_version": 7, "config_status": "applied", "reject_reason": null, ... }
```

The one thing the ack topic does that a reading can't is announce an **unclaimed** device,
since the plan says unclaimed devices don't publish readings. That's easily resolved: let
an unclaimed device publish readings anyway. Its own telemetry is not sensitive, storing it
gives you history from first power-on (a small bonus), and the "device seen, ready to
claim" signal the setup page needs comes free. The backend simply doesn't attribute
readings to an owner until one exists.

**Recommendation: two topics.** Three was the right instinct — acks *are* conceptually
distinct from readings — but the device's wake cycle already gives you a heartbeat, and
piggybacking state onto it is strictly more robust than a separate one-shot message. Your
call; the rest of this document assumes three so it still reads correctly either way.

### Do we need a topic per device? Yes — and it's free.

The common worry is that topics are resources you provision and pay for. **They aren't.**
An MQTT topic is a string in a message header. There is nothing to create, nothing to
delete, no per-topic quota, no per-topic cost. `devices/gb-7QXF-2M9K/readings` springs into
existence the moment something publishes to it and stops existing when nothing does. So
"one topic namespace per device" costs exactly zero, and scaling to hundreds of devices
changes nothing about the infrastructure.

The only per-topic state that persists is the **retained message** on the config topic —
one small stored payload per device, billed as a message, subject to a generous
account-level quota.

### Do we need a TLS identity per device? Yes — this one is close to mandatory.

Sharing one certificate across all devices breaks three things at once:

1. **Authorization collapses.** Policy variables resolve to the *same* value for every
   device, so `${iot:Connection.Thing.ThingName}` can no longer distinguish A from B. You'd
   be back to trusting the payload — the exact hole this design closes.
2. **Revocation becomes all-or-nothing.** One compromised or discarded board means
   revoking the certificate that every other board depends on, i.e. reflashing all of
   them.
3. **Client ids collide.** Two devices connecting with the same MQTT client id kick each
   other off in a loop — the broker permits only one connection per client id. This isn't
   theoretical; it's an immediate operational failure the moment you own two bots that
   happen to wake at the same time.

Cost of doing it properly: AWS IoT certificates are free and unlimited, and one policy
document (with variables) covers every device forever. The only real work is the
provisioning script.

### Drawbacks of putting the device id in the topic

Honest list — none are dealbreakers, but they're real:

- **Device ids become immutable** — which you want anyway. The id appears in the thing
  name, the certificate attachment, the topic strings, and the retained message's
  location, so renaming means re-provisioning. Treat the id as a permanent opaque handle
  the user sees exactly once, on the sticker, and give them a freely-editable `nickname`
  for everything user-facing (§11).
- **Rules must use wildcards**, so per-device rule behaviour would mean overlapping rule
  filters rather than a natural per-device split. You don't want that today.
- **Fan-out debugging is less convenient.** With a single shared topic you watch one place;
  with per-device topics you subscribe `devices/+/readings`. See below — this needs no
  extra certificate.

### How many certificates? One per device, and nothing else.

Correcting an earlier claim in this document: **no second "admin" certificate is needed.**
X.509 client certs are only for things that connect *as MQTT clients over mutual TLS* —
i.e. the devices. Everything else in this system authenticates with **IAM**:

| Who | How it talks to IoT Core | Credential |
| --- | --- | --- |
| ESP32 devices | MQTT over mutual TLS, port 8883 | **X.509 cert, one per device** |
| Backend Lambdas (publishing config) | `iot-data` SDK `publish()` — an HTTPS API call | IAM execution role |
| You, debugging | AWS console MQTT test client, or an SDK/WebSocket client | IAM console session |

So the answer to "can we do with one?" is: **you already are** — one per device, zero
extras. The backend never holds a certificate, and neither do you. Subscribing to
`devices/+/readings` to watch the whole fleet is an IAM-authorized action from the console
test client, governed by your IAM policy rather than by an IoT policy attached to a cert.

You'd only need an additional certificate for a *standalone* cert-authenticated MQTT
client — a `mosquitto_sub` script, or a monitoring gadget with no AWS credentials. Neither
is on the roadmap, and if one ever is, that's the moment to create it, not now.

### The alternative that half-works, for completeness

You *could* keep a single shared readings topic and still authorize correctly, because IoT
rule SQL exposes `clientid()` — the authenticated MQTT client id of the publisher. A rule
could compare `clientid()` against the payload's claimed device and drop mismatches.

That works for **upstream** traffic. It cannot work for **downstream**: a shared config
topic means every device receives every device's config. That's a privacy leak, it wastes
radio time and battery on every bot in the fleet, and filtering by id would happen *on the
device* — i.e. exactly where a malicious device would decline to filter.

So downstream must be per-device regardless. And once it is, making upstream per-device
too is free and keeps one consistent model instead of two.

---

## 4. Claiming: the code, and what "possession" means

### The threat model, stated plainly

Everything in this section follows from one sentence:

> **The goal is to stop someone *without* physical access from taking control of another
> person's device. An attacker who is holding the device is out of scope.**

That's the right line for a garden bot — someone standing in your garden with a screwdriver
can take the plant, and no amount of cryptography helps.

What it lets you **not** do:

- No flash encryption, no secure boot, no eFuse burning.
- No secure element for the private key.
- The BLE passkey can stay a fixed compile-time constant.
- No tamper detection, no attestation.

What it still **requires**, and these are the ones that matter:

- **The claim code must never leak through a non-physical channel** — not git, not logs,
  not a URL query string, not a `Referer` header, not a backup. That single requirement
  drives the sticker, the URL fragment, the hash-at-rest, and the rate limiting below.
- **Per-device certificates**, so a remote attacker who extracts one device's key gains
  nothing about any other (§3).
- **Broker-enforced topic isolation**, so a compromised device can't read or write another's
  traffic (§3).
- **Server-side ownership checks on every API call** (§10).

### Three different identity questions

They get conflated constantly, and separating them is the whole design:

| Question | Answered by |
| --- | --- |
| Is this really device X talking to AWS? | The **X.509 client certificate**. Already solved. |
| Is this really user U on the website? | The **Google/Firebase ID token** (§5). |
| Does user U have the right to control device X? | **Neither of the above.** Needs a third thing. |

Nothing about the certificate says who *owns* the device, and nothing about the login says
which devices that person is near. The claim code exists purely to answer the third
question, and the only evidence a website can realistically ask for is **proof of physical
possession**.

### The code is a secret shared between the object and the backend — not the firmware

The claim code lives in exactly two places:

- **On a sticker on the enclosure** — the physical world.
- **As a hash** in DynamoDB — the backend.

That's it. **The firmware never sees it and doesn't need it**, because the device plays no
part in claiming. Claiming is a pure website↔backend transaction: the user types a code,
the backend compares its hash to the stored one, and if it matches it writes an ownership
row. The device finds out later, incidentally, by receiving a config it didn't have
before.

### "Nothing in flash" — what the recommendation actually is

To be precise, because this is easy to overstate: **the recommendation is not that flash
holds no secrets.** It can't be. The device's private key is in flash and has to be — that
is what makes the TLS connection possible, and there's no way around it short of hardware
you don't have. The recommendation is narrower:

> **Put in flash only what the firmware actually reads. The claim code isn't that.**

Everything on the device is there because some line of code needs it: the Wi-Fi password,
the certificate, the private key, the BLE passkey. The claim code is the sole exception —
no line of firmware would ever read it, because claiming happens entirely between the
browser and the backend. Storing it would add a fourth copy (flash, build tree, backups,
git history) of a secret purely for symmetry with the other secrets.

**The two secrets have different threat models, which is the real reason to separate them:**

| Leaked secret | What an attacker gains |
| --- | --- |
| **Private key** | The ability to impersonate *that one device* — publish fake readings and receive its config. To extract it they need physical access to the board, at which point they could take the plant instead. Bounded, and largely uninteresting. |
| **Claim code** | The ability to claim a device they have **never touched** — remotely, from a leaked photo, a git history, a support email. Since claiming is permanent and one-shot (§0), that isn't just unauthorized access: **it permanently denies you your own device.** There is no recovery short of editing DynamoDB by hand. |

So the claim code is the *more* damaging of the two to leak, despite protecting the less
sensitive thing. That inversion is the whole argument. The proof-of-possession must be
bound to the physical object — the sticker — not to the software running inside it.

### If you did want the key out of flash

Not recommended here, listed so the option is known:

- **Secure element** (ATECC608B, ~$1): stores the private key in hardware and performs
  ECDSA on-chip; the key is never readable, even with the board in hand. AWS IoT supports
  this well. Real cost is board respin and firmware work.
- **ESP32 flash encryption + secure boot** via eFuses: free, no extra parts, but the eFuse
  burn is **irreversible** and a mistake bricks the board. It also complicates reflashing
  during development.

For a garden bot, neither is worth it. The honest position is: *the private key is in
flash, and the threat that implies is someone with physical access to the device — who
already has the plant.* That's an acceptable risk, stated deliberately rather than by
omission.

### QR sticker

Encode a claim URL and print it alongside the human-readable code:

```
https://garden.example.com/claim#gb-7QXF-2M9K.K7M2-9QXF-3A
                                 └ device id ┘ └ claim code ┘
```

Two details worth getting right:

- **Put it in the URL fragment (`#`), not the query string.** Fragments are never sent to
  the server, so the code stays out of CloudFront access logs, out of the `Referer` header
  if the page later links anywhere, and out of browser-history sync in a slightly less bad
  way. The page JS reads `location.hash` and POSTs it to `/devices/claim`.
- **Print the code as text under the QR too.** Smudged stickers, bad lighting, and laptops
  without cameras are all real. The text path must work standalone.

Character set: **Crockford base32** — no `I`, `L`, `O`, `U`, so no 0/O or 1/I confusion,
and it's case-insensitive on input. Group with dashes: `K7M2-9QXF-3A` is 10 characters ≈
50 bits. That's far beyond brute-forceable, and combined with rate limiting (5 attempts
per device per hour, 20 per account per hour, tracked as `CLAIMATTEMPT#` items with a TTL)
the attack surface is nil.

Generate it server-side at provisioning time and store **only** the hash (Argon2id or
bcrypt; at minimum HMAC-SHA256 with a pepper — plain SHA-256 of a 50-bit secret is
GPU-brute-forceable). You never need to recover the plaintext; if the sticker is lost, so
is the device, which is the correct behaviour for a possession token.

The provisioning script should emit: thing + certificate + policy attachment + the
`DEVICE#<id>/META` row + **a printable sticker PNG** with QR and text. That script doesn't
exist yet and is a prerequisite for everything else (§12).

### Device ids should not be guessable

`cherry-3-pot` is enumerable. Use `gb-7QXF-2M9K` or at least `cherry-3-pot-k7m2`. The
claim endpoint should also return **the same generic error** for "no such device", "wrong
code" and "already claimed", so it can't be used to discover which devices exist.

### Living with permanent ownership

Accepted as scope control, with two consequences worth writing down rather than
discovering:

1. **Never claim a real device with a throwaway or test account.** There is no undo in the
   product. The only recovery is you editing the `ownerUserId` attribute in the DynamoDB
   console — so make sure the design keeps that possible (it does: ownership is a plain
   attribute on a plain item, not derived or immutable). Don't add anything later that
   breaks that escape hatch.
2. Because there's no undo, **the claim button needs a confirmation step**: *"This
   permanently links Basil Pot to your account and cannot be changed."* Five lines of UI
   that prevent the only irreversible mistake in the system.

---

## 5. Authentication — Firebase is a good call

### Recommendation: Firebase Authentication + an API Gateway HTTP API JWT authorizer

Given cost isn't the driver, Firebase Auth is the pleasant choice and I'd take it over
raw Google Identity Services:

- **The SDK refreshes tokens for you.** This is the real reason. Raw GIS gives you a
  1-hour ID token and no browser refresh token, so a dashboard left open on a kitchen
  tablet starts 401-ing and you end up hand-rolling silent re-auth. Firebase's JS SDK
  holds a refresh token, renews the ID token in the background, and exposes
  `onAuthStateChanged` / `getIdToken()`. The hourly-expiry wart simply disappears.
- Good DX: `signInWithPopup(new GoogleAuthProvider())` and you're done. Session
  persistence across reloads is default behaviour, not something you build.
- Free at this scale (Google sign-in is on the free tier; only phone auth and the
  Identity Platform upgrade cost money).
- If you later want email/password or anonymous accounts, they're already there.

**Server side you still write no auth code.** Firebase mints standard OIDC JWTs, so an API
Gateway **HTTP API** JWT authorizer validates them directly:

- issuer: `https://securetoken.google.com/<firebase-project-id>`
- audience: `<firebase-project-id>`

API Gateway fetches the JWKS via OIDC discovery and checks signature, `exp`, `aud` and
`iss` itself; the Lambda reads verified claims from
`event.requestContext.authorizer.jwt.claims`. *(Worth a 10-minute spike to confirm the
discovery document resolves — it's the one assumption here I'd verify rather than trust.)*

The alternative server side — a Lambda authorizer running `firebase-admin` and
`verify_id_token` — works but costs you a service-account key to store and a heavier cold
start. Prefer the JWT authorizer: no code, no secret.

While you're there: the current endpoint is a **REST** API, and JWT authorizers are an
**HTTP** API feature. Migrating is a small job and HTTP APIs are also ~70% cheaper per
request, which is irrelevant here but not a downside.

### The one thing to be deliberate about: your user key

**Firebase's `sub` is the Firebase UID, not the Google account's `sub`.** The Google
identity is nested under `firebase.identities["google.com"]`.

This matters more than usual because **ownership is permanent**. Key the ownership rows on
the Firebase UID and you're fine — but if you ever migrate off Firebase, every UID
changes, and every permanent device binding points at a user that no longer exists. Two
options:

- Key on the **Firebase UID** (simplest) and accept that leaving Firebase means a
  migration script that rewrites ownership rows. Write that down now so future-you knows
  it's required rather than discovering it.
- Or key on the underlying **Google `sub`** extracted from the token claims, which is
  stable across identity providers. Slightly more code, and it breaks if you ever enable a
  non-Google sign-in method.

I'd key on the Firebase UID and store the Google `sub` and email alongside it as
attributes, so a future migration is mechanical rather than impossible.

**Never key on email.** Emails are mutable and, for Workspace accounts, reassignable to a
different person.

### Chores

- `Access-Control-Allow-Origin: "*"` must become the exact site origin once requests carry
  an `Authorization` header; add `http://localhost:xxxx` as a second allowed origin and as
  an authorized domain in the Firebase console for local dev.
- Production needs an https origin (CloudFront or similar), not a bare S3 website
  endpoint.
### Allowlisting sign-up

The key move is to **separate authentication from authorization**. Don't try to stop
people signing in — Firebase will happily authenticate any Google account, and blocking
that is the expensive path. Instead, let anyone authenticate (which only establishes *who
they are*) and have your API refuse to do anything for a user who isn't on the list.

**Recommended: an allowlist in the control table, checked in the Lambda.**

| PK | SK | Attributes |
| --- | --- | --- |
| `ALLOW#<lowercased email>` | `INVITE` | addedBy, addedAt, claimedByUid |

Flow on every request:

1. The JWT authorizer verifies the token (already happening, no code).
2. The Lambda looks up `USER#<uid>/PROFILE`. If it exists, proceed — this is the hot path,
   one `GetItem`.
3. If it doesn't, look up `ALLOW#<token email>`. If present, create the profile, stamp
   `claimedByUid`, proceed. If absent, return **403** with a distinct code so the front end
   can render *"This account isn't enabled yet — ask the owner to add
   you@example.com"* rather than a generic error.

Two details that matter:

- **Check the `email_verified` claim** before matching on email. With Google sign-in it's
  always true, but the check costs nothing and stops an unverified address from ever
  matching an allowlist entry if you add another provider later.
- **Allowlist by email, not UID**, because email is what you know *before* the person has
  ever signed in — you can't pre-authorize someone by a UID that doesn't exist yet. Store
  the UID once they first sign in, then key everything else off the UID (§5). Email is used
  exactly once, as an invitation lookup.

Adding someone is a single `PutItem` — console, CLI, or a five-line script. For a handful
of users that's the right amount of machinery; if it ever grows, add an `isAdmin` flag on
your own profile and a `POST /allow` endpoint.

**Alternatives considered:**

- **Firebase blocking functions** (`beforeCreate` / `beforeSignIn`) reject unknown users at
  the identity layer, so no account is ever created — cleanest in principle, but they
  require upgrading to Identity Platform. More moving parts and a billing change for a
  check you can do in one `GetItem` you're already making.
- **Invite codes** at sign-up: more machinery than an email list, and it puts a secret in
  a second place.
- **Domain restriction** via the `hd` claim: only works for Workspace domains, not Gmail.
- **Nothing at all** is a defensible position — a stranger's account is inert without a
  physical sticker, so the allowlist is protecting your Lambda quota and your peace of
  mind rather than your plants. But since it's one lookup you're already doing, do it.

---

## 6. Data model, and when single-table actually pays

### Why single-table design exists

DynamoDB has no joins. If your read is *"give me this user, their devices, and each
device's current config"*, three tables means 1 + N + N round trips. Single-table puts all
of those items under the **same partition key**, so one `Query` returns them together —
physically co-located, one network call. That is the entire benefit: **collapsing a
multi-entity read into one round trip.** The canonical talks about it come from teams
doing thousands of requests per second, where 3 round trips versus 1 is the difference
between a 15 ms and a 45 ms p99.

Secondary benefits: one set of alarms/metrics/backup config, and GSIs shared across entity
types instead of duplicated per table.

### What it costs

- **Opacity.** `PK=USER#123, SK=DEVICE#abc` in the console is unreadable next to a
  `devices` table with a `deviceId` column. Debugging and ad-hoc queries get worse.
- **No per-entity shape.** Every item is a bag of attributes; application code
  discriminates on SK prefix, and nothing stops you writing a malformed item.
- **Harder migrations.** Restructuring one entity's keys means touching a table holding
  everything.
- **Messier exports.** A full table export is five entity types interleaved.
- **You must know all access patterns up front** — which, as you said, you do.

### What multi-table costs

- Extra round trips for multi-entity reads (the real one).
- More objects to create, alarm on, and grant IAM for.
- **Not money.** On on-demand billing you pay per request, not per table — N tables cost
  exactly the same as 1 for the same traffic. (This *would* differ under provisioned
  capacity, where each table needs its own headroom. Another reason to stay on-demand.)
- Cross-table transactions are fine — `TransactWriteItems` works across tables in the same
  account and region, up to 100 items.

### Rule of thumb

> Single-table when items are **read together**. Separate tables when they are only ever
> read apart, have **wildly different volumes**, or have **different lifecycles**
> (retention, TTL, backup policy).

### Applied here: control plane single-table, readings separate

All three tests point the same way for readings:

- **They're never read together.** A dashboard load does one query for "my devices" (~5
  items), one or two gets for config (~2 items), and one query for 30 days of readings
  (~1400 items). You cannot usefully merge a 1400-item query with a 5-item one — you'd be
  paginating config items behind a wall of telemetry. **Single-table saves exactly zero
  round trips on the path that matters.**
- **Volume differs by ~1000×.**
- **Lifecycles differ.** Readings expire after a year; ownership must never expire. A
  1-year TTL on a mixed table is one mis-set attribute away from deleting a user's device.
  That's the reinforcing argument, not the primary one — but it's the one that would hurt
  most if you got it wrong.

And the control-plane entities pass the same test in the other direction: user, their
devices, and a device's config history are small, related, and genuinely read together.

**So: keep `garden-bot-data` as-is for readings (add a TTL attribute), add one new
`garden-bot-control` table.**

| PK | SK | Attributes |
| --- | --- | --- |
| `USER#<uid>` | `PROFILE` | email, googleSub, displayName, createdAt |
| `USER#<uid>` | `DEVICE#<deviceId>` | nickname, claimedAt *(ownership edge)* |
| `DEVICE#<deviceId>` | `META` | ownerUserId, claimCodeHash, configVersionCounter, activeVersion, pendingVersion, lastSeenAt, firmwareVersion, mlPerSecond, tz |
| `DEVICE#<deviceId>` | `CONFIG#<version, zero-padded to 8>` | status, rules JSON, wateringDurationS, mlPerSecondAtSave, createdBy, createdAt, ackedAt, rejectReason |
| `DEVICE#<deviceId>` | `CLAIMATTEMPT#<ts>` | ip, result, `ttl` |

Access patterns, **zero GSIs**:

| Pattern | Query |
| --- | --- |
| List my devices | `PK = USER#<uid>`, `SK begins_with DEVICE#` |
| Is device X claimed / by whom | `GetItem PK=DEVICE#<id>, SK=META` |
| Current config | META → `activeVersion` → `GetItem CONFIG#<n>` |
| Config history | `PK = DEVICE#<id>`, `SK begins_with CONFIG#`, `ScanIndexForward=false`, `Limit=20` |
| Authorize a request | META lookup, compare `ownerUserId` to the token's uid |

**Zero-pad the version in the SK** (`CONFIG#00000042`) so lexicographic sort equals
numeric sort — otherwise version 10 sorts before version 9 and "latest" silently breaks at
the tenth edit.

### Cost, since you asked

For 10 devices on-demand: reading writes ≈ **$0.22/year**, storage ≈ **$0.08/year**,
dashboard reads and the entire control plane round to zero, TTL deletions are free. A
Route 53 hosted zone would cost more than the whole database. DynamoDB is not a cost
consideration in this system — just don't use provisioned capacity and don't `Scan` in a
hot path.

### TTL footgun

TTL requires a **Number attribute in epoch *seconds***. Your `timestamp` range key is
**milliseconds**. Add a separate `ttl` attribute (`timestamp/1000 + 31536000`) in the IoT
rule — do not point TTL at the millisecond field. Test on a copy of the table; a units
error here silently deletes the dataset. Existing items have no `ttl` and live forever
until you backfill with a scan + batch update (a 20-line one-off, worth running).

---

## 7. The rule language

### Structure

Disjunctive normal form: rules OR'd, comparisons within a rule AND'd. Complete — every
boolean expression can be written this way — so forbidding nested parentheses costs no
expressiveness and buys a UI that is two flat lists instead of a tree editor.

```json
{
  "schema": 1,
  "version": 7,
  "tz": "EET-2EEST,M3.5.0/3,M10.5.0/4",
  "watering_duration_s": 150,
  "rules": [
    { "name": "hot afternoon",
      "all": [
        { "var": "max_temp_c",           "op": "gte", "value": 28 },
        { "var": "hours_since_watering", "op": "gte", "value": 24 },
        { "var": "hour_of_day",          "op": "eq",  "value": 15 }
      ] },
    { "name": "morning",
      "all": [
        { "var": "hour_of_day",          "op": "eq",  "value": 8 },
        { "var": "hours_since_watering", "op": "gte", "value": 48 }
      ] }
  ]
}
```

**`rules: []` means "never water"** — the config an unclaimed or freshly reset device
runs. It must be an explicit, documented value, not an accident.

### Ordering

The array order is preserved purely so the UI renders the user's rules in the same order
every time. **Evaluation is order-independent** — it's a plain OR, and the firmware may
short-circuit on the first match. Write that in a comment in both implementations, because
the next person to read the code will assume precedence and eventually rely on it.

### Watering duration and the millilitre UI

`watering_duration_s` is one top-level field per config. The device only ever deals in
seconds; the millilitre conversion is entirely a front-end concern:

```
seconds = round(millilitres / mlPerSecond)
```

**Where `mlPerSecond` lives is the design question, and the answer is: on the device META
row**, editable in device settings. It cannot be a front-end constant — pump, tubing
diameter, and how far the bot has to lift water all differ per build, and you already have
more than one board.

Four things about this that will bite:

1. **Calibration is by hand** — decided. There's no in-product way to measure flow rate
   without an on-demand pump command, and that's out of scope. So the settings field is
   filled in by the user: run the pump for a known time into a measuring jug, divide.
   Make the field prominent, label it *"measured millilitres per second"*, and put the
   one-line method in the helper text — an unexplained number nobody knows how to obtain
   is worse than no field. Seed it from the pump datasheet as a default so a fresh device
   is usable before anyone calibrates.
2. **Flow rate is not constant.** It falls as the battery sags and as the tank empties and
   the head height grows. Real-world spread is easily ±20%. Present volumes as approximate
   (*"≈ 500 ml"*), or users will trust a number that was never that precise.
3. **Millilitres are the total across all pots** — decided. The bot waters three pots from
   one manifold (`WATERING_DURATION_S 150 // 50s per pot`), so "500 ml" means 500 ml
   leaving the pump, ~165 ml per pot. Label the input *"total water"* explicitly; a user
   who reads it as per-pot will under-water by 3×, and that failure is silent.
4. **Rounding and clamping.** Firmware clamps to `[10, 300]` seconds regardless of config;
   the UI must clamp the millilitre input to the equivalent range **and say why**,
   otherwise someone asks for 2 litres and silently gets 300 seconds' worth. Show the
   round-trip: *"500 ml → 50 s → ≈ 495 ml"*.

Store `mlPerSecondAtSave` on each config item, so an old config in the history still
renders as the volume it actually meant. Recalibrating shouldn't silently rewrite history.

### Variables (whitelist)

| Variable | Units | Range | Source |
| --- | --- | --- | --- |
| `moisture_pct` | % | 0–100 | current reading |
| `temp_c` | °C | −40–60 | current reading |
| `max_temp_c` | °C | −40–60 | `maxRecentTemperature`, reset on watering |
| `hours_since_watering` | h | 0–2000 | `now - lastWateredEpoch`, both corrected by NTP |
| `hour_of_day` | h | 0–23 | device-local time |
| `day_of_week` | 0=Sun | 0–6 | optional, cheap now |

Ops: `gt`, `lt`, `gte`, `lte`, `eq`. Operands: **plain signed int** — correct. Temperature
is already `round()`ed to an int in the firmware and moisture is an integer percent. If
half-degrees ever matter, add a *new* variable in tenths (`max_temp_dc`) rather than
changing an existing one's type; int→float invalidates every stored config.

Deliberately **not** exposed: `water_available` (stays a hardcoded firmware gate — no user
rule may dry-run the pump) and `battery_mv` (a safety floor, hardcode it).

`hours_since_watering` is `now - lastWateredEpoch`, both real timestamps, kept honest
across clock corrections by the NTP fast-forward in §9. **Fixed in this branch** — the old
counter is gone, and §9 explains why replacing it was better than patching it.

### Safety invariants stay in firmware

The config arrives from the internet. Treat it as hostile even though it's yours:

- **Clamp `watering_duration_s` to `[10, 300]`.** A typo'd `15000` empties the tank and
  cooks the pump.
- **Minimum interval floor.** A rule of just `hour_of_day == 8` fires on *both* the :00
  and :30 wakes. Enforce a hardcoded `MIN_SECONDS_BETWEEN_WATERING` (~3 h) that no config
  can lower, and warn in the UI when a rule set has no `hours_since_watering` clause.
- **Bounds:** max 8 rules × max 6 comparisons. Bounds the JSON to ~1.5 KB, bounds RTC
  memory, and lets the firmware parse into fixed-size arrays with no heap.
- **Reject, don't crash** (§8), and keep running last-known-good.

### Two implementations, and how they drift

Firmware C++ and front-end JS. That's fine, with one caveat worth knowing: **they aren't
actually the same function.** The firmware evaluates once against current sensor values;
the front end evaluates *and simulates forward* to predict the next watering, which means
looping over hypothetical future hours and resetting `hours_since_watering` /
`max_temp_c` at each simulated watering. Only the inner `evaluate(config, vars) → bool`
needs to match.

The cheapest insurance — not a third implementation, just shared data — is a JSON fixture
file of `(config, vars) → expected` cases in the repo, read by a host-compiled C++ test
and a JS test. Divergence becomes a failing test instead of a plant that quietly never
gets watered. Worth it precisely *because* there are only two: nobody will notice a subtle
mismatch by reading both.

For that to be possible, write the evaluator as **pure C++ with no Arduino includes**
(`watering_rules.h/.cpp`) so it compiles on a laptop.

---

## 8. Config lifecycle

### Version numbers are the anchor

Every config gets a **monotonic integer version per device**, allocated by an atomic
`ADD configVersionCounter :1` on the META item. Retained payload, ack, DB item and UI all
refer to it. Never reason about "the pending one" without a version — that's how races
become bugs.

### States

| State | Meaning |
| --- | --- |
| `pending` | Written to DB and published (retained). No ack. |
| `active` | Device acked it; this is what's running. |
| `superseded` | Was `active`, a later version is now `active`. |
| `abandoned` | Was `pending`, a newer version was published before it was acked. |
| `rejected` | Device received it and **refused** it. |

Invariants: at most one `active`, at most one `pending`, `pending.version >
active.version`.

### What `rejected` is, and why you want it

`rejected` distinguishes *"the device received this and said no"* from *"the device never
received it"*. Causes:

- JSON doesn't parse (truncated, corrupt).
- `schema` version the firmware doesn't understand.
- Unknown variable name or operator.
- More rules or comparisons than the fixed arrays hold.
- Values outside the accepted range.

Since the backend validates against the same schema, `rejected` *should* be unreachable —
and that's exactly the argument for having it, because the one case it catches is the one
you can't validate away: **version skew between firmware and backend.** You deploy a site
that emits `day_of_week`, a board still running last summer's firmware doesn't know it,
and without `rejected` that board sits at `pending` forever looking identical to a device
with a flat battery. With it, the UI says `rejected: unknown_variable:day_of_week` and you
know instantly it's a firmware update, not a hardware fault.

It also tells the device what to do: **keep running last-known-good**. Never fall back to
"no watering" on a bad config — plants die quietly.

### Transitions

Saving a config (one `TransactWriteItems`):

1. `ADD configVersionCounter :1` on META → version *N*.
2. Put `CONFIG#N` with `status = pending`.
3. If a `pending` *M* exists, set it to `abandoned`.

Then publish retained to `devices/{id}/config`.

> If step 4 fails after the transaction commits, the DB says `pending` but the broker
> holds the old config. Add a **republish** operation that re-sends whatever is currently
> `pending`, called both by a retry and by a manual UI button.

Handling an ack for version *K*:

- `K == pending.version` → `pending → active`, previous `active → superseded`.
- `K < pending.version` → the device applied an older config before the newer one reached
  it. Mark *K* `superseded`, leave the newer one `pending`. **Do not** blindly promote
  "the pending one" — this rule is the whole reason versions are on the wire.
- `K > pending.version` → impossible; log and alarm.

### "Pending" is a story, not a spinner

A device offline for three days shows `pending` forever, and the word tells the user
nothing. The UI should say: *"Waiting for the plant to wake up — it last checked in 14
minutes ago, so this should apply by 15:40."* And when last-seen is stale: *"This device
hasn't reported since Tuesday; the new rules won't apply until it's back."*

**Rollback** is nearly free given the history is in the DB: re-publish an old rule set as a
new version. It's the first thing you'll want after a bad edit.

---

## 9. Firmware

### Wake cycle

```
boot
 ├─ load config: RTC mem → NVS fallback → "no config" (never water)
 ├─ read sensors (unchanged)
 ├─ connect Wi-Fi, NTP  (configTzTime with the POSIX TZ string)
 ├─ connect AWS, subscribe devices/{id}/config
 ├─ pump client.loop() for CONFIG_WAIT_MS (~2 s)
 │    └─ on config: validate → persist (RTC + NVS) → publish ack{applied|rejected}
 ├─ evaluate rules against the variable map
 ├─ if fire && water_available && battery ok && min-interval ok → pump, then reconnect
 ├─ publish reading (+ flush queued)
 └─ deep sleep
```

### The receive window is mandatory

`setup()` currently calls `client.loop()` **once** and immediately deep sleeps. A retained
config arriving on SUBSCRIBE would be dropped on the floor. It needs a bounded window:

```cpp
unsigned long start = millis();
while (millis() - start < CONFIG_WAIT_MS && !configReceived) {  // ~2000 ms
  client.loop();
  delay(20);
}
```

Two extra seconds of radio per wake, 48 times a day — nothing against the current ~10 s
wake and a 150 s pump run. (This whole dance is what option C in §2 would delete.)

### Config must survive power loss

`RTC_DATA_ATTR` survives deep sleep but **not** a battery disconnect. Persist the parsed
config to **NVS** (flash) on every change and load from NVS when RTC memory is cold —
otherwise a battery swap silently reverts the device to "no config" and it stops watering
with no error anywhere. One flash write per config change is nothing for wear.

### Timekeeping — fixed

The DST bug is fixed in this branch. `configTime(gmtOffset_sec, daylightOffset_sec, ...)`
builds a POSIX TZ string with **no transition rules**, so the C library falls back to its
defaults (US changeover dates) — leaving the clock an hour off for the ~3 weeks in March
and ~1 week in autumn where US and EU dates disagree. Replaced with
`configTzTime(TZ_INFO, ntpServer)` and a full spec in `config.h`:

```c
#define TZ_INFO "EET-2EEST,M3.5.0/3,M10.5.0/4"
```

Also set `timeinfo.tm_isdst = -1` before the dead-reckoning `mktime()` so a clock running
without Wi-Fi re-derives DST from the date instead of carrying a stale flag across a
changeover. `gmtOffset_sec` / `daylightOffset_sec` are gone from `secrets_template.h`; a
local `secrets.h` that still defines them is harmless, they're simply unread.

Later, `tz` becomes a per-device config field so the timezone is set from the website
rather than compiled in.

### No external RTC: last-watered as a timestamp, fast-forwarded by NTP — **fixed in this branch**

The hardcoded 2023-06-02 seed stays: *"watering at the wrong time beats not watering at
all"* is right for a plant. But it creates a hazard — when NTP eventually lands, the clock
**leaps by years**, and anything derived from a timestamp difference explodes.

The old approach dodged this with a counter (`seconds_since_last_watering += SECONDS_TO_SLEEP`
every wake), which is immune to clock jumps but has two problems of its own:

- **It froze.** The increment lived inside `shouldWater()`'s `if (!shouldWater)` branch — a
  side effect hidden in a predicate — so when conditions were met but the tank was empty,
  the counter stopped accumulating entirely.
- **It drifts.** With no external RTC, the ESP32 sleeps on its internal oscillator, which
  is off by tens of seconds per 30-minute sleep. Adding a nominal `SECONDS_TO_SLEEP` each
  wake accumulates that error indefinitely, and nothing ever corrects it.

Replaced with a **real timestamp plus an NTP correction**, which fixes both at once:

```c
RTC_DATA_ATTR time_t lastWateredEpoch = 0;   // 0 = not watered this power cycle
```

**Dead reckoning** is the navigation term: estimating where you are now from your last
known fix plus how fast and how long you've travelled, with no external reference. Ships
did it with a compass and a knotted log line between star sightings. It's always
approximate and the error accumulates, but it beats having no position at all.

Here the last known fix is `timeinfo` (the time at the previous wake), the "speed and
heading" is `SECONDS_TO_SLEEP`, and the star sighting is NTP. `timeinfo.tm_sec +=
SECONDS_TO_SLEEP` estimates the current time by assuming the sleep lasted exactly its
nominal 30 minutes. It didn't: the ESP32's deep-sleep timer runs on an internal RC
oscillator rather than a crystal, so it's off by tens of seconds per sleep, and the awake
time isn't counted at all. The error is systematic, not noise, and it compounds every
cycle until a real fix corrects it.

`saveCurrentTime()` now dead-reckons **unconditionally** (advance `timeinfo` by the sleep
just finished, `tm_isdst = -1` so DST is re-derived from the date), records that estimate,
then syncs. Doing it always — rather than only in the NTP-failure branch, as before — is
what makes jump detection possible at all: without an estimate to compare against, you
cannot distinguish "the clock is badly wrong" from "30 minutes have passed."

If NTP answers and the correction exceeds `CLOCK_JUMP_THRESHOLD_S` (300 s),
`lastWateredEpoch` is shifted by the same delta:

```c
time_t actual = mktime(&timeinfo);
long clockJump = (long)(actual - estimated);
if (lastWateredEpoch != 0 && (clockJump > CLOCK_JUMP_THRESHOLD_S || clockJump < -CLOCK_JUMP_THRESHOLD_S)) {
  lastWateredEpoch += clockJump;
}
```

**Shifting both endpoints preserves the interval across the jump.** A bot that watered
while its clock read June 2023 and then syncs to today has its `lastWateredEpoch` carried
forward by the same three years, so `now - lastWateredEpoch` is still "four hours ago" —
not "three years ago", which would fire every time-based rule at once.

The 300 s threshold is chosen so ordinary oscillator drift (tens of seconds) is ignored
while real corrections (hours to years) are caught. Ignoring small drift is correct, not
lazy: once NTP works, *both* endpoints are real timestamps and the difference is accurate
without any adjustment. The correction exists solely to rescue a `lastWateredEpoch` that
was recorded against a wrong clock.

`secondsSinceLastWatering()` returns `INITIAL_SECONDS_SINCE_WATERING` (10 days) while
`lastWateredEpoch == 0`, preserving the old "water at the first opportunity after power-on"
behaviour. `shouldWater()` is now a pure predicate with no side effects.

> Remaining edge, accepted: a device that **never** gets Wi-Fi keeps a wrong absolute clock
> forever, so `hour_of_day` rules fire at the wrong real-world hour. Intervals stay
> correct (they're relative), so it still waters roughly on schedule — which is the
> trade-off you chose.

### The 30 s unclaimed loop — kept, with a 2-hour cap

At ~10 s awake per 30 s cycle the duty cycle is ~33%, versus ~0.55% in normal operation —
roughly **60× the average current**. A pack that lasts months normally lasts about a day
in claim mode.

That's fine for the intended flow (power on, claim within minutes), and the loop exits as
soon as a config arrives. To cover the powered-on-and-forgotten case, **after 2 hours of
unclaimed polling the device falls back to the normal 30-minute cycle** — one RTC-retained
counter and one comparison. Power-cycling re-enters fast claim mode, which is the natural
gesture anyway ("I'm about to set this up, let me switch it on").

Nothing is lost by falling back: because the config is a retained message (§2), a device on
the slow cycle still picks up its first config on its very next wake.

While unclaimed the device should publish `{"type":"unclaimed"}` to its ack topic so the
site can show *"device seen, ready to claim"* during setup, but should **not** publish
readings — nobody owns them and there's no ownership row to attribute them to.

### Topic migration

`esp32/pub` → `devices/{id}/readings` is a breaking change across firmware, IoT rule and
Lambda. Run **both** rules in parallel for one release, writing to the same table; delete
the old rule once every board reports on the new topic.

---

## 10. API surface

All routes behind the JWT authorizer; every device-scoped route re-checks
`DEVICE#<id>.ownerUserId == claims.uid` **server-side**.

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/me` | profile; created on first call **if the email is on the allowlist**, else 403 |
| `GET` | `/devices` | owned devices, last-seen, active/pending version |
| `POST` | `/devices/claim` | `{deviceId, claimCode}`, rate-limited, conditional write, generic errors |
| `PATCH` | `/devices/{id}` | nickname, timezone, `mlPerSecond` |
| `GET` | `/devices/{id}/readings?daysago=N` | replaces the current open endpoint |
| `GET` | `/devices/{id}/config` | active + pending + history |
| `PUT` | `/devices/{id}/config` | validate → version → store → publish retained |
| `POST` | `/devices/{id}/config/republish` | self-heal a stuck pending |

Claim uses a conditional write so it's atomic and race-free:

```
UpdateItem  PK=DEVICE#<id>  SK=META
  ConditionExpression: attribute_not_exists(ownerUserId)
  UpdateExpression:    SET ownerUserId = :uid, claimedAt = :now
```

Plus two IoT-rule-triggered Lambdas with no API Gateway in front: readings → DynamoDB
(exists, re-topic'd), and ack → update config status + `lastSeenAt`.

---

## 11. UI

### Design for the 30-minute latency, don't hide it

Show **last-seen** prominently and express pending config as a predicted apply time. Poll
the API every ~30 s while a config is pending (a few reads a day, effectively free) rather
than making the user refresh, and confirm clearly when the ack lands.

### Rule builder

- **Preset cards** — "Summer daily", "Winter minimal", "Hot-weather twice daily",
  "Moisture-triggered" — each showing the plain-English rules it expands to, and each
  editable as a starting point. A preset is just a rule set, not a separate concept.
- Render the rules back as a sentence under the builder: *"Water if max temp ≥ 28 °C **and**
  ≥ 24 h since last watering **and** the hour is 15."* If the sentence reads wrong, the
  rules are wrong — this catches most user errors for free.
- **Backtest against history — the highest-value feature here, and nearly free.** You
  already store a year of readings; run the candidate rule set over the last 14–30 days of
  real data and show *"this would have watered 6 times: Jul 3, Jul 5, …"* beside the
  current config's *"watered 4 times"*. It turns an abstract boolean expression into a
  concrete outcome and catches "waters every 30 minutes" before it reaches the plant. Do
  it client-side, reusing `/readings`. One caveat to state in the UI: the backtest must
  **simulate forward** (resetting `hours_since_watering` and `max_temp_c` at each
  simulated watering) rather than evaluating each historical point independently, or the
  numbers are nonsense.
- Warn on obvious mistakes: no `hours_since_watering` clause, contradictory rules
  (`hour_of_day > 20 and hour_of_day < 6` never fires), millilitre values outside the
  clamp.

### Next-watering prediction

Replace the hardcoded `computeNextWatering` with a simulation over the **active** config —
never the pending one, which would show a future that isn't running. If both exist, show
the active prediction plus *"changing to … once applied"*.

Be honest about what a prediction can know: future temperature and moisture are
unknowable. Compute the **earliest possible** next watering assuming current values hold
and label it that way — *"Earliest next watering: tomorrow 08:00, if it stays this warm."*
A confidently wrong exact time is worse than an honest range.

### Multi-device and claiming

The `?device=` selector becomes an owner-scoped list from `GET /devices`, with a
user-editable **nickname** distinct from the immutable device id — `gb-7QXF-2M9K` is not a
plant.

Claim flow: `Sign in → scan QR (or type the code) → confirm the permanent link → poll for
the first ack/reading → "Connected. Now choose watering rules."` Land the user directly in
the preset picker; a claimed device with no rules waters nothing, and that must never be a
silent state.

---

## 12. Flaws, risks, open questions

### Must fix

1. **Sleeping devices miss non-retained MQTT config** — without the retain flag, a config
   published while the device sleeps is lost forever. §2, §8.
2. **`client.loop()` is called once**, so an inbound config is never processed. §9.
3. **`MQTT_MAX_PACKET_SIZE` defaults to 256 bytes** in PubSubClient — a config is silently
   dropped with no error anywhere. Worst case at the §7 bounds measures **3058 bytes**, so
   `setBufferSize(4096)`, strip rule names on the wire, and cap serialized bytes
   server-side. §2.
4. **Device id comes from the payload, not the topic** — any device can forge another's
   readings. §3.
5. **The readings API has no authorization** — current public IDOR. §5, §10.
6. **Config must survive power loss** (NVS, not just RTC), or a battery swap silently
   disables watering. §9.
7. ~~**DST applied with the wrong rules**~~ — **fixed in this branch** (`configTzTime` +
   full POSIX TZ). §9.
8. ~~**The last-watering counter freezes and drifts**~~ — **fixed in this branch**:
   replaced with `lastWateredEpoch` plus an NTP fast-forward, which removes the hidden
   side effect in `shouldWater()` and corrects for the missing external RTC. §9.
9. **Ack races**: promoting "the pending one" instead of matching on version is a genuine
   bug once two edits land close together. §8.
10. **TTL in seconds vs a millisecond range key** — a units mistake here deletes the
    dataset. §6.
11. **No safety clamps** on pump duration, minimum interval, or rule count. §7.

### Design concerns

12. **`mlPerSecond` is hand-calibrated** (decided) — so the settings field needs the
    method in its helper text and a datasheet default, or it's an unfillable box. §7.
13. **Flow rate isn't constant** (battery sag, tank head) — millilitres are ±20%, present
    them as approximate. §7.
14. **Millilitres are the total across three pots** (decided) — label it explicitly;
    someone reading it as per-pot under-waters by 3×, silently. §7.
15. **Permanent ownership has no undo**: never claim a real device with a test account,
    keep the DynamoDB-console escape hatch working, and put a confirmation on the claim
    button. §4.
16. **Firebase UID ≠ Google sub** — and ownership is permanent, so a future migration off
    Firebase means rewriting every ownership row. Store both. §5.
17. **The two evaluators will drift.** Shared JSON fixtures cost almost nothing and are
    worth it precisely because there are only two to compare. §7.
18. **The front end infers `max_temp_c` from readings** rather than being told, so it
    disagrees with the device whenever the reading window is incomplete. §12 open
    questions.
19. **Device ids are immutable** once provisioned (thing name, cert attachment, topics,
    retained message location) — intended, with `nickname` absorbing renaming, but it
    means `cherry-3-pot`'s id is a phase-0 decision. §3, §11.
20. **A device that never reaches Wi-Fi keeps a wrong absolute clock forever**, so
    `hour_of_day` rules fire at the wrong real-world hour. Intervals stay correct. Accepted
    consequence of keeping the hardcoded seed date. §9.
21. **Topic migration is breaking** — run old and new IoT rules in parallel. §9.
22. **No provisioning script exists yet** (thing + cert + policy + DDB row + claim code +
    sticker PNG). Prerequisite for everything, easy to under-scope. §4.
23. **Rule order is decorative** — document it in both implementations before someone
    relies on precedence that isn't there. §7.

### Open questions

- **Two topics or three?** Fold `config_version` / `config_status` into the reading payload
  and drop the ack topic. Recommended; §3.
- **Publish `max_temp_c` and `hours_since_watering` in the reading.** Right now the front
  end *reconstructs* them by scanning readings since the last `watered` event, which
  disagrees with the device whenever the window is incomplete — a device that was offline,
  or a `daysago` range shorter than the watering interval. These are the actual rule
  inputs; ~20 bytes to state them authoritatively, and it removes a whole class of "the
  site says one thing, the device does another". Recommended.
- **Should the device report its `schema` version in readings, so the UI only offers
  variables that device's firmware understands?** This makes `rejected` (§8) essentially
  unreachable in normal operation instead of something a user can trigger by using a new
  feature on an old board. Cheap, and it turns a confusing failure into an impossible one.
- **What device id does `cherry-3-pot` keep?** Now that ids are immutable and readings are
  keyed by device name, renaming the existing bot orphans a year of history. Simplest
  answer: grandfather the existing name as-is (accepting it's guessable — the claim code is
  what actually protects it) and use opaque ids only for new boards. Needs deciding in
  phase 0, before the provisioning script is written.
- **Do you want notifications at all?** The highest-value one isn't "device offline", it's
  **"the tank has been empty for two days and your plants haven't been watered"** — the
  device already reports `water_available`, and today nothing acts on it. Now that accounts
  carry verified email addresses, this is an EventBridge daily rule + SES/SNS and ~30 lines.
  Out of scope unless you want it, but it's the gap most likely to actually kill a plant.
- **Add `client.disconnect()` before deep sleep?** One line, makes the MQTT disconnect
  graceful (§2). Not done in this branch.
- **What happens to readings if you ever do need to reassign a device?** Not in scope, but
  the answer shapes whether readings are keyed by device or by owner. Keeping them keyed
  by device (as today) leaves both options open — no action needed, just don't key them by
  owner.
- **Firmware/schema version handshake**: devices report `firmwareVersion` and `schema`;
  should the backend refuse to send a schema a device can't parse, or rely on `rejected`
  to surface it? (`rejected` is the cheaper answer and it's already in the design.)
- **Stale-device alerting**: "hasn't reported in 3 days" via an EventBridge daily rule +
  SNS is ~20 lines, and it's the first thing you'll wish for the day a device dies
  quietly.

---

## 13. Phasing

Each phase ships independently and leaves the system working.

| Phase | Work | Why |
| --- | --- | --- |
| **0. Plumbing** | Provisioning script + sticker generation; per-device topics + policy variables; parallel IoT rules; `ttl` attribute + backfill | No user-visible change; unblocks everything; closes the spoofing hole |
| **1. Auth + ownership** | Firebase Auth; HTTP API + JWT authorizer; control table; email allowlist; claim; scope existing charts to owned devices | Makes today's dashboard safe; valuable on its own |
| **2. Config channel** | Rule schema + validator; retained config publish; firmware evaluator (host-testable) + NVS + ack; state machine | The core feature |
| **3. UI** | Presets, DNF builder with plain-English rendering, millilitre input, backtest, next-watering from the active config | Where the value shows up |
| **4. Polish** | Rollback, stale-device alerts, per-device timezone, wake-interval control | Needs the foundations first |

Phases 0 and 1 are worth doing even if you never build the rest.
