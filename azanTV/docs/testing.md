# Testing – AzanTV Manual Test Checklist

Device under test: **Samsung UE50NU7099UXZG (Tizen 4.0)**

Record results in the tables below. Use **Pass / Fail / N/A** and notes.

## Installation & deployment (Emulator + real TV)

Complete this checklist **before** functional tests. App ID: `GfnCKw2I8W.AzanTV`, package: `GfnCKw2I8W`, signing profile: **`azanTV_profile`**.

### Certificate / DUID checklist

| Item | Emulator | Real TV (UE50NU7099) |
|------|----------|----------------------|
| DUID in distributor cert | `XTCJYJZXZBZVK` | `JHCKFKKBRIT2Y` |
| Profile name | `azanTV_profile` | `azanTV_profile` |
| Author CA | Samsung VD Author CA | same |
| Distributor CA | VD DEVELOPER Public CA | same |
| Cert expiry | valid (e.g. until 2027-06-20) | same |

In Tizen Studio: **Tools → Certificate Manager** → select `azanTV_profile` (check mark).  
Project: **Properties → Tizen Studio → Package → Signing → Certificate Profile** = `azanTV_profile`.

### Developer Mode (real TV)

1. Apps → **12345** → Developer Mode **On**
2. Enter host PC IP (same subnet as TV, e.g. `192.168.178.23`)
3. Restart TV if prompted
4. **Tools → Device Manager** → TV appears → **Permit to install applications** (or CLI below)

### Host PC / connection

```powershell
$env:JAVA_HOME = "C:\tizen-studio\jdk"
& "C:\tizen-studio\tools\sdb.exe" devices
```

Expected: `192.168.x.x:26101    device` (real TV) and/or emulator serial.

Permit install (if needed):

```powershell
& "C:\tizen-studio\tools\ide\bin\tizen.bat" install-permit -t 192.168.178.28:26101
```

### Uninstall old package (before reinstall)

Different certificate or stale install causes silent failures. Always uninstall first:

```powershell
cd C:\Users\iisla\Documents\Azan_\azanTV
& "C:\tizen-studio\tools\ide\bin\tizen.bat" uninstall -p GfnCKw2I8W.AzanTV -s 192.168.178.28:26101
```

`not found` is OK — continue.

### Build signed package (CLI)

```powershell
cd C:\Users\iisla\Documents\Azan_\azanTV
.\scripts\build-wgt.ps1
```

Or manually (must package **only** `.buildResult`, not the project root):

```powershell
cd C:\Users\iisla\Documents\Azan_\azanTV
$env:JAVA_HOME = "C:\tizen-studio\jdk"
& "C:\tizen-studio\tools\ide\bin\tizen.bat" clean
& "C:\tizen-studio\tools\ide\bin\tizen.bat" build-web -- .
# Remove non-runtime folders from .buildResult before signing
Remove-Item .buildResult\.metadata, .buildResult\companion, .buildResult\docs, .buildResult\scripts -Recurse -Force -ErrorAction SilentlyContinue
& "C:\tizen-studio\tools\ide\bin\tizen.bat" package -t wgt -s azanTV_profile -- .buildResult
Copy-Item .buildResult\AzanTV.wgt .\AzanTV.wgt -Force
```

Confirm `AzanTV.wgt` exists (~1.7 MB when companion/docs are excluded).

### Install with logs

```powershell
& "C:\tizen-studio\tools\ide\bin\tizen.bat" install -n AzanTV.wgt -s 192.168.178.28:26101 -- .
& "C:\tizen-studio\tools\ide\bin\tizen.bat" run -p GfnCKw2I8W.AzanTV -s 192.168.178.28:26101
```

Emulator target example: `-s emulator-26101` (use `sdb devices` for exact name).

### Emulator checklist (T-samsung-10.0-x86_64)

- [ ] Emulator running in Device Manager
- [ ] DUID `XTCJYJZXZBZVK` in distributor certificate
- [ ] Permit to install on emulator
- [ ] Uninstall old `GfnCKw2I8W.AzanTV`
- [ ] `tizen package -s azanTV_profile` succeeds
- [ ] `tizen install` succeeds
- [ ] App launches from Apps or `tizen run`

### Real TV checklist (UE50NU7099 / Tizen 4.0)

- [ ] Developer Mode on, PC IP set
- [ ] DUID `JHCKFKKBRIT2Y` in distributor certificate
- [ ] `sdb devices` shows TV
- [ ] Permit to install
- [ ] Uninstall old package
- [ ] Signed `.wgt` installs without error
- [ ] App in Apps list, launches to main screen

### Common install failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Installing the package... Fail` (Studio popup only) | Wrong/missing DUID, old cert install, no permit, **unsigned files in WGT** | Use CLI `tizen install`; package from `.buildResult` only; run `.\scripts\build-wgt.ps1`; check Console for `certificate`, `signature`, `unsigned`, `DUID` |
| Signature / author error | Wrong profile or expired cert | `azanTV_profile`, renew in Certificate Manager |
| DUID mismatch | TV/emulator not in distributor cert | Re-export profile with correct DUID |
| Package already exists (different signer) | Previous install | `tizen uninstall -p GfnCKw2I8W.AzanTV` |
| Device not listed | Network / Developer Mode | Same Wi‑Fi, correct IP, restart TV, `sdb connect IP:26101` |
| `required_version` mismatch | Target older than app | Keep `required_version="4.0"` in `config.xml` |
| Feature filter (rare) | Obsolete screen size feature | Remove `screen.size.normal.1080.1920` from `config.xml` |

If install still fails, capture: exact command, `.wgt` path, `-s` target, full CLI output, active profile, DUIDs in distributor cert.

---

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
