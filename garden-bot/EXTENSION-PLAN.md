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
| **One account owns a device, permanently.** No transfer or release. | Consequences in §3 |
| Keep the **30 s unclaimed poll loop**, no backoff ladder | Cost quantified in §9 |
| Keep the **hardcoded initial date**; watering at the wrong time beats not watering | §9 |
| The evaluator lives in **firmware C++ and front-end JS only** | Drift mitigation in §7 |
| **"Water now" is out of scope** | Has one knock-on effect on calibration, §7 |
| **Cost is not the deciding factor** — pick the pleasant option | Applies to §4 |
| Watering duration is set per update; the **UI asks for millilitres**, not seconds | §7 |
| Rule order is for **UI stability only**, not evaluation precedence | §7 |

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

### Recommendation: stay on A (MQTT + retained), and know why

Not because MQTT is the better protocol for this shape of client — request/response
genuinely fits a 10-second batch client better — but because:

1. It already works, PubSubClient is already integrated, and the reading queue already
   flushes through `publish()`.
2. X.509 identity and policy-variable authorization come free and have no cheap equivalent
   elsewhere.
3. The retained message gives **guaranteed eventual delivery with no server state**: the
   config sits on the broker until the device next subscribes, whether that's in 5 seconds
   or 5 days. That is the property you actually need, and you get it with one flag.

**Option C is the one to remember.** If the retained-message semantics or the
`client.loop()` receive window turn out to be fiddly in practice, moving to the IoT HTTPS
data plane is a firmware-only change — the IoT rules, DynamoDB and Lambda paths are
identical, because HTTPS publish lands on the same topics. It converts "subscribe, pump
the event loop, hope the callback fires before deep sleep" into a synchronous `GET` whose
response you either have or don't. That deletes a whole class of bug.

The one real cost of C: the policy variable `${iot:Connection.Thing.ThingName}` is tied to
an **MQTT connection**, so an HTTPS request would have to authorize on
`${iot:Certificate.Subject.CommonName}` instead — which means setting the certificate's CN
to the device id, which means signing your own CSR (`CreateCertificateFromCsr`) rather
than letting AWS mint the keypair. Worth doing at provisioning time anyway if you want to
keep the door open. *(Verify the exact policy-variable availability before relying on it —
this is the load-bearing detail of option C.)*

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

---

## 4. Claiming: the code, and what "possession" means

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

