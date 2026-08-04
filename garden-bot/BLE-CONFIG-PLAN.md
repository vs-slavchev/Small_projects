# Watering config over BLE — the small version

Change the watering schedule from the browser without reflashing. No accounts, no cloud
config channel, no claiming.

The larger cloud design (auth, MQTT config topic, device ownership) is parked in
`EXTENSION-PLAN.md` for later reference. Nothing here blocks it — the rule format and the
firmware evaluator are the same in both, so this is a subset, not a detour.

---

## 1. Scope

**In:** a rules engine in firmware; a config written over BLE from the web app, confirmed
by the device, persisted in NVS; a retry loop in the UI for the 30 minutes the bot spends
asleep; a Lambda + table recording which config is on which device.

**Out, deliberately:** authentication, accounts, device claiming, the MQTT config topic,
millilitre calibration, rule backtesting. All of these are in the big doc if they ever come
back.

### The simplification worth naming

BLE is a **connected, synchronous** channel. Within one connection you know whether the
device took the config. That deletes the entire `pending / active / superseded / abandoned`
state machine from the cloud design — there is no in-flight config to track, because a
write either completes while you're connected or it never happened.

---

## 2. How it works

```
browser                                    bot (awake ~10 s every 30 min)
   │
   │  user clicks "Send"  → requestDevice()  (one user gesture, once)
   │
   ├─ loop every ~3 s until connected or 35 min ─────────────┐
   │     gatt.connect()  ──────── fails while asleep ────────┘
   │
   │  connected (bot is awake, or user pressed reset)
   │     write  CONFIG_CHAR   ← 424 bytes max, one write
   │                                validate → CRC32 → NVS commit
   │     read   STATUS_CHAR   ← {"v":…,"crc":…,"ok":true}
   │
   │  crc + version match → confirmed
   └─ POST /config to the Lambda → row in garden-bot-configs
```

Next wake, the bot loads the config from NVS and evaluates it instead of the hardcoded
`shouldWater()`.

---

## 3. Config format

Disjunctive normal form: rules OR'd together, comparisons within a rule AND'd. Water if any
rule matches.

```json
{"v":1893456000,"dur":150,
 "r":[[["temp_max","gte",28],["hrs_wtrd","gte",24],["hour_day","eq",15]],
      [["hour_day","eq",8],["hrs_wtrd","gte",48]]]}
```

- `v` — version. **Use epoch seconds**: monotonic, and no coordination needed between
  browser, device and database.
- `dur` — pump seconds. Firmware clamps to `[10, 300]` whatever arrives.
- `r` — rules; each rule is a list of `[variable, op, value]` comparisons.
- `"r":[]` means **never water**. Explicit, documented, and it's the safe fallback.

| Variable | Code | Range |
| --- | --- | --- |
| moisture % | `moist_pc` | 0–100 |
| current temp °C | `temp_now` | −40–60 |
| max temp since watering | `temp_max` | −40–60 |
| hours since watering | `hrs_wtrd` | 0–2000 |
| hour of day (local) | `hour_day` | 0–23 |

Ops: `gt`, `lt`, `gte`, `lte`, `eq`. Values are plain ints.

Not exposed, on purpose: `water_available` stays a hardcoded firmware gate so no rule can
ever dry-run the pump, and battery voltage stays a hardcoded floor.

**Bounds: 4 rules × 4 comparisons.** That's 424 bytes worst case, which is what fits in a
single BLE attribute write (§4). Enforce it in the UI *and* the firmware.

Order is for display only — it's an OR, so evaluation order carries no meaning. Note that
in both implementations before someone relies on precedence that isn't there.

---

## 4. BLE interface

Extends the existing service in `ble_service.cpp` rather than adding a new one.

| Characteristic | UUID | Properties | Payload |
| --- | --- | --- | --- |
| Log (existing) | `FFA1` | `READ`, `READ_ENC` | current-run log |
| **Config** | `FFA2` | `WRITE`, `WRITE_ENC`, max len 512 | the JSON above |
| **Status** | `FFA3` | `READ`, `READ_ENC`, max len 64 | `{"v":…,"crc":…,"ok":true,"err":null}` |

