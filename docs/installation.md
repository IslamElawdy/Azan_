# Installation – AzanTV on Samsung Smart TV

Target: **Samsung UE50NU7099UXZG (Tizen 4.0, 2018)**

## 1. Prerequisites

| Item | Details |
|------|---------|
| PC | macOS, Windows, or Linux |
| Tizen Studio | With **TV Extensions 4.0** (match TV firmware generation) |
| Samsung account | [Samsung Developer](https://developer.samsung.com/) |
| Network | TV and PC on same LAN |
| TV firmware | Current stable (Developer Mode survives updates in most cases) |

Download Tizen Studio:  
https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html

Install package: **TV Extensions-4.0**

## 2. Enable Developer Mode on the TV

1. Open **Smart Hub**
2. Go to **Apps**
3. Open **Apps Settings** (or highlight Apps and press remote keys quickly)
4. Enter **`12345`** on the remote (some models need a Bluetooth keyboard)
5. Set **Developer mode** to **On**
6. Enter your **PC IP address**
7. **Reboot** the TV
8. Confirm **Develop Mode** banner appears in Apps panel

Sign in to the TV with the same Samsung account used for certificates if the popup does not appear.

## 3. Create certificates

1. Tizen Studio → **Tools → Certificate Manager**
2. Create **Samsung Author Certificate**
3. Create **Samsung Distributor Certificate** (device type: TV)
4. Add TV **DUID** from Device Manager after first connection

Reference:  
https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html

## 4. Connect TV to Tizen Studio

1. **Tools → Device Manager**
2. **Remote Device Manager → +**
3. Enter TV name, IP, port **26101**
4. Toggle **Connection** to **On**
5. Note DUID for certificate profile

Reference:  
https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html

## 5. Import / open project

1. **File → Import → Tizen → Tizen Web Project**
2. Select this repository folder
3. Confirm **API Version 4.0** and profile **tv-samsung**
4. Verify `config.xml` application id: `com.private.azantv`

Or create empty TV 4.0 project and copy files into it.

## 6. Build and install

### From IDE

- Right-click project → **Run As → Tizen Web Application**

### From CLI (after Tizen CLI setup)

```bash
cd /path/to/Azan_
tizen build-web -- .
tizen package -t wgt -s YOUR_CERT_PROFILE -- .
tizen install -n AzanTV.wgt -t YOUR_TV_NAME
tizen run -p com.private.azantv -t YOUR_TV_NAME
```

## 7. Recommended TV settings for Azan

| Setting | Path | Value |
|---------|------|-------|
| Instant On | Settings → General → Power | On |
| Network Standby | Settings → General → Power | On (wording varies) |
| Power On with Mobile | Settings → General → Network → Expert Settings | On (for WoL) |
| Time zone | Settings → General → System Manager → Time | Correct region |
| Eco / auto power off | Disable aggressive eco if alarms fail | Off |

## 8. Optional: Companion service (WoL)

For standby wake before prayer:

```bash
cd companion
cp config.example.json config.json
# Set tv.ip and tv.mac (wired MAC from About This TV)
npm install
npm start
```

Run companion on a PC/NAS/Raspberry Pi that is always on.

## Troubleshooting

### TV not detected

- Same subnet for PC and TV
- Firewall allows port 26101
- Re-enter Developer Mode IP after PC network change
- Reboot TV

### Certificate / signing errors

- DUID in certificate must match connected TV
- Use TV distributor profile, not mobile/wearable
- Regenerate certificate after factory reset (DUID changes)

### Installation failure

- Uninstall old sideload with same app id
- API version must be **4.0** for NU7099
- Check Device Manager connection is **On**

### Alarm does not fire

- Confirm privileges in `config.xml`
- Use **Test: Alarm in 1 min** in app
- Enable Instant On / network standby
- Test with TV **on** first, then standby
- Reschedule after settings change (Save & replan)

### No audio

- Replace test MP3s with valid files in `assets/azan/`
- Check volume in app settings and TV volume
- AVPlay requires files inside app bundle (absolute path)
- Test with **Azan jetzt testen** in settings

### Wrong prayer times

- Verify latitude/longitude and timezone
- Check calculation method and Hanafi vs Standard Asr
- Apply per-prayer offsets if needed

### Network / timezone

- TV system time must be correct (NTP)
- DST handled by TV local time + adhan UTC-hour convention

## Uninstall

Remove app from TV Apps row (hold/select → Delete) or:

```bash
tizen uninstall -p com.private.azantv -t YOUR_TV_NAME
```
