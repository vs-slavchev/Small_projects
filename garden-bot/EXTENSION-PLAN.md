# Garden Bot: remote-configurable watering — design plan

Extending the current system (ESP32 → AWS IoT → DynamoDB → Lambda → static site) so
watering rules can be changed from the website without reflashing, with accounts,
device ownership, and a config lifecycle.

This document is a design review as much as a plan: **§10 collects the flaws, risks and
open questions**, and each section flags problems inline where they belong.

---

## 0. What exists today (baseline)

| Piece | State |
| --- | --- |
| Firmware | `firmware/garden-bot/garden-bot.ino`, wakes every 1800 s, reads sensors, `shouldWater()` hardcoded, publishes to `esp32/pub`, subscribes `esp32/sub` but `messageHandler` is a no-op |
| Device identity | Per-device X.509 cert (`AWS_CERT_CRT`) + `AWS_THINGNAME` in `secrets.h`; `BOT_NAME` in `config.h` goes in the payload |
| Storage | DynamoDB table `garden-bot-data`, key `(device HASH, timestamp RANGE)`, ms epoch, measurements in a nested map |
| API | REST API Gateway → `lambda-timestream-query.py` (name is legacy), `daysago` + `device` query params, `Access-Control-Allow-Origin: *`, **no auth** |
| Site | Static `front-end/`, ECharts, re-implements the firmware watering rules in JS (`secondsBetweenWateringFromMaxRecentTemperature`, `computeNextWatering`) |
| Resilience | RTC-backed `message_queue` replays readings after outages; BLE log dump with a fixed passkey |

Two pre-existing security issues fall out of this and get fixed as a side effect of the
extension:

1. **The API is a public IDOR.** Anyone who guesses a device name reads its history.
2. **Device identity is claimed in the payload, not proven.** `doc["device"] = BOT_NAME`
   on a shared topic means any device with a valid cert can write readings attributed to
   any other device. Today that is one device you own; with many devices it is a real
   hole.

---

## 1. Authentication

### Recommendation: Google Sign-In (OIDC) verified by an API Gateway **HTTP API** JWT authorizer

The site is static and the API is Lambda. The cheapest correct thing is to let Google be
the identity provider and let API Gateway do the token validation, so **you write zero
auth code**.

- Front end: Google Identity Services (`accounts.google.com/gsi/client`), the standard
  button + One Tap. You get an **ID token** (a JWT).
- API: migrate the endpoint from a REST API to an **HTTP API** and attach a JWT
  authorizer with `issuer = https://accounts.google.com`, `audience = <your OAuth client
  id>`. API Gateway fetches Google's JWKS and validates signature/exp/aud/iss itself.
- Lambda reads the verified claims from
  `event.requestContext.authorizer.jwt.claims`; the user id is **`sub`**.

Cost: $0 for auth. HTTP APIs are also ~70% cheaper per request than REST APIs
(≈$1.00 vs ≈$3.50 per million), and you are nowhere near either bill.

> Verify the Google-as-issuer setup with a 10-minute spike before committing — it works
> via OIDC discovery, but issuer-string exactness (`https://accounts.google.com`, no
> trailing slash) is the usual snag.

**Use `sub` as the primary user key, never `email`.** Emails are mutable and, for
non-Gmail Workspace accounts, re-assignable. Store `email` as a display attribute only.

### The UX flaw in the cheap option

Google ID tokens live **1 hour** and the browser GIS flow gives you no refresh token. A
dashboard someone leaves open on a kitchen tablet will start 401-ing.

Mitigations, in order of effort:

1. **`auto_select: true` + silent re-prompt.** As long as the Google session cookie is
   alive, re-issuing the ID token is invisible. Wrap `fetch` so a 401 triggers a silent
   re-request and one retry. Good enough for a personal project; occasionally the user
   sees the One Tap card.
2. **Cognito user pool with Google as a federated IdP.** You get real refresh tokens
   (configurable, up to 30 days → "logged in for a month"), and the JWT authorizer points
   at the Cognito issuer instead. Still free at this scale (well inside the free MAU
   tier — check current tiering, Cognito repriced in 2024). Cost is config fiddliness:
   hosted-UI domain, app client, callback URLs, and Google client credentials configured
   in two places.
3. Auth0 / Clerk / Firebase Auth free tiers — all fine, all a third-party dependency you
   don't need given options 1 and 2.

**Recommendation:** start with (1) because it is ~40 lines and no new AWS resource;
the authorizer config is the only thing you'd change to move to (2) later, so it is not
a one-way door. If the hourly re-auth annoys you within a week, go to (2).

### Other auth chores

