# Device Validation – UE50NU7099

This checklist must be completed **on the physical TV** after sideloading AzanTV. Automated CI cannot verify Tizen Alarm or AVPlay behavior.

## Prerequisites

Complete [installation.md](installation.md) first.

## Validation procedure

### Day 1 – Core flow (TV powered on)

1. Install and launch AzanTV
2. Run tests **B1–B8** from [testing.md](testing.md)
3. Record pass/fail in testing.md
4. If B5–B7 fail, use Web Inspector (Debug As) and check console for AVPlay/alarm errors

### Day 1 – Standby (Instant On enabled)

1. Schedule **Test: Alarm in 1 min**
2. Press power → TV enters standby (not long off)
3. Wait for alarm
4. Record **S2** result:
   - **Pass:** TV displays prayer screen and plays Azan
   - **Fail:** No wake → enable companion WoL and repeat **S5**

### Day 2 – Companion WoL

1. Configure `companion/config.json` with TV wired MAC and IP
2. `npm start` on LAN server
3. Run `curl -X POST http://localhost:8787/trigger-test`
4. Record **S4** / **C3**

### Day 2 – Daily recalc

1. Note today’s Fajr time on main screen
2. After local midnight (or change TV date in service menu for advanced testers), reopen app
3. Confirm times updated (**P4**)

## Update limitations.md

Copy results into **Section 10** of [limitations.md](limitations.md):

```markdown
| Alarm fires while TV on | Pass / Fail | YYYY-MM-DD |
| Alarm fires from Instant On standby | Pass / Fail | YYYY-MM-DD |
| AVPlay audible on alarm launch | Pass / Fail | YYYY-MM-DD |
| App exits after playback | Pass / Fail | YYYY-MM-DD |
| Companion WoL wakes TV | Pass / Fail | YYYY-MM-DD |
```

## Expected outcome on NU7099 (2018)

Based on Samsung API documentation (not yet confirmed on this unit):

| Scenario | Likely result |
|----------|---------------|
| TV on | Alarm + Azan should work |
| Instant On standby | May work; empirical test required |
| Deep off >1 min | Alarm unlikely; use companion WoL |
| TV power off after Azan | Not supported; app exit only |

## Reporting issues

When reporting failures, include:

- TV model: UE50NU7099UXZG
- Tizen version (Settings → Support → About)
- Instant On / WoL settings
- Alarm status text from main screen
- Whether companion was used