**Confirmation is a read-back, not the write response.** The ATT write response only proves
bytes reached the BLE stack — not that they parsed, validated, or survived the NVS commit.
So the device computes a CRC32 over the exact bytes it stored, and the browser confirms by
matching both `crc` and `v` against what it sent. Anything else — a parse failure, a bound
violation, a failed flash write — comes back as `ok:false` with a short `err` string that
the UI shows verbatim.

**Sizing.** 512 bytes is a hard ATT ceiling on one attribute value, independent of MTU.
`NimBLEDevice::setMTU(247)` today means a 424-byte write arrives as a *long write*
(prepare/execute), which NimBLE handles as long as the characteristic's max length is 512
and Chrome does automatically. Raising `setMTU(517)` lets it fit in a single request on
desktop Chrome; keep the long-write path working regardless, since Android negotiates
smaller MTUs.

**Security: reuse the existing passkey pairing.** `WRITE_ENC` on the config characteristic
mirrors the `READ_ENC` already on the log characteristic, so the bonding you already have
covers it. BLE range (~10 m) is the real gate; the passkey stops a curious neighbour. Be
warned this is the flakiest part of the whole stack (§7). If pairing fights you across
platforms, the fallback is to drop `_ENC` and put a shared secret in the config payload for
the firmware to check — weaker, but uniform.

---

## 5. Firmware changes

1. **`watering_rules.h/.cpp`** — parse and evaluate, as pure C++ with no Arduino includes so
   it compiles and unit-tests on a laptop. Fixed-size arrays, no heap.
2. **NVS storage** — store the raw config bytes plus version and CRC. Load once at boot.
   **No RTC-memory copy**: NVS reads are fast, it survives battery removal, and one
   authoritative copy removes a whole class of "which one is current" bugs.
3. **`shouldWater()`** becomes `evaluate(config, vars)` over the variable map, with the
   existing hardcoded logic kept as the fallback when NVS holds no config.
4. **Config char callback** — validate → CRC → single NVS commit → update status
   characteristic. Never partially apply: on any failure keep the previous config.
5. **Report the version** in the MQTT reading payload (`config_version`). Two lines, reuses
   the existing pipeline, and it's what makes §6 trustworthy.
6. Bump the MQTT buffer only if the reading payload grows past 256 bytes — it won't.

Already done on this branch and needed here: the DST fix, `lastWateredEpoch` with the NTP
fast-forward (which is where `hrs_wtrd` comes from), and the graceful MQTT disconnect.

**A config written during a wake takes effect on the *next* wake** — the BLE write lands
after that wake's watering decision has already run. That's the safe ordering; don't try to
re-evaluate mid-wake.

---

## 6. Lambda and table

New table `garden-bot-configs`, separate from the readings table:

| | |
| --- | --- |
| PK | `device` (the BLE device name, e.g. `cherry-3-pot`) |
| SK | `version` (epoch seconds) |
| Attributes | `config` (the JSON), `crc`, `confirmed_at`, `source` |

New Lambda behind `POST /config`, called by the browser **after** the device confirms.
Query the newest row per device to answer "what is on this bot right now".

> **Be clear about what this row proves: the browser's claim, not the device's word.** The
> browser saw a matching CRC, but nothing stops a stray POST. The cheap fix is item 5 above
> — the bot stamps `config_version` into every reading, so the readings table gives
> continuous, device-attested confirmation while this table holds the actual content and
> the confirmation time. Do both; they answer different questions.

Like the existing readings endpoint, this is unauthenticated. That's consistent with where
the project is today, and it's the first thing the big doc fixes if it ever matters.

---

## 7. Issues and gotchas

**Decide first, because it constrains everything:**

1. **Web Bluetooth is Chrome/Edge only — desktop and Android.** No Safari, no Firefox, and
   **nothing on iOS at all**, since every iOS browser is Safari underneath. If you need to
   change the schedule from an iPhone, this whole approach doesn't work and the cloud
   design is the answer. Worth being certain about before building.
