# EUROMASTER Content Studio – lokal starten

Erste Version zum Erstellen von Bildern und kanalbezogenen Beitragstexten. Das Studio läuft ausschließlich lokal und ist nicht für einen öffentlichen Server geeignet. Node.js 20 oder neuer wird benötigt. Für die Generierung braucht man ein OpenAI-API-Konto mit Zugriff auf die ausgewählten Modelle, einen API-Schlüssel und gegebenenfalls ein hinterlegtes Zahlungsmittel. ChatGPT Plus beinhaltet nicht automatisch API-Guthaben.

## Start

1. Dieses Repository herunterladen und ein Terminal im Projektordner öffnen.
2. Den Schlüssel nur als Umgebungsvariable setzen, niemals im Code oder auf GitHub speichern:

   macOS/Linux: `export OPENAI_API_KEY='DEIN_SCHLÜSSEL'`

   Windows PowerShell: `$env:OPENAI_API_KEY='DEIN_SCHLÜSSEL'`

3. `npm start` ausführen und `http://localhost:3000` im Browser öffnen.

Optional können `OPENAI_TEXT_MODEL` und `OPENAI_IMAGE_MODEL` als Umgebungsvariablen gesetzt werden. Standard: `gpt-4.1-mini` und `gpt-image-2.5-flare`. Verfügbarkeit und Kosten hängen vom API-Konto ab. Jeder Generierungsvorgang kann Kosten verursachen.

## Referenzen und Formate

Die Ravensburg-Fotos liegen nicht im öffentlichen Repository. Für ein Motiv können bis zu drei geeignete Bilder direkt im Studio gewählt werden. Sie werden zur Bildgenerierung an OpenAI gesendet; dabei gelten dessen Datenbedingungen. Es findet keine dauerhafte Speicherung durch diese Anwendung statt. Die Ausgabe wird im Browser auf das gewählte Format mittig zugeschnitten; dabei können Bildteile verloren gehen. Im Modus „Infopost“ werden Texte auf einem blauen Verlauf gesetzt; optional kann ein Original-Logo hochgeladen werden. Montserrat wird über Google Fonts geladen und benötigt eine Internetverbindung. Die Infopost-Texte werden direkt eingegeben. Videogenerierung ist noch nicht implementiert.

## Grenzen

Die Anwendung hat keine Anmeldung und bindet bewusst nur an `127.0.0.1`. Nicht ohne zusätzliche Authentifizierung, Zugriffskontrolle und Schutzmaßnahmen öffentlich bereitstellen. KI-Ergebnisse können Personen, Kleidung, Logos oder Sachverhalte ungenau darstellen; vor Veröffentlichung prüfen. Tests: `npm test`.
