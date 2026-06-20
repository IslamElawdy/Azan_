# Azan-Audio für AzanTV

## Warum hört man nur einen kurzen Piepton?

Im Repository liegen **keine echten Azan-Aufnahmen** (urheberrechtlich geschützt). Stattdessen sind **3-Sekunden-Testtöne** enthalten (~13 KB pro Datei), damit Installation und AVPlay auf dem TV getestet werden können.

**Echten Azan hörst du erst nach dem Ersetzen der MP3-Dateien.**

## Benötigte Dateien

| Datei | Verwendung |
|-------|------------|
| `makkah.mp3` | Standard-Azan (Einstellung „Makkah“) |
| `madinah.mp3` | Alternative (Einstellung „Madinah“) |
| `fajr.mp3` | Optional, nur wenn Fajr separates Audio nutzt |

## So legst du echte Azan-MP3s ein

1. Besorge **eigene** Azan-Aufnahmen als MP3 (z. B. von einer erlaubten Quelle oder eigene Aufnahme).
2. Benenne sie exakt um: `makkah.mp3`, `madinah.mp3`, ggf. `fajr.mp3`.
3. Kopiere sie in diesen Ordner im Tizen-Projekt:
   ```
   azanTV/assets/azan/
   ```
4. **Tizen Studio:** Projekt neu bauen → WGT auf den TV installieren (alte App ggf. deinstallieren).
5. In der App: **Einstellungen → Azan jetzt testen** und Lautstärke prüfen (App + TV).

## Technische Anforderungen (Samsung AVPlay)

- Format: **MP3** (empfohlen)
- Größe: möglichst unter **10 MB** pro Datei
- Länge: typisch **2–4 Minuten** für einen vollständigen Azan
- Echte Dateien sind meist **1–5 MB**, nicht ~13 KB wie die Testtöne

## Einstellungen in der App

- **Azan-Audio:** Makkah oder Madinah → wählt `makkah.mp3` bzw. `madinah.mp3`
- **Fajr-Audio:** „Separates Fajr-Audio“ → nutzt `fajr.mp3` nur für Fajr
- **Lautstärke:** 0–100 in den Einstellungen; TV-Lautstärke ebenfalls prüfen

## Hinweis

Azan-Aufnahmen von Muezzins/Moscheen sind oft urheberrechtlich geschützt. Verwende nur Dateien, die du **legal besitzen oder nutzen darfst**.
