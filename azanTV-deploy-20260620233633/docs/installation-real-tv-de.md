# AzanTV auf dem echten Samsung-Fernseher installieren

Zielgerät: **Samsung UE50NU7099UXZG (Tizen 4.0, 2018)**

## Kurzüberblick

| Schritt | Was |
|--------|-----|
| 1 | Developer Mode am TV aktivieren |
| 2 | TV mit Tizen Studio verbinden |
| 3 | DUID im Samsung-Zertifikat prüfen |
| 4 | App bauen, signieren, installieren |
| 5 | In **Meine Apps** starten und testen |

Bereits vorhanden auf diesem PC:

- Tizen-Profil: **`azanTV_profile`** (Samsung Author + Distributor)
- Registrierte DUIDs im Zertifikat:
  - `XTCJYJZXZBZVK` (Emulator)
  - `JHCKFKKBRIT2Y` (vermutlich echter TV — nach Verbindung prüfen)
- App-ID: **`GfnCKw2I8W.AzanTV`**

---

## 1. Developer Mode am Fernseher

1. **Smart Hub** öffnen → **Apps**
2. **Apps-Einstellungen** öffnen (je nach Modell: Einstellungen-Symbol oder Tastenfolge auf der Fernbedienung)
3. **`12345`** eingeben
4. **Developer mode** → **Ein**
5. **Host-PC-IP** eintragen (aktuell WLAN dieses PCs: **`192.168.178.23`**)
6. Fernseher **neu starten**
7. Unter Apps sollte **Develop Mode** sichtbar sein

> TV und PC müssen im **gleichen WLAN** sein. Nach Router-/PC-Wechsel die IP erneut eintragen.

---

## 2. TV in Tizen Studio verbinden

1. Tizen Studio → **Tools → Device Manager**
2. **Remote Device Manager** → **+**
3. Name beliebig, **TV-IP-Adresse** (z. B. `192.168.178.50`), Port **`26101`**
4. Verbindung auf **On**
5. **DUID** notieren (Rechtsklick auf Gerät oder über CLI):

```powershell
C:\tizen-studio\tools\sdb.exe devices
C:\tizen-studio\tools\sdb.exe -s <TV-SERIAL> duid
```

Die DUID muss im Samsung-Distributor-Zertifikat stehen. Falls nicht:

1. **Tools → Certificate Manager**
2. Profil **`azanTV_profile`** bearbeiten oder neuen Distributor mit **TV** als Gerätetyp anlegen
3. DUID des echten TVs hinzufügen
4. Profil speichern und App **neu signieren**

---

## 3. Windows-Firewall

Port **26101** (eingehend) für Tizen Studio / `sdb.exe` freigeben, falls die Verbindung scheitert.

---

## 4. Deploy per Skript (empfohlen)

PowerShell im Projektordner:

```powershell
cd C:\Users\iisla\Documents\Azan_\azanTV\scripts
.\deploy-to-tv.ps1
```

Nur bauen (ohne TV):

```powershell
.\deploy-to-tv.ps1 -BuildOnly
```

Bestimmtes Gerät:

```powershell
.\deploy-to-tv.ps1 -TvSerial "192.168.178.50:26101"
```

Das Skript:

1. `tizen build-web`
2. `tizen package -s azanTV_profile`
3. `tizen install` auf verbundenen TV
4. `tizen run -p GfnCKw2I8W.AzanTV`

Signierte WGT liegt danach in `azanTV\AzanTV.wgt` (ca. 800 KB inkl. MP3s).

---

## 5. Deploy aus Tizen Studio (GUI)

1. Projekt **`azanTV`** öffnen
2. Rechtsklick → **Run As → Tizen Web Application**
3. Zielgerät: verbundener TV (nicht Emulator)
4. Security Profile: **`azanTV_profile`**

---

## 6. App auf dem TV finden

Sideload-Apps erscheinen **nicht** im Samsung App Store, sondern unter:

**Smart Hub → Apps → Meine Apps** (bzw. „Downloaded“ / heruntergeladene Apps)

Dort **AzanTV** auswählen.

---

## 7. Erste Tests auf dem echten Gerät

Siehe [testing.md](testing.md) und [DEVICE_VALIDATION.md](DEVICE_VALIDATION.md):

1. Hauptbildschirm: Gebetszeiten plausibel?
2. **Test: Alarm in 1 min** (TV eingeschaltet)
3. **Azan jetzt testen** in den Einstellungen (Audio)
4. **Instant On** aktivieren, dann Standby-Test

---

## Fehlerbehebung

### „Kein TV verbunden“ / `sdb devices` leer

- Developer Mode und PC-IP prüfen
- TV neu starten
- Gleiches Subnetz (z. B. beide `192.168.178.x`)
- Device Manager: Verbindung **On**

### `Load archive info fail` / Signaturfehler

- Nur **Samsung**-Zertifikat verwenden (nicht reines Tizen-Dev-Zertifikat)
- DUID des **echten** TVs im Distributor-Zertifikat
- Nach Zertifikatsänderung: neu paketieren und installieren

### Installation schlägt fehl (App existiert)

```powershell
cd C:\Users\iisla\Documents\Azan_\azanTV
C:\tizen-studio\tools\ide\bin\tizen.bat uninstall -p GfnCKw2I8W.AzanTV -s <TV-SERIAL>
```

### Build: „Datei gesperrt“

Tizen Studio schließt das Projekt oder Skript nutzt automatisch `azanTV-deploy` als Kopie.

### Kein Ton

- MP3s in `assets/azan/` (Abdul-Basit, Adhan-Egypt, …)
- Lautstärke in App und am TV
- Variante in Einstellungen wählen

---

## Deinstallation

Am TV: App in **Meine Apps** markieren → Löschen

Oder per CLI:

```powershell
tizen uninstall -p GfnCKw2I8W.AzanTV -s <TV-SERIAL>
```
