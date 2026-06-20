# AzanTV

Samsung Smart TV (Tizen) web application that plays the Azan at configured Islamic prayer times.

**Target device:** Samsung UE50NU7099UXZG (2018, Tizen 4.0)

## Features

- Offline prayer time calculation ([adhan](https://github.com/batoulapps/adhan-js))
- Configurable location, calculation method, madhhab, per-prayer offsets
- Tizen Alarm API schedules the next prayer event
- AVPlay audio playback (Makkah / Madinah / separate Fajr)
- Prayer screen on alarm launch, auto-exit after playback
- Test mode (30 s / 1 min alarms, immediate Azan test)
- Optional Node.js companion for Wake-on-LAN before prayer

## Project structure

```
├── config.xml          Tizen manifest & privileges
├── index.html          Main UI shell
├── src/                Application modules
├── assets/azan/        MP3 files (test tones included)
├── companion/          WoL + optional REST launch service
└── docs/               Installation, architecture, limitations, testing
```

## Quick start (development)

1. Install [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) with **TV Extensions 4.0**
2. Enable Developer Mode on TV (Apps panel → enter `12345`)
3. Create/sign certificates with TV DUID
4. Import this folder as Tizen Web Project (API 4.0)
5. Run on TV or emulator

See [docs/installation.md](docs/installation.md) for detailed steps.

## Important limitations

Consumer Samsung TVs **cannot** be powered off or reliably woken from deep standby by a normal TV web app. AzanTV uses:

- **In-app:** Tizen Alarm API + AVPlay + app `exit()`
- **External:** Companion WoL service (recommended for standby)

See [docs/limitations.md](docs/limitations.md).

## Replace test audio

The bundled MP3 files are 3-second test tones. Replace `assets/azan/*.mp3` with real Azan recordings before daily use. See [assets/azan/README.md](assets/azan/README.md).

## Companion service

```bash
cd companion
cp config.example.json config.json
npm install
npm start
```

See [companion/README.md](companion/README.md).

## License

Private use project. Azan audio files are not included (bring your own recordings).