2. **The page must be served over HTTPS** (localhost exempt). If the site isn't on HTTPS
   today, that's a prerequisite, not a detail.

**UX:**

3. **The reset button is the real answer to the 30-minute wait.** A power-cycle makes the
   bot wake and advertise within seconds. Make *"press reset on the bot"* the primary
   instruction and the 35-minute wait the fallback for when you can't reach it — it turns
   the headline UX problem into a non-event.
4. **A 35-minute wait fights the browser.** Background tabs get their timers throttled to
   about once a minute, and the screen sleeps. Take a `navigator.wakeLock`, tell the user to
   keep the tab visible, and show elapsed time and attempt count so it doesn't look hung.
5. **Don't lose the device handle.** `requestDevice()` needs a user gesture, but
   `gatt.connect()` afterwards does not — so one click starts a retry loop that can run for
   the full 35 minutes. A page reload loses the handle and needs a fresh click.
6. **Pairing is the flakiest part of this stack.** Passkey entry over Web Bluetooth varies
   by OS and occasionally by Chrome version. Test it on the actual machine you'll use,
   first, before building anything on top (§8 step 1).

**Correctness:**

7. **Validate in both places.** The browser validates for good errors; the firmware
   validates because it must never trust what arrives. Unknown code, bad op, out-of-range
   value, too many rules, oversize payload → reject and keep the previous config.
8. **Never fall back to "no watering" silently.** A rejected config keeps the last known
   good one. Plants die quietly.
9. **Clamp `dur` to `[10, 300]` in firmware** regardless of config. A typo'd `15000` empties
   the tank and cooks the pump.
10. **Enforce a minimum interval between waterings in firmware.** The bot wakes twice inside
    any given hour, so a rule of just `hour_day == 8` would fire at both :00 and :30. Warn in
    the UI when a rule set has no `hrs_wtrd` clause.
11. **The device should reject a config whose version is not greater** than the one it
    holds, so a stale browser tab can't roll it backwards.
12. **Sleep during a write.** `waitForBleToFinish()` already delays deep sleep for up to 30 s
    while a client is connected, which covers a write-and-confirm. The NVS commit must still
    be atomic — validate everything first, then one write.
13. **The evaluator will exist twice** (firmware C++, browser JS). Keep a shared JSON fixture
    file of `(config, vars) → expected` cases and run it from both. It's the only thing that
    will notice them drifting.
14. **Last write wins** if two tabs send configs. Epoch-second versions make the ordering
    obvious after the fact, and the version in the readings shows which one landed.

---

## 8. Build order

Each step ends with something you can check before moving on.

| # | Step | Check |
| --- | --- | --- |
| 1 | **BLE echo spike.** Add `FFA2`/`FFA3` with no config logic — write bytes, read them back | Round-trips 424 bytes from Chrome on the machine you'll actually use, with pairing. **This de-risks everything: Web Bluetooth, passkey, MTU, long writes, all at once.** If it fights you, better to know now |
| 2 | Rule schema + JS validator + C++ parser, shared fixtures | Host-compiled C++ test and JS test both green on the same fixture file |
| 3 | NVS persist + load + status characteristic | Send a config, **pull the battery**, reboot, confirm it survived. Nothing else actually tests NVS |
| 4 | Evaluator replaces `shouldWater()`; clamps and interval floor | Bench rig: short `dur`, an LED where the pump goes. Send `dur: 15000` → clamped. Send `hour_day == 8` alone → fires once, not twice |
| 5 | Web UI: presets, rule builder, send + retry + confirm | Send while the bot sleeps → UI waits, then confirms on its next wake. Press reset → confirms in seconds |
| 6 | Lambda, table, `config_version` in readings | Newest row per device matches what the bot reports in its readings |
| 7 | Flash the garden bot | Keep the old firmware handy; watch a full day of wakes before trusting it |

Step 1 before anything else, and step 4 on a bench board rather than the real bot — that
keeps "is it the firmware or the browser?" from ever being a question you have to answer.
