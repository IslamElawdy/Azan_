# Handy-Steuerung für isAzan

So passt du Gebetszeiten und Einstellungen vom Smartphone an, ohne die TV-Fernbedienung zu nutzen.

## Konzept

```
Handy (Browser)  →  Companion (PC/Raspberry im WLAN)  →  Samsung TV (isAzan-App)
     /mobile              REST /api/settings                 pollt alle 60 s
```

Der **Samsung-TV** kann keine direkte Verbindung vom Handy annehmen. Stattdessen läuft ein kleiner **Companion-Dienst** im heimischen Netzwerk. Das Handy spricht mit dem Companion; die TV-App holt sich die Einstellungen von dort.

## Einrichtung (einmalig)

### 1. Companion starten

```bash
cd azanTV/companion
cp config.example.json config.json
cp app-settings.example.json app-settings.json
# config.json: TV-IP, MAC, ggf. appId
npm install
npm start
```

Der Dienst läuft standardmäßig auf Port **8787**.

### 2. Companion-URL in der TV-App

Auf dem Fernseher: **isAzan → Einstellungen → Companion-URL**

Beispiel: `http://192.168.178.10:8787`

(PC-IP des Rechners, auf dem der Companion läuft)

Speichern & neu planen.

### 3. Handy öffnen

Im **gleichen WLAN** im Browser:

```
http://192.168.178.10:8787/mobile
```

Dort Stadt, Methode, Offsets, Gebete und Audio einstellen → **Speichern & an TV senden**.

Die TV-App synchronisiert spätestens nach **60 Sekunden** (oder beim nächsten App-Start).

## Was du vom Handy ändern kannst

| Einstellung | Handy | TV |
|-------------|-------|-----|
| Stadt / Koordinaten | ✓ | ✓ |
| Berechnungsmethode | ✓ | ✓ |
| Gebete aktiv | ✓ | ✓ |
| Minuten-Offsets | ✓ | ✓ |
| Azan-Audio / Lautstärke | ✓ | ✓ |
| Companion-URL | — | nur am TV |

## Alternative Ideen (später)

| Variante | Aufwand | Hinweis |
|----------|---------|---------|
| **QR-Code auf TV** | mittel | TV zeigt QR mit `/mobile`-URL |
| **PWA / Shortcut** | gering | Handy: „Zum Home-Bildschirm“ für `/mobile` |
| **Push sofort** | hoch | TV müsste dauerhaft pollen oder WebSocket; auf TV nicht ideal |
| **SmartThings** | hoch | Offizielle Integration, mehr Setup |
| **Firebase / Cloud** | mittel | Ohne PC im LAN; Datenschutz beachten |

Empfehlung für zu Hause: **Companion + Mobile-Webseite** (bereits implementiert).

## API (für Entwickler)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/mobile` | Mobile Web-UI |
| GET | `/api/settings` | Aktuelle Einstellungen (JSON) |
| PUT | `/api/settings` | Einstellungen speichern, Version erhöhen |
| GET | `/status` | Companion-Status, WoL-Plan |
| POST | `/trigger-test` | WoL-Test |

## Fehlerbehebung

- **Handy erreicht Companion nicht:** Gleiches WLAN, Windows-Firewall Port 8787 freigeben
- **TV synchronisiert nicht:** Companion-URL prüfen, `internet`-Privileg in config.xml (bereits gesetzt)
- **Änderungen verzögert:** TV pollt alle 60 s – App neu starten für sofortigen Abruf
