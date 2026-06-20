# Testing – AzanTV Manual Test Checklist

Device under test: **Samsung UE50NU7099UXZG (Tizen 4.0)**

Record results in the tables below. Use **Pass / Fail / N/A** and notes.

## Pre-test setup

- [ ] Developer Mode enabled, app sideloaded
- [ ] TV time zone correct
- [ ] Instant On enabled
- [ ] Power On with Mobile (WoL) enabled if testing companion
- [ ] Real or test MP3 files in `assets/azan/`
- [ ] Companion running (if testing WoL)

## Blocker tests

| ID | Test | Steps | Expected | Result | Notes |
|----|------|-------|----------|--------|-------|
| B1 | App install | Run from Tizen Studio | App appears in Apps | | |
| B2 | First launch | Open AzanTV | Main screen, clock updates | | |
| B3 | Settings persist | Change city/method → Save → relaunch app | Values retained | | |
| B4 | Prayer list | Main screen | Five prayers with times | | |
| B5 | Alarm 1 min | Main → **Test: Alarm in 1 min** → wait | App relaunches, prayer screen | | |
| B6 | AVPlay | During B5 or **Azan jetzt testen** | Audio heard | | |
| B7 | Exit after Azan | After playback | App closes after delay | | |
| B8 | Next alarm scheduled | After B7, reopen app | Alarm status shows next prayer | | |

## Alarm & scheduling

| ID | Test | Steps | Expected | Result | Notes |
|----|------|-------|----------|--------|-------|
| A1 | Single alarm | `tizen.alarm.getAll()` via debug or status UI | At most one alarm | | |
| A2 | Settings replan | Change offset → Save | Alarm time updates | | |
| A3 | Disable prayer | Disable Maghrib → Save | Next alarm skips Maghrib | | |
| A4 | Test 30 s | **Test: Azan in 30 s** | Launch ~30 s later | | |

## Standby tests (NU7099 critical)

| ID | Test | Steps | Expected | Result | Notes |
|----|------|-------|----------|--------|-------|
| S1 | Alarm, TV on | Schedule 1 min test, TV on | Pass like B5 | | |
| S2 | Alarm, Instant On standby | Schedule test → put TV standby → wait | TV wakes, app runs | | |
| S3 | Alarm, cold off | TV powered off long >1 min | Likely fail — document | | |
| S4 | Companion WoL | `curl -X POST http://COMPANION:8787/trigger-test` | TV wakes | | |
| S5 | WoL + alarm | Companion WoL 60 s before 1 min test | TV awake before alarm | | |

Update [limitations.md](limitations.md) section 10 with S2–S5 results.

## Prayer time accuracy

| ID | Test | Steps | Expected | Result | Notes |
|----|------|-------|----------|--------|-------|
| P1 | Known location | Set Berlin, MWL | Times plausible vs local mosque/app | | |
| P2 | Hanafi Asr | Switch madhhab | Asr later than Standard | | |
| P3 | Offset +2 | Fajr offset +2 min | Fajr alarm 2 min later | | |
| P4 | Daily recalc | Change date or wait midnight | New day times on open | | |
| P5 | DST | Test near DST change if possible | Alarm still correct | | |

## UI / remote

| ID | Test | Steps | Expected | Result | Notes |
|----|------|-------|----------|--------|-------|
| U1 | D-pad navigation | Arrow keys on main/settings | Focus moves, Enter activates | | |
| U2 | Countdown | Main screen 1 min | Countdown decrements each second | | |
| U3 | Prayer screen | Alarm launch | Full-screen prayer name | | |

## Companion service

| ID | Test | Steps | Expected | Result | Notes |
|----|------|-------|----------|--------|-------|
| C1 | Status | `GET /status` | JSON with planned events | | |
| C2 | Plan | `GET /plan` | Today’s WoL/launch times | | |
| C3 | Test WoL | `npm run test-wol` | TV wakes | | |
| C4 | Reload | `POST /reload` after config edit | New plan | | |

## Test mode (in-app)

Built into `testModeService.js`:

| Feature | Button | Behavior |
|---------|--------|----------|
| Azan in 30 s | Main screen | `AlarmRelative`-like absolute +30 s, prayer Dhuhr |
| Alarm in 1 min | Main screen | Absolute +60 s, prayer Maghrib |
| Immediate Azan | Settings | Plays Dhuhr without alarm |

## Debug tips

- Run app in **Debug As → Tizen Web Application** for Web Inspector
- Check `#header-status` and **Alarm-Status** on main screen
- If alarm silent: verify `assets/azan/*.mp3` and volume setting
- If alarm never fires: confirm only one alarm, Instant On, not deep off

## Sign-off

| Criterion | Pass? |
|-----------|-------|
| Installed on NU7099 | |
| Settings stored | |
| Daily prayer times calculated | |
| Next prayer scheduled | |
| Alarm opens app (TV on) | |
| Azan plays | |
| App exits after playback | |
| Limitations documented with standby results | |

Tester: _______________  Date: _______________