Putting the code in `secrets.h` would mean it also lives in flash (readable over UART —
ESP32 flash is not encrypted unless you burn the eFuses, and you haven't), in your build
tree, in any backup of it, and potentially in git history. All for zero functional
benefit, because nothing on the device ever reads it. **The whole point of proof-of-
possession is that the proof is bound to the physical object, not to the software running
inside it.** A flash dump should get you nothing.

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
- **Decide whether sign-up is open.** A stranger creating an account is harmless — they
  can't claim a device without a sticker — but it's your Lambda quota. An allowlist of
  UIDs in the control table is one `if` if you want it.

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

1. **Calibration has no in-product path now that "water now" is out of scope.** The only
   honest way to measure flow rate is to run the pump into a measuring jug — which needs
   an on-demand pump command. Without one, the user must calibrate by hand (stopwatch,
   jug, type the number into settings), or you seed it from the pump datasheet and accept
   the error. This is a real gap created by the scope decision, not an argument to reverse
   it — just make the settings field prominent and label it *"measured millilitres per
   second"* with a one-line how-to. **Open question: is hand-calibration acceptable, or
   does this pull a minimal pump-test command back into scope?**
2. **Flow rate is not constant.** It falls as the battery sags and as the tank empties and
   the head height grows. Real-world spread is easily ±20%. Present volumes as approximate
   (*"≈ 500 ml"*), or users will trust a number that was never that precise.
3. **The current bot waters three pots from one manifold** (`WATERING_DURATION_S 150 //
   50s per pot`). So "500 ml" is 500 ml *total*, ~165 ml per pot. Either label it "total"
   or store a pot count per device and show both. **Open question: which?**
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
| `hours_since_watering` | h | 0–2000 | the RTC counter, **not** clock arithmetic |
| `hour_of_day` | h | 0–23 | device-local time |
| `day_of_week` | 0=Sun | 0–6 | optional, cheap now |

Ops: `gt`, `lt`, `gte`, `lte`, `eq`. Operands: **plain signed int** — correct. Temperature
is already `round()`ed to an int in the firmware and moisture is an integer percent. If
half-degrees ever matter, add a *new* variable in tenths (`max_temp_dc`) rather than
changing an existing one's type; int→float invalidates every stored config.

Deliberately **not** exposed: `water_available` (stays a hardcoded firmware gate — no user
rule may dry-run the pump) and `battery_mv` (a safety floor, hardcode it).

**`hours_since_watering` must come from the RTC counter, not from `now - lastWatered`.**
The counter is immune to clock jumps, which matters a lot given the hardcoded initial date
(§9): when NTP finally lands and the clock leaps from June 2023 to today, a
timestamp-derived value would jump by two years and fire everything at once. The counter
just keeps counting.

> **Bug in the existing counter.** `shouldWater()` increments
> `seconds_since_last_watering` only inside its own `if (!shouldWater)` branch — a side
> effect hidden in a predicate. So when conditions are met but `water_available` is false,
> the counter **freezes**: a device with an empty tank stops accumulating time, and
> `hours_since_watering` reported upstream goes stale. Harmless today; a real bug once
> that value is a user-visible rule variable. Fix during the rules-engine work: increment
> unconditionally at the top of the wake cycle, reset to 0 (not `SECONDS_TO_SLEEP`) on
> watering.

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

### Hardcoded initial date — kept, with one consequence

*"Watering at the wrong time beats not watering at all"* is right for a plant, and the
2023-06-02 13:00 seed plus `seconds_since_last_watering = 10 days` means a fresh boot with
no Wi-Fi will fire the first matching hour rule within a day. Fine.

The consequence to protect against: when NTP eventually succeeds, the clock **leaps by
two years**. Nothing may derive a duration from a timestamp difference — this is the
concrete reason `hours_since_watering` must come from the RTC counter (§7). Get that wrong
and the first successful NTP sync after a cold boot fires every time-based rule at once.

### The 30 s unclaimed loop — kept, with a suggested 5-line net

At ~10 s awake per 30 s cycle the duty cycle is ~33%, versus ~0.55% in normal operation —
roughly **60× the average current**. A pack that lasts months normally lasts about a day
in claim mode. Your reasoning holds for the intended flow (power on, claim within
minutes), and the loop exits as soon as a config arrives.

The only case it doesn't cover is a device powered on and forgotten. If you want that
covered without the backoff ladder you rejected, a single hard cap does it: **after ~4 h
of unclaimed polling, fall back to the normal 30-minute cycle.** Five lines, fires only in
the scenario you said won't happen, and costs nothing when you're right. Your call — noted
as a suggestion, not folded into the plan.

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
| `GET` | `/me` | profile, created on first call |
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
3. **Device id comes from the payload, not the topic** — any device can forge another's
   readings. §3.
4. **The readings API has no authorization** — current public IDOR. §5, §10.
5. **Config must survive power loss** (NVS, not just RTC), or a battery swap silently
   disables watering. §9.
6. ~~**DST applied with the wrong rules**~~ — **fixed in this branch** (`configTzTime` +
   full POSIX TZ). §9.
7. **`hours_since_watering` must come from the RTC counter, not clock arithmetic** — the
   hardcoded 2023 date means the clock leaps two years on first NTP sync. §7, §9.
8. **The counter freezes when the tank is empty** — the increment is a hidden side effect
   inside `shouldWater()`'s `if`. Harmless today, a real bug once it's a rule variable. §7.
9. **Ack races**: promoting "the pending one" instead of matching on version is a genuine
   bug once two edits land close together. §8.
10. **TTL in seconds vs a millisecond range key** — a units mistake here deletes the
    dataset. §6.
11. **No safety clamps** on pump duration, minimum interval, or rule count. §7.

### Design concerns

12. **`mlPerSecond` has no in-product calibration path** now that "water now" is out of
    scope — the user must measure with a jug and a stopwatch. §7.
13. **Flow rate isn't constant** (battery sag, tank head) — millilitres are ±20%, present
    them as approximate. §7.
14. **Three pots on one manifold** — is the millilitre figure total or per pot? §7.
15. **Permanent ownership has no undo**: never claim a real device with a test account,
    keep the DynamoDB-console escape hatch working, and put a confirmation on the claim
    button. §4.
16. **Firebase UID ≠ Google sub** — and ownership is permanent, so a future migration off
    Firebase means rewriting every ownership row. Store both. §5.
17. **The two evaluators will drift.** Shared JSON fixtures cost almost nothing and are
    worth it precisely because there are only two to compare. §7.
18. **The 30 s claim loop is ~60× normal current** — fine for the intended flow, flat in a
    day if a device is powered on and forgotten. Optional 4-hour hard cap. §9.
19. **Topic migration is breaking** — run old and new IoT rules in parallel. §9.
20. **No provisioning script exists yet** (thing + cert + policy + DDB row + claim code +
    sticker PNG). Prerequisite for everything, easy to under-scope. §4.
21. **Rule order is decorative** — document it in both implementations before someone
    relies on precedence that isn't there. §7.

### Open questions

- **Is hand-calibration of `mlPerSecond` acceptable**, or does the millilitre UI pull a
  minimal pump-test command back into scope? (§7 — the one question that could change
  scope.)
- **Millilitres total or per pot?** Affects labels and whether devices need a pot count.
- **Is sign-up open or allowlisted?** One `if`; decide before a stranger finds it.
- **Should the wake interval be user-configurable?** Nice for tuning rules, needs its own
  clamp (never below 5 min).
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
| **1. Auth + ownership** | Firebase Auth; HTTP API + JWT authorizer; control table; claim; scope existing charts to owned devices | Makes today's dashboard safe; valuable on its own |
| **2. Config channel** | Rule schema + validator; retained config publish; firmware evaluator (host-testable) + NVS + ack; state machine | The core feature |
| **3. UI** | Presets, DNF builder with plain-English rendering, millilitre input, backtest, next-watering from the active config | Where the value shows up |
| **4. Polish** | Rollback, stale-device alerts, per-device timezone, wake-interval control | Needs the foundations first |

Phases 0 and 1 are worth doing even if you never build the rest.
