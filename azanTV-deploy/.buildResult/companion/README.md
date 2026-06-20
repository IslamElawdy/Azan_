# AzanTV Companion

Small Node.js service that wakes your Samsung Smart TV before prayer times using **Wake-on-LAN** and optionally launches the AzanTV app via Samsung REST API.

Use this when the Tizen Alarm API alone cannot reliably wake a consumer TV from standby (typical on Samsung NU7099 / Tizen 4.0).

## Requirements

- Node.js 18+
- TV and companion on the same LAN
- TV setting: **Settings → General → Network → Expert Settings → Power On with Mobile** (enables WoL)
- **Instant On** enabled on the TV
- Wired Ethernet recommended (WiFi WoL is often unreliable)

## Setup

```bash
cd companion
cp config.example.json config.json
# Edit config.json: tv.ip, tv.mac, coordinates
npm install
npm start
```

Find the TV MAC address: **Settings → Support → About This TV → Wired MAC Address**.

## Configuration

| Field | Description |
|-------|-------------|
| `tv.ip` | TV IP address on LAN |
| `tv.mac` | Wired MAC for WoL |
| `tv.appId` | Must match `config.xml` (`GfnCKw2I8W.AzanTV`) |
| `schedule.wolSecondsBefore` | Send WoL this many seconds before prayer (default 60) |
| `schedule.launchSecondsBefore` | Optional REST launch offset (default 30) |
| `schedule.enableLaunch` | Enable Samsung REST app launch (requires TV pairing/token) |

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Companion status and recent events |
| GET | `/plan` | Rebuild and return today's schedule |
| POST | `/trigger-test` | Send WoL (+ launch if enabled) |
| POST | `/reload` | Reload config.json and replan |

Example:

```bash
curl http://localhost:8787/status
curl -X POST http://localhost:8787/trigger-test
```

## Test WoL only

```bash
npm run test-wol
```

## Samsung REST launch notes

Launch via port 8001 requires the TV to have accepted a remote connection at least once. Community tools store a token after pairing. This is **undocumented for production** and may fail on some firmware versions. WoL alone is often sufficient if the TV Alarm API fires once the TV is awake.

## Home Assistant integration (optional)

Trigger WoL from HA using a shell command or RESTful switch:

```yaml
shell_command:
  azantv_wake: 'curl -X POST http://COMPANION_IP:8787/trigger-test'
```

Schedule automations a few minutes before each prayer time, or run the companion continuously and let it handle scheduling.