- `Access-Control-Allow-Origin: "*"` must become your exact site origin once requests
  carry an `Authorization` header. Add `http://localhost:xxxx` as a second allowed origin
  and as a second Authorized JavaScript Origin on the OAuth client for local dev.
- Google OAuth requires an https origin in production → the site needs CloudFront (or any
  https host), not a bare S3 website endpoint.
- Decide now whether sign-up is open. For a personal system, an allowlist of `sub`s (or a
  "first N users" cap) in the control table costs nothing and prevents a stranger
  creating an account and burning your Lambda quota. Claiming still requires a device
  code, so an account alone is harmless — but an allowlist is one `if`.

---

## 2. Device identity and claiming

### Is a passcode enough?

For *authenticating the device to AWS*, the passcode is irrelevant — **the device already
has a strong identity: its X.509 certificate.** MQTT/TLS mutual auth proves which device
is talking. Nothing about that changes.

The passcode is only needed for the **claim ceremony**: proving to the *website* that the
human sitting in front of it physically possesses that device. That's a different and
much weaker requirement, but it still needs care because a claim is permanent-ish.

### Flaw in the proposed scheme: the passcode should not be in the firmware

Putting the claim code in `secrets.h` means it exists in flash, in your build tree, and
in whatever you copy-paste it from. Anyone who can dump flash (ESP32 flash is readable
over UART unless you burn flash encryption eFuses — you haven't) gets it. It buys nothing,
because the device never needs to *use* it.

**Better: the device never knows its claim code.**

At provisioning time (a script you run once per board), generate:

- `deviceId` — the thing name; keep it human-typable but not enumerable. `cherry-3-pot`
  is guessable; use `cherry-3-pot-k7m2` or a pure random `gb-7QXF-2M9K`.
- `claimCode` — random, ≥ 40 bits of entropy, Crockford base32, e.g. `K7M2-9QXF-3A` (10
  chars ≈ 50 bits). Printed on a sticker on the enclosure.

The script writes `DEVICE#<id> / META` to DynamoDB with **`claimCodeHash` only**
(Argon2id or bcrypt; at minimum HMAC-SHA256 with a pepper in Secrets Manager — plain
SHA-256 is brute-forceable at 50 bits with a GPU). The firmware gets the cert and the
`deviceId` and nothing else.

This means: **claiming is a pure server-side operation.** The device does not participate
in it at all. It just eventually notices it has a config.

### Alternatives, if you want stronger possession proof later

| Approach | Proof | Effort |
| --- | --- | --- |
| Sticker code (recommended) | Possession of the box, or of a photo of it | Low |
| BLE proximity claim | Must be within ~10 m; you already have a GATT service + passkey pairing | Medium — needs Web Bluetooth (Chrome only) or a phone app |
| Device-generated rotating code | Device publishes a fresh 6-digit code each wake to its own topic; you read it over BLE/serial and type it. Expires in 30 min | Medium |
| Button-press confirm | Physical press within a window confirms the claim | Medium — needs a button and a longer awake window |

The sticker code plus **hard rate limiting** is proportionate: 5 attempts per device per
hour and 20 per account per hour, tracked in the control table with a TTL. Without rate
limiting, 50 bits is fine but 20 bits (a 6-digit code) would not be.

### "Only one account can ever manage a device" is a UX trap

Literal permanence means:

- You give the plant to a friend → the device is bricked from their perspective.
- You lose access to the Google account → the device is bricked from yours.
- You test with a throwaway account → the device is burned.

**Make it exclusive, not permanent.** One owner at a time, enforced by a conditional
write; plus an owner-initiated **release** that clears `ownerUserId`, invalidates the
claim code, generates a new one, and requires physical access to see it (or emails it to
the releasing owner). Add an admin escape hatch — a direct DynamoDB edit by you — and
document it.

Claim must be atomic:

```
UpdateItem  PK=DEVICE#<id>  SK=META
  ConditionExpression: attribute_not_exists(ownerUserId)
  UpdateExpression:    SET ownerUserId = :sub, claimedAt = :now
```

A `ConditionalCheckFailedException` is "already claimed" — return the same generic error
as a bad code, so the endpoint can't be used to enumerate which devices exist.

---

## 3. MQTT topics and per-device isolation

### The question you asked: how does a device only get *its* updates?

**AWS IoT policy variables.** One policy, attached to every device certificate, that
substitutes the connecting device's own identity into the resource ARNs:

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

`${iot:Connection.Thing.ThingName}` requires the certificate to be **attached to a thing**
and the MQTT client id to equal the thing name (the firmware already connects with
`client.connect(AWS_THINGNAME)`). `${iot:Certificate.Subject.CommonName}` is the
alternative if you'd rather not manage things.

This scales to thousands of devices with **one** policy document and no per-device IAM.
A device physically cannot subscribe to another device's config topic — the broker
rejects the SUBSCRIBE.

Corollary: **the IoT rule must take the device id from the topic, not the payload.**
In the rule SQL, `topic(2)` is the device id. Drop `doc["device"]` from the published JSON
(or keep it and ignore it) so a compromised device cannot forge readings for another.

### Topics

| Topic | Direction | Retained | Purpose |
| --- | --- | --- | --- |
| `devices/{id}/readings` | device → cloud | no | sensor readings (replaces `esp32/pub`) |
| `devices/{id}/config` | cloud → device | **yes** | the desired watering config |
| `devices/{id}/ack` | device → cloud | no | "applied version N" / "rejected version N because…" / "unclaimed" |

Three topics, as you guessed. Two notes:

**The `ack` topic should carry more than acks.** Fold in the unclaimed announcement and
rejections; it's the device's general upstream event channel. Message shape:

```json
{ "type": "applied" | "rejected" | "unclaimed", "config_version": 7, "reason": "unknown_variable:soil_ph", "boot_id": 42 }
```

### The retained-message point is the important one

> **This is the single biggest hole in the plan as described.** MQTT is fire-and-forget.
> A device that is awake ~10 seconds out of every 1800 will *miss* a config published
> while it sleeps — permanently. The proposed "sleep 30 s and wake to check" only works
> during the unclaimed phase; once the device is on its 30-minute cycle, a naïvely
> published config is delivered to nobody and stays `pending` forever.

Three ways out, in order of preference:

1. **Retained messages (recommended).** Publish the config with `retain = true`. AWS IoT
   Core stores the last retained message per topic and delivers it *immediately on
   SUBSCRIBE*. The device subscribes on every wake and gets the current config within
   milliseconds, whether it was published 5 seconds or 5 days ago. Naturally idempotent:
   the device compares `version` against what it already has and ignores repeats.
   `PubSubClient::publish(topic, payload, retained)` and the AWS SDK both support it.
2. **Device Shadow (named shadow, e.g. `config`).** This is what shadows are *for*:
   desired/reported state, deltas, versioning, persistence for offline devices. It gives
   you the ack mechanism for free (device writes `reported`, cloud sees it) and the
   "what does the device actually think it's running" view. Costs: more round-trips per
   wake (a `/get` + a `/update`), more JSON on a constrained device, 8 KB document limit,
   and per-operation billing. It is the "proper" answer and a reasonable choice if you're
   happy to write more firmware.
3. **Persistent session** (`cleanSession = false` + QoS 1). AWS IoT queues messages for a
   disconnected client. Two catches: the default session expiry is short (an hour, up to
   7 days configurable) and the queue is capped, so a device offline over a weekend still
   loses the config — and `PubSubClient`'s `cleanSession` flag is only on the full
   `connect()` overload, so check your version. **Not recommended** as the primary
   mechanism; it solves a different problem.

Go with **retained**, and treat "the retained message *is* the desired state" as the
model: there is exactly one config on the broker per device, always the newest.
That aligns neatly with the state machine below — a superseded config is not merely
marked discarded in the database, it is *physically unreachable*, so no device can ever
apply a stale one.

### A firmware bug this creates

`setup()` currently calls `client.loop()` once after publishing and immediately deep
sleeps. A retained config arriving on SUBSCRIBE will be dropped on the floor. The wake
cycle needs a bounded receive window:

```cpp
// after subscribe + publish
unsigned long start = millis();
while (millis() - start < CONFIG_WAIT_MS && !configReceived) {  // CONFIG_WAIT_MS ~2000
  client.loop();
  delay(20);
}
```

Two seconds of extra radio time per wake, 48 times a day — negligible against the
current ~10 s wake and the 150 s pump run.

---

## 4. Config lifecycle and states

Your four states are close to right. Concrete refinements:

### Version numbers are the anchor

Every config gets a **monotonically increasing integer version per device**, allocated by
an atomic `ADD configVersionCounter :1` on the device META item. Everything —
retained payload, ack, database item, UI — refers to this number. Never reason about
"the pending one" without a version; that's how races become bugs.

### States

| State | Meaning |
| --- | --- |
| `pending` | Written to DB and published (retained). No ack yet. |
| `active` | Device acked it. The device is running this. |
| `superseded` | Was `active`, a later version is now `active`. (your "overridden") |
| `abandoned` | Was `pending`, a newer version was published before this one was acked. (your "discarded") |
| `rejected` | Device explicitly nacked it — bad schema, too many rules, unknown variable. **Missing from your list and you will hit it.** |

Invariants: at most one `active`, at most one `pending`, and `pending.version >
active.version`.

### Transitions and the race you have to handle

When the user saves a new config (single transaction, `TransactWriteItems`):

1. `ADD configVersionCounter :1` on META → new version *N*.
2. Put `CONFIG#N` with `status = pending`.
3. If a `pending` version *M* exists, set it to `abandoned`.
4. Then (outside the transaction) publish retained to `devices/{id}/config`.

> Ordering flaw: if step 4 fails after the transaction commits, the DB says `pending` but
> the broker has the old config. Make the ack handler self-healing — and add a
> "republish" that re-sends the retained message for whatever is currently `pending`,
> called both by a retry and by a manual UI button.

When an ack for version *K* arrives:

- `K == pending.version` → `pending → active`; previous `active → superseded`.
- `K < pending.version` → the device applied an older config before the newer one reached
  it (possible with a race between publish and wake). Mark *K* `superseded` immediately,
  leave the newer one `pending`. **Do not** blindly promote "the pending one" — that's the
  bug this rule prevents.
- `K > pending.version` → impossible; log and alarm.

### "Pending" is not a UI state, it's a story

A device offline for three days shows `pending` forever, and "pending" tells the user
nothing. The UI must say: *"Waiting for the plant to wake up — it last checked in 14
minutes ago, so this should apply by 15:40."* And if last-seen is old: *"This device
hasn't reported since Tuesday; the new rules won't apply until it comes back."*

### Also worth having

- **Rollback**: the history is in the DB, so "revert to the previous config" is a
  one-click re-publish of an old rule set as a new version. Cheap, and the first thing
  you'll want after a bad edit.
- **Reject reasons surfaced in the UI.** A `rejected` config with `unknown_variable:foo`
  is a firmware/backend schema-version mismatch and you want to see it, not silently
  fall back.
- **Last-known-good on the device.** On a rejected or unparseable config, keep running
  the previous config. Never fall back to "no watering" silently — plants die quietly.

---

## 5. Data model

### Is DynamoDB cost-efficient here? Yes, overwhelmingly.

Order-of-magnitude for **10 devices** (on-demand, eu-central-1, ≈$1.25/M write units,
≈$0.25/M read units, ≈$0.25/GB-month):

| Item | Volume | Cost |
| --- | --- | --- |
| Reading writes | 10 dev × 48/day × 365 = 175k/yr, ~150 B each (1 WRU) | **≈ $0.22 / year** |
| Storage | 175k × 150 B ≈ 26 MB, capped at 1 yr by TTL | **≈ $0.08 / year** |
| Dashboard reads | 30-day query ≈ 1440 items ≈ 210 KB ≈ 26 RRU eventually-consistent | **rounding error** |
| TTL deletions | free | **$0** |
| Control-plane items | hundreds of items total | **$0** |

Your real bill will be dominated by anything with a fixed monthly charge — a Route 53
hosted zone ($0.50/mo) costs more than the entire database. Don't spend design effort on
DynamoDB cost; spend it on not accidentally provisioning something with a baseline.

Two things that *would* make it expensive, so avoid them: provisioned capacity instead of
on-demand (you'd pay for idle), and any `Scan` in a hot path.

### Single table: yes for the control plane, no for the readings

Single-table design pays off when one query must return heterogeneous related items. Your
access patterns don't need that: the dashboard fetches readings by `(device, time range)`
and separately fetches the device's config. Two queries, always.

**Recommendation: keep `garden-bot-data` for readings, add one new
`garden-bot-control` table for users/devices/configs.** Reasons:

- The readings table already exists with the right key schema; no migration, no risk.
- **TTL is the deciding argument.** A 1-year TTL on a mixed table is one mis-set attribute
  away from deleting a user's device ownership row. Physical separation of "expiring
  telemetry" from "must never expire" is worth more than the elegance.
- Different scaling shapes; readings are ~1000× the item count.

Within `garden-bot-control`, single-table is the right call:

| PK | SK | Attributes |
| --- | --- | --- |
| `USER#<googleSub>` | `PROFILE` | email, displayName, createdAt |
| `USER#<googleSub>` | `DEVICE#<deviceId>` | nickname, claimedAt *(ownership edge)* |
| `DEVICE#<deviceId>` | `META` | ownerUserId, claimCodeHash, configVersionCounter, activeVersion, pendingVersion, lastSeenAt, firmwareVersion, tz |
| `DEVICE#<deviceId>` | `CONFIG#<version, zero-padded to 8>` | status, rules (JSON), createdBy, createdAt, ackedAt, rejectReason |
| `DEVICE#<deviceId>` | `CLAIMATTEMPT#<ts>` | ip, result, `ttl` *(rate limiting)* |

Access patterns, all satisfied with **zero GSIs**:

| Pattern | Query |
| --- | --- |
| List my devices | `PK = USER#<sub>`, `SK begins_with DEVICE#` |
| Who owns device X / is it claimed | `GetItem PK=DEVICE#<id>, SK=META` |
| Current config | `GetItem` META → `activeVersion` → `GetItem CONFIG#<n>` |
| Config history | `PK = DEVICE#<id>`, `SK begins_with CONFIG#`, `ScanIndexForward=false`, `Limit=20` |
| Am I allowed to read this device | META lookup, compare `ownerUserId` to token `sub` |

Zero-pad the version in the SK (`CONFIG#00000042`) so lexicographic sort equals numeric
sort — otherwise version 10 sorts before version 9 and "latest" silently breaks at the
10th edit.

### TTL on readings — the footgun

DynamoDB TTL requires a **Number attribute in epoch *seconds***. Your `timestamp` range
key is **milliseconds**. Add a *separate* `ttl` attribute (`timestamp/1000 + 31536000`)
in the IoT rule. If you set TTL on the millisecond field, every item expires in the year
∼56,000 (harmless) or, if you divide wrong, immediately (catastrophic). Test on a copy.

Existing items have no `ttl` and will live forever unless you backfill with a scan +
batch update — a 20-line one-off script, worth running.

---

## 6. The rule language

### Your DNF instinct is correct — name it and commit to it

"A list of conditions, each condition a list of comparisons AND'ed, water if any condition
passes" is **disjunctive normal form**. Every boolean expression can be written this way,
so you lose no expressiveness by forbidding nested parentheses, and you gain a UI that is
two flat lists instead of a tree editor. Good call.

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

`rules` OR'd, `all` AND'ed. **`rules: []` means "never water"** — that is the config an
unclaimed or freshly reset device runs, and it must be an explicit, documented value
rather than an accident.

### Ordering

OR is commutative, so the "ordered list" has no semantic meaning as specified — order is
display-only. Two options:

1. Say so, and sort/reorder purely for readability.
2. **Give order meaning** by allowing a per-rule `watering_duration_s` override: the
   *first* matching rule decides how long the pump runs. "Hot afternoon → 200 s, routine
   morning → 150 s" is genuinely useful, and it turns your ordering intuition into a
   feature instead of a no-op.

I'd take (2) — it costs one field and one `break`.

### Variables (whitelist)

| Variable | Units | Range | Source |
| --- | --- | --- | --- |
| `moisture_pct` | % | 0–100 | current reading |
| `temp_c` | °C | −40–60 | current reading *(you omitted this; add it)* |
| `max_temp_c` | °C | −40–60 | `maxRecentTemperature`, reset on watering |
| `hours_since_watering` | h | 0–2000 | `seconds_since_last_watering / 3600` |
| `hour_of_day` | h | 0–23 | device-local time |
| `day_of_week` | 0=Sun | 0–6 | optional, cheap to add now |

Ops: `gt`, `lt`, `gte`, `lte`, `eq`. Operand: **plain signed int** — correct choice. This
domain has no need for floats (the temperature is already `round()`ed to an int in the
firmware, moisture is an integer percent). If you ever want half-degrees, add a *new*
variable in tenths (`max_temp_dc`) rather than changing the type of an existing one;
changing int→float later invalidates every stored config.

Deliberately **not** exposed:

- `water_available` — this stays a hardcoded firmware gate (`shouldWater() && water_available`).
  A user must not be able to write a rule that dry-runs the pump.
- `battery_mv` — arguably useful ("don't water below 3.4 V") but it is a safety floor, so
  hardcode it in firmware rather than making it optional.

### Safety invariants live in firmware, not in the config

The config comes from the internet. Treat it as hostile even though it's yours:

- **Clamp `watering_duration_s`** to `[10, 300]` in firmware regardless of what arrives.
  A typo'd `15000` empties the tank and burns out the pump.
- **Minimum interval floor.** A rule of just `hour_of_day == 8` fires on *both* the :00
  and :30 wakes. Enforce a hardcoded `MIN_SECONDS_BETWEEN_WATERING` (say 3 h) that no
  config can lower, and warn in the UI when a rule set has no `hours_since_watering`
  clause.
- **Bounds:** max 8 rules × max 6 comparisons. Bounds the JSON to ~1.5 KB, bounds RTC
  memory, and lets the firmware parse into fixed-size arrays with no heap.
- **Reject, don't crash.** Unknown variable, unknown op, out-of-range value, too many
  rules → nack with a reason and keep the last-known-good config.

### `hour_of_day == 8` is brittle — and there's an existing DST bug

`secrets_template.h` sets `gmtOffset_sec = 7200` and `daylightOffset_sec = 3600`
**unconditionally**, so the device is an hour off for the winter half of the year. That's
survivable when the rules are hardcoded and vague; it becomes a visible bug the moment a
user writes "water at 8 am". Fix by putting a **POSIX TZ string** in the config and using
`setenv("TZ", tz, 1); tzset();` instead of a fixed offset — the C library then handles DST
transitions correctly and the timezone becomes user-configurable per device.

Related: after a power loss, `timeinfo` starts from the hardcoded 2023 struct in
`garden-bot.ino:32`. If Wi-Fi is also down, the device believes it is June 2023 at 13:00
and any `hour_of_day` rule fires against garbage. **Add a `timeValid` flag** — set only
after a successful NTP sync — and skip time-dependent rules until it is set.

### Config must survive power loss

`RTC_DATA_ATTR` survives deep sleep but **not** a battery disconnect. A device whose
battery you swap would silently revert to "no config" and stop watering. Persist the
parsed config to **NVS** (flash) on every change; load from NVS at boot if RTC memory is
cold. One flash write per config change is nothing for wear.

### Three implementations of one evaluator

Firmware (C++), backend validator (Python), and the front end's next-watering prediction
all have to agree. Today the site already drifts from the firmware by hand-copying
`secondsBetweenWateringFromMaxRecentTemperature`. Two mitigations, do both:

1. Write the evaluator as **pure C++ with no Arduino dependencies**
   (`watering_rules.h/.cpp`) so it compiles and unit-tests on the host.
2. Keep a **shared JSON fixture file** of `(config, variables) → expected bool` cases in
   the repo, and run it from the C++ test, the Python test, and a JS test. Divergence
   becomes a failing test instead of a plant that never gets watered.

Alternatively have the **backend** compute the next-watering prediction and return it with
the config, cutting three implementations to two. Given the site is static and already
does the arithmetic, the fixture approach is less work.

---

## 7. Firmware changes

New wake cycle:

```
boot
 ├─ load config: RTC mem → NVS fallback → "no config" (never water)
 ├─ read sensors (unchanged)
 ├─ connect Wi-Fi, NTP  → set timeValid
 ├─ connect AWS, subscribe devices/{id}/config
 ├─ pump client.loop() for CONFIG_WAIT_MS (~2 s)
 │    └─ on config: validate → persist (RTC + NVS) → publish ack{applied|rejected}
 ├─ evaluate rules against the variable map
 ├─ if fire && water_available && battery ok && min-interval ok → pump, then reconnect
 ├─ publish reading (+ flush queued)
 └─ deep sleep
```

### Unclaimed / bootstrap mode — and its flaw

Your proposal: on first boot, report unclaimed, sleep 30 s, repeat until configured.

The flaw is battery. A board that sits in a drawer for two months, or that you flash and
claim a week later, wakes 2880 times a day. At ~10 s awake with the radio up, that is
roughly **two orders of magnitude** more energy per day than the normal cycle — the pack
is flat before anyone claims it.

**Use a backoff ladder, resettable by the physical reset button:**

| Phase | Interval | Duration |
| --- | --- | --- |
| Fast claim | 30 s | first 15 min after power-on |
| Medium | 5 min | next 2 h |
| Slow | 30 min | forever after |

Power-cycling or pressing reset re-enters fast claim mode, which is exactly the natural
gesture ("I'm about to claim this, let me switch it on") and needs no extra hardware. The
website's claim page should literally say *"Power-cycle the device, then click Claim."*

Also: with retained config messages, the slow phase is not a problem — a device that goes
30 minutes between checks still picks up its config on the very next wake, because the
config is waiting on the broker rather than having been broadcast into the void.

While unclaimed the device should still publish `{"type":"unclaimed"}` to its ack topic so
the site can show "device seen, ready to claim" — a nice confidence signal during setup —
but it should **not** publish readings (nobody owns them, and there's no ownership row to
attribute them to).

### Payload / topic migration

Cutting `esp32/pub` → `devices/{id}/readings` is a breaking change across firmware, IoT
rule and Lambda. Run **both** rules in parallel for one release: the new rule writes to
the same table; the old topic keeps working for any board you haven't reflashed. Delete
the old rule once every device reports on the new topic.

---

## 8. UI/UX

### The 30-minute feedback loop is the defining UX problem

Everything else follows from it. Design *for* the latency instead of hiding it:

- Show device **last-seen** prominently, and express pending config as a predicted apply
  time, not a spinner.
- After the ack lands, show a clear confirmation. Poll the API every ~30 s while a config
  is pending (it's a few reads per day, effectively free) rather than making the user
  refresh.
- Consider making the **wake interval itself configurable** with the cost stated inline:
  *"Check every 10 minutes — applies changes faster, roughly 3× the battery drain."*
  Being able to temporarily drop to 5 minutes while tuning rules, then go back to 30, is
  a genuinely nice affordance.

### "Water now" is the feature users actually want

Not in your spec, but it's the first button anyone reaches for. It doesn't fit the config
lifecycle — it's a **command**, not desired state, and it must expire:

- Separate topic or a `command` field with an **`expires_at`**. A device that wakes 4
  hours later must *not* run the pump because you pressed a button at lunchtime.
- One-shot, acked, and never retained (or retained-then-immediately-cleared).

Design the expiry in from the start even if you build the button later; retrofitting
expiry semantics onto a "just publish it" command is how gardens get flooded.

### The rule builder

Presets first, custom second. Dropdown soup is the failure mode:

- **Preset cards** — "Summer daily", "Winter minimal", "Hot-weather twice daily",
  "Moisture-triggered" — each showing the plain-English rules it expands to, and each
  editable as a starting point (a preset is just a rule set, not a separate concept).
- Under the builder, render the rules back as a sentence:
  *"Water if max temp ≥ 28°C **and** ≥ 24 h since last watering **and** the hour is 15."*
  If the sentence reads wrong, the rules are wrong — this catches most user errors for
  free.
- **Backtest against history — the highest-value feature here, and nearly free.** You
  already store a year of readings. Run the candidate rule set over the last 14–30 days of
  actual data and show *"this would have watered 6 times: Jul 3, Jul 5, …"* next to the
  current config's *"watered 4 times"*. It turns an abstract boolean expression into a
  concrete outcome, and it will catch "waters every 30 minutes" before it reaches the
  plant. Caveat to state in the UI: the backtest can't model the feedback loop
  (`hours_since_watering` and `max_temp_c` reset on each simulated watering) — simulate it
  forward properly rather than evaluating each historical point independently, or the
  numbers will be nonsense.
- Warn on obvious mistakes: no `hours_since_watering` clause, `moisture_pct > 100`,
  contradictory rules (`hour_of_day > 20 and hour_of_day < 6` → never fires).

### Next-watering prediction from the active config

Replace the hardcoded `computeNextWatering` with a simulation over the **active** config
(never the pending one — that would show a future that isn't running yet; if both exist,
show the active prediction plus "changing to … once applied").

Be honest about what the prediction can know: temperature and moisture are unknowable
forwards. Compute the **earliest possible** next watering assuming current sensor values
hold, and label it that way — *"Earliest next watering: tomorrow 08:00, if it stays this
warm."* A confidently wrong exact time is worse than an honest range.

### Multi-device

The `?device=` selector becomes an owner-scoped list from `GET /devices`. Nickname per
device (user-editable, stored on the ownership edge, distinct from the immutable
`deviceId`), because "gb-7QXF-2M9K" is not a plant.

### Claim flow

`Sign in → Add device → enter device id + claim code → "Power-cycle your device" →
poll until first ack/reading → "Connected. Now choose watering rules."` Land the user
directly in the preset picker; a claimed device with no rules waters nothing, and that
must not be a silent state.

---

## 9. API surface

All routes behind the JWT authorizer; every device-scoped route re-checks
`DEVICE#<id>.ownerUserId == claims.sub` **server-side** (never trust a device id from the
client).

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/me` | profile, create on first call |
| `GET` | `/devices` | owned devices + last-seen + active/pending version |
| `POST` | `/devices/claim` | `{deviceId, claimCode}`, rate-limited, conditional write |
| `POST` | `/devices/{id}/release` | clears ownership, rotates claim code |
| `PATCH` | `/devices/{id}` | nickname, timezone, wake interval |
| `GET` | `/devices/{id}/readings?daysago=N` | replaces the current open endpoint |
| `GET` | `/devices/{id}/config` | active + pending + history |
| `PUT` | `/devices/{id}/config` | validate → version → store → publish retained |
| `POST` | `/devices/{id}/config/republish` | self-heal a stuck pending |

Plus two IoT-rule-triggered Lambdas (no API Gateway): readings → DynamoDB (exists,
retopic'd), and ack → update config status + `lastSeenAt`.

Return generic errors from `/devices/claim` — "invalid device id or code" for both
not-found and already-claimed, so it can't be used to enumerate devices.

---

## 10. Flaws, risks, and open questions

### Must fix (things that are broken or will break)

1. **Sleeping devices miss non-retained MQTT config.** Without retained messages (or a
   shadow), a config published while the device sleeps is lost forever. §3.
2. **`client.loop()` is called once**, so an inbound config is never processed. Needs a
   bounded receive window. §3.
3. **Device id comes from the payload, not the topic** — any device can forge another's
   readings. Fix with per-device topics + policy variables. §3.
4. **The readings API has no authorization** — current public IDOR. §1, §9.
5. **Config must survive power loss** (NVS, not just RTC memory), or a battery swap
   silently disables watering. §6.
6. **DST is applied unconditionally** (`daylightOffset_sec` always added) — the device is
   an hour off half the year, which starts mattering the moment users write hour rules. §6.
7. **`timeinfo` starts at a hardcoded 2023 date after power loss**; hour-based rules must
   be gated on a successful NTP sync. §6.
8. **`rejected` is missing from the state machine**, and a malformed config must fall back
   to last-known-good rather than to "never water". §4.
9. **Ack races**: promoting "the pending one" instead of matching on version number is a
   real bug once two edits land close together. §4.
10. **TTL in seconds vs a millisecond range key** — a units mistake here deletes the
    dataset. §5.
11. **No safety clamps**: `watering_duration_s`, minimum interval between waterings, rule
    count. A config from the internet must not be able to run the pump for an hour. §6.
12. **The 30-second unclaimed loop will flatten the battery** on a device that sits
    unclaimed. Needs backoff + reset-to-reclaim. §7.

### Design concerns

13. **"Only one account, ever" has no escape hatch** — no transfer, no recovery from a
    lost Google account. Make it exclusive-with-release. §2.
14. **Claim code in firmware buys nothing** and leaks with a flash dump; provision it
    server-side only. §2.
15. **Three implementations of the rule evaluator** will drift — they already have. Shared
    fixtures + host-testable pure C++. §6.
16. **Hourly Google token expiry** is the UX cost of the zero-infrastructure auth choice.
    Know it going in; the migration to Cognito is an authorizer config change. §1.
17. **The 30-minute apply latency** is inherent and needs UI honesty, not a spinner. §8.
18. **"Water now"** is missing and needs command-expiry semantics designed in early. §8.
19. **Ordered rules are semantically meaningless** as specified — give the order meaning
    via per-rule duration, or document it as display-only. §6.
20. **Topic migration is a breaking change**; run old and new IoT rules in parallel. §7.
21. **No device provisioning script exists yet** (thing + cert + policy attach + DDB row +
    claim code). It's a prerequisite for everything and easy to under-scope.

### Open questions

- **Shadow or retained messages?** Retained is less firmware and fewer round-trips;
  shadow is the AWS-blessed path and gives reported-state for free. I lean retained for
  this scale, but it's the one decision worth 30 minutes of prototyping before committing,
  because it shapes the firmware.
- **Is sign-up open or allowlisted?** One `if`, decide before the first stranger finds it.
- **Should the wake interval be user-configurable?** Nice for tuning, another safety clamp
  to enforce (never below 5 min), another config field.
- **Do you want per-rule watering duration?** Decide before shipping the schema — adding
  it later means a schema bump and a firmware release.
- **How far back should the backtest run**, and does it need its own endpoint or can it
  reuse `/readings`? (Reuse; the simulation is client-side.)
- **What happens to readings when a device is released?** Delete, keep for the old owner,
  or hand to the new one? Privacy-wise: purge on release is the clean answer.
- **Alerting**: do you want "device hasn't reported in 3 days" emails? An EventBridge
  daily rule + SNS is ~20 lines and it's the first thing you'll wish for the day a device
  dies quietly.
- **Firmware/schema versioning**: devices report `firmwareVersion` and `schema`; the
  backend should refuse to send a schema a device can't parse. Worth designing the
  handshake now even if there's only one version.
- **OTA firmware updates** are out of scope here, but the sibling `esp32-ota-pwm-board`
  project suggests you'll want them; the rules engine reduces how often you *need* them,
  which is arguably the whole point.

---

## 11. Suggested phasing

Each phase is independently shippable and leaves the system working.

| Phase | Work | Why first |
| --- | --- | --- |
| **0. Plumbing** | Provisioning script; per-device topics + policy variables; parallel IoT rules; `ttl` attribute + backfill | No user-visible change, unblocks everything, fixes the spoofing hole |
| **1. Auth + ownership** | Google sign-in; HTTP API + JWT authorizer; control table; claim/release; scope existing charts to owned devices | Makes the existing dashboard safe; independently valuable |
| **2. Config channel** | Rule schema + validator; retained config publish; firmware evaluator (host-tested) + NVS persistence + ack; state machine; unclaimed backoff | The core feature |
| **3. UI** | Presets, DNF builder with plain-English rendering, backtest, next-watering from active config | Where the value shows up |
| **4. Polish** | "Water now" with expiry, rollback, stale-device alerts, wake-interval control | Nice-to-haves that need the foundations |

Phase 0 and 1 are worth doing even if you never build the rest.
