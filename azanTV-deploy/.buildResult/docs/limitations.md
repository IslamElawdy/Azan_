# Limitations – Samsung Consumer Smart TV (NU7099 / Tizen 4.0)

This document states what AzanTV **can and cannot** do on a normal Samsung consumer TV. It is written for the primary test device **Samsung UE50NU7099UXZG (2018, Tizen 4.0)**.

## Summary

| Capability | Consumer TV app | Notes |
|------------|-----------------|-------|
| Schedule app launch | **Yes** | Tizen Alarm API (`AlarmAbsolute`) |
| Play Azan when app runs | **Yes** | AVPlay with bundled MP3 |
| Show prayer screen | **Yes** | Full-screen UI on launch |
| Exit / hide app after Azan | **Yes** | `tizen.application.exit()` |
| Wake TV from deep standby | **Unreliable / often no** | Depends on Instant On + firmware |
| Power off TV | **No** | No public consumer API |
| Silent background execution | **No** | JS paused when app hidden |
| RemotePower / SystemControl | **No** | HTV/Signage + partner cert only |

## 1. Alarm API

**Supported:** AzanTV can register an absolute alarm that launches the app with an AppControl payload.

**Limits:**

- Alarm is **removed automatically** after it fires; the app must reschedule the next prayer.
- Alarms are per-app; other apps cannot manage AzanTV alarms.
- Year **2038** upper bound (Unix time limitation documented by Samsung samples).
- **`AlarmRelative`** can be rounded to ≥600 s intervals on TV — AzanTV uses **`AlarmAbsolute`** only.

**Standby behavior (must be tested on your NU7099):**

| TV state | Expected behavior |
|----------|-------------------|
| On, app installed | Alarm should launch app |
| On, Instant On enabled, soft standby | **May** wake and launch — test required |
| Deep off / unplugged | **Will not** work |

Official references:

- [Alarm API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/alarm-api.html)
- [Alarm Guide](https://developer.tizen.org/development/guides/web-application/alarm)

## 2. Wake from standby

**From the TV web app alone:** There is **no documented, reliable API** to power on a consumer Samsung TV from full standby.

The alarm privilege text mentions waking the device, but Samsung does **not** guarantee this for all consumer firmware versions. On the 2018 NU7099 series, assume **best-effort only**.

**Recommended fallback:** Run the **AzanTV Companion** on your LAN:

1. Enable **Power On with Mobile** (WoL) on the TV
2. Enable **Instant On**
3. Companion sends WoL **60 s** before prayer
4. Tizen alarm or companion launch brings AzanTV to foreground

Alternatives documented but not built into the TV app:

- SmartThings routine (“Turn on TV”)
- Home Assistant + companion webhook
- HDMI-CEC from another always-on device
- ESP32 / IR blaster (hardware)
- **Smart plug:** ⚠️ Cutting mains power daily can stress the TV and lose settings — not recommended as first choice

## 3. Power off after Azan

**Not possible** via supported consumer APIs.

AzanTV calls **`exit()`** after Azan playback plus a configurable delay. That:

- Closes the app process
- Does **not** put the TV in standby
- Does **not** turn off the screen (TV returns to previous UI / Home)

`webapis.remotepower.powerOff()` exists only on **HTV/Signage** with partner privileges.

Reference: [Terminating Applications](https://developer.samsung.com/smarttv/develop/guides/fundamentals/terminating-applications.html)

## 4. Samsung Product APIs (RemotePower, SystemControl, Timer)

**Not available** on UE50NU7099 consumer firmware with a standard sideload certificate.

These APIs are tagged **B2B (HTV, LFD)** and require partner-level signing.

Reference: [RemotePower API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/remotepower-api.html)

## 5. Tizen Power API

**Not exposed** for Samsung TV web apps in the public device API reference. Do not rely on `tizen.power` for screen or system power on TV.

## 6. Background execution

TV web apps **must not** enable `background-support`. JavaScript timers pause when the app is hidden. AzanTV does **not** use background timers for prayer scheduling — only the OS alarm.

Reference: [Multitasking](https://developer.samsung.com/smarttv/develop/guides/fundamentals/multitasking.html)

## 7. Audio

- Uses **AVPlay**, not HTML5 `<audio>`, for TV compatibility
- Autoplay restrictions are avoided because playback starts on **user-visible alarm launch** or explicit test button
- Bundled test files are short tones; use real MP3 Azan files for production

## 8. Network / time

- Prayer calculation is **offline** (adhan)
- Correct **TV system time** and timezone are required
- DST follows the TV’s local clock

## 9. Samsung REST / WebSocket launch (companion only)

Community-documented IP control (port 8001/8002) can launch apps but:

- Requires pairing / token on many models
- May stop working after firmware updates
- Marked **optional** in companion (`enableLaunch: false` by default)

WoL is the primary companion feature.

## 10. Empirical validation on UE50NU7099

Fill in after testing on your TV (see [testing.md](testing.md)):

| Test | Result (fill in) | Date |
|------|------------------|------|
| Alarm fires while TV on | Pending | |
| Alarm fires from Instant On standby | Pending | |
| AVPlay audible on alarm launch | Pending | |
| App exits after playback | Pending | |
| Companion WoL wakes TV | Pending | |

## Honest expectation

For **reliable** Azan at prayer time on a 2018 consumer Samsung TV:

1. Keep **Instant On** + **network standby** enabled  
2. Use **AzanTV in-app alarms** when the TV is already wakeable on the network  
3. Add **companion WoL** if standby alarm tests fail  
4. Accept that **automatic TV power-off** is not supported — only app exit

This matches Samsung’s public API boundaries for consumer TV web applications.
