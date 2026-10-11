<p align="center">
  <img src="https://raw.githubusercontent.com/bertel2020/HA-Housekeeper/main/custom_components/ha_housekeeper/brand/logo.png" alt="HA Housekeeper" width="160">
</p>

<h1 align="center">HA Housekeeper</h1>

<p align="center">
  Wartung und Analyse für Home Assistant: Inventar, Diagnose und Abhängigkeiten auf einen Blick.
</p>

<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5.svg" alt="HACS Custom"></a>
  <a href="https://www.home-assistant.io/"><img src="https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-18BCF2.svg?logo=home-assistant&logoColor=white" alt="Home Assistant"></a>
  <a href="https://github.com/bertel2020/HA-Housekeeper/releases"><img src="https://img.shields.io/github/v/release/bertel2020/HA-Housekeeper?sort=semver&include_prereleases" alt="Release"></a>
  <a href="https://github.com/bertel2020/HA-Housekeeper/actions/workflows/validate.yml"><img src="https://github.com/bertel2020/HA-Housekeeper/actions/workflows/validate.yml/badge.svg" alt="Validate"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/bertel2020/HA-Housekeeper" alt="License"></a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/bertel2020"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"></a>
  <a href="https://ko-fi.com/bertel2020"><img src="https://img.shields.io/badge/Ko--fi-support-FF5E5B?logo=ko-fi&logoColor=white" alt="Ko-fi"></a>
  <a href="https://paypal.me/RobertoMartins"><img src="https://img.shields.io/badge/PayPal-donate-00457C?logo=paypal&logoColor=white" alt="PayPal"></a>
</p>

<p align="center"><em><a href="https://github.com/bertel2020/HA-Housekeeper/blob/main/README.md">English version</a></em></p>

HA Housekeeper ist eine Wartungs- und Analyseintegration für Home Assistant. Sie erstellt ein übersichtliches Inventar der Installation, erklärt verdächtige oder verwaiste Objekte und zeigt, wie Entitäten, Geräte, Integrationen, Bereiche und Automationen voneinander abhängen.

Das Ziel ist keine aggressive automatische Bereinigung. Housekeeper hilft zunächst zu verstehen, welche Objekte existieren, weshalb etwas als problematisch gilt und was eine Bereinigung oder Reparatur betreffen würde, bevor du sie bestätigst.

> Housekeeper liest und analysiert zunächst. Änderungen gibt es ausschließlich nach ausdrücklicher Bestätigung eines Plans. Pläne umfassen Quarantäne und Entfernen, Reparaturen, das Ersetzen von Verweisen, das Umbenennen von Entitäten, das Zuweisen von Bereichen, das Löschen ungenutzter Automationen, das Kürzen des Recorder-Verlaufs und weitere Wartungsaufgaben. Je nach Aktion verlangt Housekeeper eine Quarantänezeit, eine zusätzliche Bestätigung und ein erfolgreiches Backup. Umkehrbare Änderungen lassen sich zurücksetzen, solange ihre Ziele unverändert sind; endgültige Recorder- und Backup-Löschungen werden deutlich gekennzeichnet. Integrationen und Hubs werden nie verändert, und Housekeeper ändert nur, was ein bestätigter Plan nennt.

## Einblicke

<p align="center">
  <img src="screenshots/showcase/overview-desktop-light.png" alt="Housekeeping-Übersicht" width="100%">
</p>

| Befunde | Reparieren |
| --- | --- |
| ![Befunde](screenshots/showcase/findings-desktop-light.png) | ![Reparieren](screenshots/showcase/repair-desktop-light.png) |

| Aufräumen | Abhängigkeitspfad |
| --- | --- |
| ![Aufräumen](screenshots/showcase/cleanup-desktop-light.png) | ![Abhängigkeitspfad](screenshots/showcase/graph-desktop-light.png) |

| Automationen im Betrieb | Zuverlässigkeit |
| --- | --- |
| ![Automationen im Betrieb](screenshots/showcase/runs-desktop-light.png) | ![Zuverlässigkeit](screenshots/showcase/reliability-desktop-light.png) |

<p align="center">
  <img src="screenshots/showcase/recorder-desktop-light.png" alt="Recorder-Analyse" width="100%">
</p>

<details>
<summary>Dark-Mode-Ansichten</summary>

| Übersicht | Abhängigkeitspfad | Zuverlässigkeit |
| --- | --- | --- |
| ![Übersicht im Dark Mode](screenshots/showcase/overview-desktop-dark.png) | ![Abhängigkeitspfad im Dark Mode](screenshots/showcase/graph-desktop-dark.png) | ![Zuverlässigkeit im Dark Mode](screenshots/showcase/reliability-desktop-dark.png) |

</details>

## Was Housekeeper übernimmt

| Aufgabe | Verhalten |
| --- | --- |
| **Inventar** | Entitäten, Geräte, Integrationen, Bereiche, Etagen, Labels und Automationen mit Suche, Filter und Sortierung |
| **Diagnose** | Unterscheidet aktiv, nicht verfügbar, unbekannt, deaktiviert und verwaist — jeweils mit Begründung |
| **Beobachtungszeitpunkt** | Speichert, seit wann Housekeeper eine Klassifikation beobachtet |
| **Automationsanalyse** | Trigger, Bedingungen, Aktionen, Blueprints und fehlende Referenzen; ebenso für Skripte, Szenen, Dashboards, Gruppen und Helfer |
| **Scanvergleich** | Neue und behobene Befunde, Statuswechsel, neue und entfernte Objekte seit dem letzten Scan |
| **Aufräumhinweise** | Mögliche Duplikate, ungenutzte Automationen, schwache Batterien |
| **Sensoren und Hinweise** | Zähler als Sensoren, zusammengefasste Reparaturhinweise, Befundexport als CSV/JSON und Inventarexport als CSV/Markdown/JSON |
| **Abhängigkeiten** | Beziehungen zwischen Integration, Gerät, Entität, Bereich und Automation mit Vertrauensstufe |
| **Sicherheit** | Nur für Administratoren; serverseitige Schutzmodi, Vorschau und ausdrückliche Bestätigung; je nach Aktion Backup, Prüfung und Rückgängig |

## Warum HA Housekeeper?

In gewachsenen Home-Assistant-Installationen sammeln sich häufig Registry-Einträge, nicht verfügbare Entitäten, ausgetauschte Geräte, alte Statistiken und schwer nachvollziehbare Automationsreferenzen an. Ein fehlender Zustand allein erklärt nicht, ob eine Entität absichtlich deaktiviert wurde, ihre Integration deaktiviert ist oder das zugrunde liegende Gerät nicht mehr existiert.

Housekeeper verbindet Registry-Daten mit der laufenden Home-Assistant-Instanz und stellt diesen Zusammenhang in einem gemeinsamen, nur für Administratoren erreichbaren Panel dar.

## Installation

### Über HACS (empfohlen)

[![HACS-Repository in My Home Assistant öffnen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=bertel2020&repository=HA-Housekeeper&category=integration)
[![HA Housekeeper zu My Home Assistant hinzufügen](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=ha_housekeeper)

1. Über den ersten Button das Housekeeper-Repository in HACS öffnen.
2. **HA Housekeeper** herunterladen und Home Assistant neu starten.
3. **Integration hinzufügen** (wichtig): Über den zweiten Button oder in Home
   Assistant unter **Einstellungen → Geräte & Dienste → Integration hinzufügen →
   HA Housekeeper** und den Dialog abschließen. Der Download in HACS allein reicht
   nicht; ohne diesen Schritt erscheint kein Menüpunkt.
4. Anschließend als Administrator **Housekeeper** in der Seitenleiste öffnen.

Falls der erste Button nicht funktioniert, in HACS unter **Integrationen →
Benutzerdefinierte Repositories** `https://github.com/bertel2020/HA-Housekeeper`
als Kategorie **Integration** eintragen.

Solange Housekeeper noch nicht in der normalen HACS-Suche erscheint, registriert
der erste Button das Projekt als benutzerdefiniertes Repository. Den Stand der
Aufnahme zeigt [hacs/default#11766](https://github.com/hacs/default/pull/11766).

### Manuell

Das Verzeichnis `custom_components/ha_housekeeper` nach
`/config/custom_components/ha_housekeeper` kopieren und Home Assistant neu
starten. Danach die Integration wie oben beschrieben hinzufügen.

Das Ergebnis sollte so aussehen:

```text
config/
└── custom_components/
    └── ha_housekeeper/
        ├── __init__.py
        ├── manifest.json
        └── ...
```

## Funktionen

### Installationsübersicht

- Inventar für Entitäten, Geräte, Integrationen beziehungsweise Config Entries, Bereiche, Etagen, Labels und Automationen
- Suche nach Name, Objekt-ID, Unique ID, Plattform oder Integration
- Filter nach Objekttyp und Zustand
- sortierbares und paginiertes Inventar für größere Installationen
- Übersicht der Objektanzahl und aktuellen Befunde

### Entitäts- und Gerätediagnose

Housekeeper unterscheidet zwischen:

- einer aktiven Entität mit aktuellem Zustand
- einer Entität mit dem Zustand `unknown`
- einer Entität mit dem Zustand `unavailable`
- einer absichtlich deaktivierten Entität
- einer Entität an einem deaktivierten Gerät
- einer Entität aus einer deaktivierten Integration
- einer Entität, deren Gerät nicht mehr in der Geräte-Registry existiert
- einer Entität, deren Config Entry nicht mehr existiert
- einer registrierten Entität, für die kein Zustand mehr vorhanden ist

Für jede durchgehend beobachtete Klassifikation speichert Housekeeper, wann sie erstmals erkannt wurde. Dieser Zeitpunkt wird ausdrücklich als **erster Housekeeper-Nachweis** bezeichnet – nicht als vermeintliches Lösch- oder Ausfalldatum.

### Automationsanalyse

- Auflistung der geladenen Automationen und ihres aktuellen Zustands
- Anzeige von Modus, Parallelitätsgrenzen, letzter Auslösung und Blueprint-Herkunft
- Darstellung von Triggern, Bedingungen und Aktionen in der Detailansicht; der Reiter **Ablauf** zeigt sie als Baum (Wenn/Dann, Wiederholungen, parallele Schritte) mit Klartext je Schritt, anklickbaren Entitäten und rot markierten Schritten mit fehlenden Objekten oder Befunden
- Ermittlung von Entitäts-, Geräte-, Bereichs-, Etagen- und Labelreferenzen
- Einbeziehung der von Home Assistant zur Laufzeit erkannten Referenzen, darunter viele Templatereferenzen
- Erkennung von Referenzen, deren Ziel nicht mehr existiert
- genaue Fundstelle für explizite Referenzen, soweit verfügbar
- Skripte, Szenen und Dashboards werden ebenso auf Referenzen und fehlende Ziele geprüft; die Detailseite zeigt unter **Auswirkung einer Entfernung**, was eine Entfernung betreffen würde (nur Analyse, ohne Änderung)

### Änderungen seit dem letzten Scan

Die Ansicht **Änderungen** vergleicht den aktuellen Stand mit dem Scan davor oder mit dem letzten Scan jedes früheren Tages (standardmäßig 30 Tage aufbewahrt, unter Einstellungen von 1 bis 365 einstellbar, mit Zeitleiste der gespeicherten Scans): Statuswechsel (verschlechtert zuerst), neue und behobene Befunde sowie neue und entfernte Objekte. Du kannst eigene datierte Notizen in die Zeitleiste eintragen. Der Verlauf wird kompakt in Home Assistant gespeichert und enthält nur Status und IDs; Notizen enthalten den von dir eingegebenen Text und das optionale Ziel.

### Weitere Ansichten und Quellen

- **Befunde ausblenden**: Ein Befund lässt sich auf der Detailseite ausblenden (nur in Housekeepers eigener Liste, Home Assistant bleibt unverändert). Alternativ blendet das Label `housekeeper_ignore` an einer Entität oder Automation deren Befunde aus. Housekeeper legt dieses Label nicht automatisch an: Erstelle es einmal in Home Assistant unter **Einstellungen → Bereiche, Labels & Zonen → Labels** mit dem exakten Namen `housekeeper_ignore` und weise es anschließend dem Objekt zu, das Housekeeper ignorieren soll. Ausgeblendete Befunde zählen nicht in Übersicht, Sensoren und Reparaturhinweisen und lassen sich über **Ausgeblendete anzeigen** wieder einblenden. Beim Ausblenden wählst du die Art: **Ausgeblendet**, **Bewusst behalten** (mit Pflicht-Begründung) oder **Später erinnern**, optional mit Dauer (7, 30, 90 oder 365 Tage). Läuft die Frist ab, erscheint der Befund wieder in der Liste, markiert als **Wiedervorlage fällig** und filterbar. Begründung und Frist stehen in der Liste der ausgeblendeten Befunde.
- **Status der Befunde**: Bekannt (mit Begründung), Zurückgestellt (mit Frist) und Ausgeblendet; automatisch kommen Neu, In Arbeit (ein Plan läuft oder liegt vor) und Zuletzt behoben dazu. Die Liste filtert danach, die Sammelauswahl markiert mehrere Befunde auf einmal als bekannt oder stellt sie zurück. Bei einem möglichen Duplikat gibt es „Ist kein Duplikat“.
- **Vermerke**: Auf der Detailseite (Reiter Beziehungen) eines Geräts oder einer Entität sagst du Housekeeper, was zu erwarten ist: **Absichtlich offline**, **Saisonal**, **Reservegerät**, **Wird ersetzt** (mit Ziel) oder **Nicht entfernen**, mit Begründung und optional einem Prüfdatum (30, 90, 180 oder 365 Tage). Ein Vermerk blendet „nicht verfügbar“ bei diesem Objekt aus (bei einem Gerät: bei seinen Entitäten), nie eine kaputte Referenz. **Nicht entfernen** sperrt alle Bereinigungsschritte für das Objekt. Nach dem Prüfdatum erscheinen die Befunde wieder, markiert als fällig. Vermerke liegen nur in Housekeeper.
- **Was du tun kannst**: Auf der Detailseite fasst eine Karte zusammen, was zum Objekt möglich ist: Befunde entscheiden, ersetzen, Deaktivieren planen, ein Label ergänzen. Alles öffnet nur eine Vorschau unter Aufräumen.
- **Refactoring-Hinweise** (nur lesen) für Automationen: Geräte-Trigger, lange Verzögerungen und Zweige, die nie zutreffen können. Ein Refactoring-Assistent, der Automationen mit Vorschau und Rückgängig umbaut, ist experimentell und standardmäßig aus.
- **Auswirkung**: Jeder Befund hat eine Auswirkung (**hoch**, **mittel**, **gering**, **keine**) mit den Gründen dahinter, zum Beispiel „von 3 aktiven Automationen genutzt“ oder „steuert 1 kritisches Objekt“. Kritisch sind Objekte mit dem Label `housekeeper_critical` (an Entität, Gerät oder Bereich) sowie Schlösser, Alarmanlagen, Ventile, Sirenen, Garagentore und Tore und Sensoren für Rauch, Gas, Kohlenmonoxid, Wasser und Sicherheit. Die Befundliste sortiert standardmäßig nach Auswirkung, dann nach Sicherheit der Diagnose, und lässt sich danach filtern. Es gibt keinen Zahlenwert.
- **Kritische Objekte bereinigen**: Aktionen im Aufräumen auf kritischen Objekten (siehe Auswirkung) verlangen eine eigene Bestätigung pro Objekt, auch wenn sonst nichts dagegen spricht. Richtlinien-Verstöße lassen sich wie Befunde ausblenden, behalten (mit Begründung) oder auf Wiedervorlage legen.
- **Protokoll gelöschter Statistiken**: Jedes Löschen verwaister Recorder-Statistiken wird im Aufräumen vermerkt (Zeit, wer, Backup, was gelöscht und übersprungen wurde). Es lässt sich nicht umkehren, deshalb steht es nur im Protokoll.
- **Gerät austauschen**: Unter Aufräumen wählst du das alte und das neue Gerät. Housekeeper schlägt zu jeder alten Entität passende neue vor (Geräteklasse, Einheit, Bereich, Name) und nimmt nichts vorweg: Jedes Paar bestätigst du einzeln, bei Zählern wählst du, ob Referenzen ersetzt oder der Zählerverlauf übernommen wird. Daraus entsteht eine normale Vorschau mit Backup, Prüfung und Rückgängig. Das alte Gerät deaktivierst du danach über „Gerät deaktivieren“.
- **Nachkontrolle, Endzustand und Prüfbericht**: Nach einem ausgeführten Plan beobachtet Housekeeper 24 Stunden lang, ob neue defekte Referenzen, nicht verfügbare Entitäten oder wiederkehrende Geräte auftauchen (**sauber** oder **Rückfall**, Rückfälle stehen unter „Was muss ich jetzt tun?“). Die Vorschau zeigt vorab den erwarteten Endzustand, und zu jedem Plan gibt es einen Prüfbericht als Markdown, mit echten Namen und IDs, auf Wunsch mit Platzhaltern statt IDs und Namen (zum Teilen). Optional und experimentell (Standard aus) schlägt Housekeeper kleine mechanische Verbesserungen einer Automation vor (Beschreibung ergänzen, völlig gleiche Trigger entfernen, Timeout bei Warteschritten ergänzen, Modus und Limit ändern; danach beobachtet Housekeeper 24 Stunden lang, ob die Automation Fehlerläufe bekommt), jeweils als Plan mit Diff, Prüfung durch Home Assistant, Backup und Rückgängig; Blueprint-Automationen werden nicht angefasst. Mehrere offene Vorschau-Pläne lassen sich im Journal zu einem Plan zusammenführen; er wird neu bewertet, Widersprüche (dasselbe Objekt, verschieden angefragt) werden genannt und nicht still entschieden.
- **Automations-Diagnose** (Reiter „Qualität“ in der Lauf-Ansicht): Sieben getrennte Blickwinkel je Automation, bewusst ohne Gesamtnote: Integrität, Zuverlässigkeit, Wirksamkeit, Wartbarkeit, Restart-Festigkeit, Effizienz und Konflikte; „unbekannt“ heißt, dass es noch nichts zu beurteilen gibt. Pro Automation lassen sich **Erfolgskriterien** festlegen (Zielentitäten, Sollzustand, Frist, optional Mindestdauer, oder: ein Dienst wie eine Benachrichtigung oder ein Skript wird vom selben Lauf aufgerufen, zugeordnet über den Kontext des Laufs); danach führt Housekeeper je Auslösung einen Verlauf erreichter und verfehlter Kriterien. Wiederholt verfehlte Ziele werden zu einem Befund und stehen unter „Was muss ich jetzt tun?“. Auf Wunsch zählt die **Abdeckung**, welcher Trigger und welcher Zweig gelaufen ist und welche nie (Standard aus; der Trace wird dafür kurz im Arbeitsspeicher gelesen, gespeichert werden nur Zähler). Zwei Läufe lassen sich **vergleichen** (anderer Trigger, Zweig, Ende, Laufzeit, Updates dazwischen). Der **Testlauf** erklärt, was eine Automation mit den aktuellen und eigenen Testzuständen tun würde; er führt nie etwas aus und markiert kritische Ziele wie Schlösser und Garagentore.
- **Wartungsziele**: Auf der Übersicht steht eine Karte mit sieben Zielen, die du selbst einstellst: höchstens 0 defekte Referenzen, höchstens 10 nicht verfügbare Entitäten, Backup nicht älter als 36 Stunden, Wiederherstellungstest nicht älter als 90 Tage, Datenbankwachstum höchstens 50 MB pro Tag, keine schwache Batterie, höchstens 5 Geräte ohne Bereich. Jedes Ziel zeigt den Ist-Wert, die Grenze und ob es **erfüllt**, **verfehlt** oder **unbekannt** ist (zum Beispiel wenn es noch zu wenige Größenmessungen gibt); „nie bestätigt“ zählt als verfehlt. Jedes Ziel lässt sich anpassen oder abschalten. Es ändert sich nichts an Home Assistant und nichts an der Gesundheitszahl.
- **Gemeinsame Ursachen**: Ist eine Integration nicht geladen, erscheinen ihre Entitäten alle als „nicht verfügbar“. Housekeeper fasst das zu einer Ursache zusammen („Integration X ist nicht geladen“, mit Zustand, Fehlertext und den betroffenen Automationen, Skripten und Dashboards). Dasselbe gilt für ein Gerät mit mindestens drei Entitäten, die alle ausgefallen sind. Der Block steht über der Befundliste und in „Was muss ich jetzt tun?“; die Folgebefunde sind eingeklappt, bis du **Folgebefunde anzeigen** wählst (der Export enthält sie immer). Ausgeblendete und mit einem Vermerk versehene Befunde zählen nicht mit. Die Gesundheitszahl bleibt unverändert; es ist ein Hinweis, kein Beweis.
- **Sicherheitsstatus**: Unter der Navigation steht auf jeder Ansicht eine schmale Zeile mit letztem Backup, letzter Änderung durch Housekeeper, ob Rückgängig noch möglich ist oder nur ein Backup-Restore, laufender Operation und laufender Nachbeobachtung. Ein Klick öffnet die passende Ansicht. Die Gesundheitskarte zeigt „N / 100 gesund“ und wie viele Objekte betroffen sind; jede gemeinsame Ursache ist eine Falte mit Zahlen je Objektart und den Folgebefunden darin.
- **Recorder-Daten beim Entfernen**: Beim Entfernen von Entitäten oder Geräten wählst du in der Werkzeugleiste, was mit den Recorder-Daten geschieht: **Behalten** (Standard), **Statistik löschen** oder **Statistik und Verlauf löschen**. Die Wahl gilt für den ganzen Plan. Sie ist nicht umkehrbar (nur mit dem Backup), deshalb bestätigst du jede Entfernung einzeln; sie ist gesperrt, wenn das Energie-Dashboard die Entität nutzt oder kein Recorder da ist. Die Vorschau nennt die genauen Zeilenzahlen.
- **Schutzmodus** (Einstellungen → Sicherheit): legt auf dem Server fest, was Pläne ändern dürfen: 1 nur lesen, 2 Quarantäne (nur Deaktivieren), 3 bestätigte Änderungen mit Backup (ohne unumkehrbares Löschen von Recorder-Daten), 4 voller Wartungsmodus (Standard, wie bisher). Die Grenze gilt beim Bestätigen, Starten und Rückgängigmachen, nicht nur für Knöpfe im Panel; Pläne anlegen und alle Ansichten bleiben immer erlaubt. Ist der Modus nicht „voll“, steht das in der Sicherheitszeile.
- **Batterieprognose** (Menü Pflegen → Batterien) **und Wartungserinnerungen** (Pflegen → Erinnerungen): Die Prognose schätzt aus dem Verlauf der letzten fünf Wochen, wann eine Batterie die Grenze erreicht, und fasst Batterien zusammen, die in denselben zwei Wochen fällig werden. Sie verspricht nichts bei zu wenigen Tagen, flachem oder steigendem Verlauf. Du kannst je Gerät den Batterietyp hinterlegen; die Einkaufsliste für 30 Tage gruppiert den erwarteten Bedarf nach Typ, und einen erkannten Batteriewechsel kannst du in den Verlauf übernehmen. Darunter pflegst du eigene Erinnerungen (Filter, Entkalken, Batteriewechsel) mit Name, Abstand in Tagen und letztem Datum; fällige stehen in „Was muss ich jetzt tun?“ und lösen das Ereignis `ha_housekeeper_reminder_due` aus. Housekeeper ändert dabei nichts in Home Assistant. In der Zuverlässigkeit zeigt jeder Eintrag zusätzlich, wie oft seine Einrichtung zuletzt fehlschlug (aus den Scans gezählt).
- **Ereignisse für eigene Automationen**: Nach einem Scan löst Housekeeper für jede neue Lage ein Ereignis auf dem Home-Assistant-Bus aus: `ha_housekeeper_critical_finding`, `ha_housekeeper_backup_overdue`, `ha_housekeeper_quarantine_expired`, `ha_housekeeper_followup_regression` und `ha_housekeeper_integration_down` und `ha_housekeeper_reminder_due`. Jede Lage wird einmal gemeldet (beim ersten Mal still, damit der Bestand nicht auf einmal feuert), die Daten enthalten nur IDs und Zahlen. Housekeeper schickt selbst nichts; die Benachrichtigung baust du in einer Automation.
- **Statistik und Dashboards in den Richtlinien**: zwei Regeln prüfen die Metadaten der Langzeitstatistik (Einheit nicht mehr umrechenbar, Zustandsklasse passt nicht zur Statistik), fünf Regeln die Dashboards (Navigation zu fehlender Ansicht, deaktivierte Entitäten, doppelte Karten, mehr als 200 Karten, Custom-Karten ohne irgendeine Ressource). Alle sind zunächst aus; Werte der Statistik (Sprünge, Rücksetzer) werden nicht geprüft.
- **Sensoren**: Housekeeper legt ein Dienstgerät mit Zählern an (Befunde, verwaiste und nicht verfügbare Entitäten, defekte Referenzen, mögliche Duplikate, ungenutzte Automationen, schwache Batterien, letzter Scan), nutzbar in Dashboards und Automationen.
- **Batterien**: Eigene Ansicht mit allen Batterie-Entitäten, niedrigste Werte zuerst (niedrig ab 20 %, einstellbar). Sensoren, die Volt statt Prozent melden, zählen nicht als Prozent-Batterie, sondern stehen in einer eigenen Karte: Housekeeper schätzt den Typ aus der höchsten Spannung der letzten Wochen (zum Beispiel 3-V-Knopfzelle, 1,5-V-Zelle, Lithium-Ionen, 12 V), nimmt dessen Grenze und rechnet dieselbe Prognose. Der Typ steht dabei; er ist eine Schätzung.
- **Nicht verwendet**: Eigene Ansicht mit aktiven Entitäten, die in keiner Automation, keinem Skript, keiner Szene, Gruppe, keinem Helfer und keinem lesbaren Dashboard vorkommen (ohne Diagnose- und Konfigurations-Entitäten). Entitäten und verwaiste Statistiken stehen in Tabellen, die sich filtern und nach Spalten sortieren lassen (Entitäten: Gerät, Bereich, Integration, letzte Änderung, letzte Meldung, beobachtet seit; Statistiken: Art, Einheit, letzter Eintrag, Energie-Dashboard); auf dem Handy erscheinen sie als Karten. Rein ein Hinweis und kein Befund: Sprachassistenten, Apps, automatisch erzeugte Dashboards oder externe Systeme sieht Housekeeper nicht.
- **Übersicht**: Unter den Kennzahlen steht der **Inventarstatus** in drei Gruppen (Unauffällig, Prüfen, Problematisch) mit Anzahl und Anteil, darunter die Befunde. Kopfkacheln zeigen kleine Sparklines, wenn ein Verlauf vorhanden ist. Rechts folgen Trend, die Karte **Datenbank** (Größe, WAL-Datei, Aufbewahrungszeit aus der Recorder-Einstellung von Home Assistant, Wachstum pro Tag; nur zwei Dateigrößen, keine Abfrage der Tabellen), Aufräumen und die Objekte nach Typ. In den Eckdaten einer Entität stehen letzter Zustandswechsel, letzte Meldung und, bei Langzeitstatistik, der letzte Statistik-Eintrag.
- **Richtlinien (Pflegen)**: Eigene Regeln für Ordnung, einzeln einschaltbar und zunächst alle aus: Entität ohne Bereich (nur Entitäten physischer Geräte, ohne Diagnose-, Konfigurations- und deaktivierte Entitäten und ohne Dienst-Geräte), Gerät ohne Bereich, Automation ohne Beschreibung, Batterie-Entität ohne Gerät, doppelter Anzeigename (je Domain), Automation ohne Label (nur Automationen mit Registry-Eintrag) und Namensschema (ein Präfix je Domain, bis zu 10, zum Beispiel `wz_` für `sensor`). Verstöße sind Hinweise und zählen nicht in Gesundheit, Befunde, Reparaturhinweise oder Sensoren. Mit dem Label `housekeeper_ignore` oder über **Ausblenden** nimmst du ein Objekt aus; die Schalter liegen nur in Housekeeper. Dazu die Regel „Zustandsänderungen pro Tag“ mit einstellbarer Grenze (Standard 5.000), die nur die zuletzt berechneten Last-Zahlen liest und nie eine Recorder-Abfrage startet. Weitere Regeln: Entitäts-ID mit angehängter Zahl, Entitäts-ID mit Geräteadresse (IP, MAC, Funk, Zigbee), Standardname bei Automation oder Skript, Skript ohne Beschreibung oder Label, Gerät ohne Hersteller oder Modell, leerer Bereich, Label ohne Zuordnung, Automation mit mehr als 10 Auslösern, Freigabe ohne Verwendung, sensible Entität freigegeben, niedrige Batterie ohne Automation, Entität mit vielen Recorder-Schreibvorgängen ohne Verwendung und lange Aufbewahrung bei großer Datenbank. Als Heuristik (Hinweis, mit möglichen Fehlalarmen) laufen: Automation ohne Fehlerbehandlung, feste Entitäts-IDs in Templates, Automation löst sich selbst aus und „wird nur eingeschaltet“.
- **Integrationen mit Problemen** erscheinen auf der Übersicht, daneben die Karte **Hinweise** mit Schnellzugriff auf Batterien, Duplikate, ungenutzte Automationen und nicht verwendete Entitäten.
- **Einstellungen** (Zahnrad rechts im Menü oben) mit Kopfband (Version, Home Assistant, Objekte, „Info kopieren“) und sieben Reitern: **Darstellung**, **Sicherheit**, **Scan und Schwellen**, **Benachrichtigungen**, **Wartungsziele**, **Ausgeblendet** und **Info**. Darstellung umfasst Sprache, Schriftgröße, Modus, Farbschema, Dichte, Animationen, Startansicht und Einträge pro Seite; sie wird im Home-Assistant-Benutzerprofil gespeichert (zusätzlich im Browser). Unter Sicherheit wählst du den serverseitigen Schutzmodus. Scan und Schwellen enthält Scanintervall und sämtliche Diagnosegrenzen. Gespeichert wird erst nach einer Änderung, Housekeeper lädt danach neu.
- **Bereinigung**: Die Ansicht **Aufräumen** prüft ausgewählte verwaiste oder lange nicht verfügbare Entitäten in einem Dry Run: ohne bekannte Verwendung, zu prüfen oder blockiert (sichere Verwendung, funktionierende Entität), samt Verweisen und Hinweis auf Langzeitstatistiken. Housekeeper ändert dabei nichts. Ein Plan lässt sich ausdrücklich bestätigen (Wort eintippen) und ausführen; ausführbar sind das **Deaktivieren** als Quarantäne (Registry-Eintrag, Historie und Statistiken bleiben unverändert) sowie, nach den unten genannten Bedingungen, das **Entfernen**, die Gerätebereinigung, das Ersetzen von Verweisen und der Zählerwechsel. Blockierte Einträge laufen nie, „zu prüfen“ nur mit Einzelbestätigung. Vor jedem Schritt wird neu geprüft; hat sich eine Entität seit der Vorschau geändert, bricht der Lauf ab. Danach prüft Housekeeper das Ergebnis. Die meisten Schritte lassen sich im Journal rückgängig machen, solange die Entität unverändert ist; die Langzeitstatistik eines Zählerwechsels lässt sich nur mit dem Backup zurücksetzen. Quarantäne-Hinweis: Eine Karte zeigt, seit wann eine Entität in Quarantäne ist und ab wann ein späteres Entfernen frühestens vorgesehen wäre (14 Tage). Jeder Plan steht im Journal (Pläne, die ausgeführt wurden, bleiben als Protokoll erhalten). **Entfernen** (Registry-Eintrag löschen) ist nur für Entitäten möglich, die mindestens 14 Tage in Quarantäne waren: Housekeeper legt vorher ein Home-Assistant-Backup an (nur Home Assistant, ohne Apps und Ordner, ohne Datenbank, außer der Plan schreibt in sie; Speicherorte und Verschlüsselung wie bei deinen automatischen Backups; es erscheint als eigenes Backup „Housekeeper …“ und zählt nicht als dein reguläres), wartet auf dessen erfolgreichen Abschluss und startet sonst nichts. Der Registry-Eintrag steht im Journal, sodass sich eine entfernte Entität wiederherstellen lässt, solange ihre ID frei ist und die Integration noch existiert; sie ist danach wieder in Quarantäne.
  **Geräte** folgen denselben Regeln: *Deaktivieren* (Quarantäne) ist nur möglich, wenn keine Entität des Geräts mehr funktioniert, nichts am Gerät hängt (Hubs und Koordinatoren sind gesperrt) und nichts es sicher verwendet. Untergeräte (Child Devices) zeigt Housekeeper an, bereinigt sie aber nie; ein Gerät mit Untergeräten zählt wie ein Hub. *Entfernen* nutzt den offiziellen Weg von Home Assistant (die Integration wird gefragt und kann ablehnen) und ist erst nach 14 Tagen Quarantäne und mit Backup möglich. *Lokal vergessen* ist nur für Integrationen gedacht, die kein reguläres Entfernen anbieten: Housekeeper entfernt den Registry-Eintrag und lädt die Integration neu; das Quellsystem (Gerät, Hub, Cloud) bleibt unverändert, und taucht das Gerät wieder auf, zeigt eine Karte **Wiederkehrende Geräte** das an. Beim Entfernen verschwinden auch die Entitäten des Geräts; Wiederherstellen legt den Registry-Eintrag aus dem Journal neu an, ob die Integration die Entitäten wieder bereitstellt, entscheidet sie selbst. Deshalb braucht jedes Entfernen eine Einzelbestätigung.
  **Verweise ersetzen** tauscht eine alte Entität gegen eine neue überall dort, wo sie exakt eingetragen ist: Automationen, Skripte und Szenen (YAML-Dateien), Dashboards im Speichermodus und das Energie-Dashboard. Die Vorschau zeigt je Quelle die Änderungen. Templates, YAML-Dashboards, Helfer und Dateien mit `!secret`/`!include` ändert Housekeeper nicht, sondern listet sie zur Handarbeit. Jede Quelle wird vorab im Journal gesichert (Kommentare in YAML-Dateien gehen beim Schreiben verloren, wie beim Home-Assistant-Editor; beim Rückgängigmachen wird die ursprüngliche Datei bytegenau zurückgeschrieben, solange sie unverändert ist, sonst nur der geänderte Eintrag), ein Backup ist Pflicht, und das Zurücksetzen klappt, solange die Quelle noch genau so ist, wie Housekeeper sie hinterlassen hat. Historie und Statistiken werden dabei nicht verschoben oder zusammengeführt (dafür gibt es den Zählerwechsel).
  **Zählerwechsel** führt die Historie eines ersetzten Zählers mit dem neuen zusammen. Housekeeper prüft zuerst, ob beide Statistiken zusammenpassen (gleiche Einheit und Art), und zeigt vorab Umschaltpunkt, Lücken, Überlappungen und den Übergang der Summe. Zur Wahl stehen drei Wege: die Langzeitstatistik des alten Zählers vor die des neuen kopieren und dessen Summe um den alten Endstand verschieben (die Rohwerte des neuen Zählers bleiben unverändert), den neuen Zähler die ID des alten übernehmen lassen (der alte zieht auf eine freie `_alt`-ID um; Home Assistant verschiebt Historie und Statistik mit der ID, Automationen und Dashboards laufen ohne Umschreiben weiter) oder beides. Vorhandene Werte werden nie überschrieben: überlappende Werte des alten Zählers werden nicht kopiert. Das Schreiben der Statistik ist experimentell, braucht das Backup und lässt sich nur damit zurücksetzen; die ID-Übernahme lässt sich über das Journal zurückgeben. Nur die stündliche Langzeitstatistik wird zusammengeführt, nicht die Rohzustände und nicht die Kurzzeitstatistik der letzten Tage. Danach kann der alte Zähler in Quarantäne.
  **Zählerfehler bereinigen** repariert einen Zähler, der kurz einen falschen Wert geliefert hat (zum Beispiel ein Wasserzähler, der für Stunden von 91 auf 41 m³ fiel). Home Assistant zählt den Rücksprung als neuen Verbrauch und verfälscht damit die Summe. Housekeeper findet solche Ausreißer (Werte, die die Reihenfolge brechen und danach wieder zurückkehren, höchstens 48 Stunden lang; ein dauerhaft niedriger Wert wie bei einem Zählertausch wird nie angefasst) und ersetzt die falschen Werte im Verlauf, in den 5-Minuten-Werten und in den Stundenwerten, entweder durch den letzten guten Wert oder auf einer geraden Linie zum nächsten. Die verfälschte Summe wird neu berechnet. Die Vorschau zeigt den Verlauf vorher und nachher und die Zeilen je Tabelle. Das schreibt in die Recorder-Datenbank: nur im Schutzmodus „voll“, mit Backup, mit Prüfung danach, und die überschriebenen Werte bleiben im Journal, sodass sich alles zurückspielen lässt, solange niemand die Zeilen danach geändert hat. Mehr als 5000 Zeilen in einem Lauf lehnt Housekeeper ab; ist das Datenbankschema unbekannt, schreibt es nichts.

  **Gezielt bereinigen** funktioniert auch für einen Fehler, den du selbst gesehen hast, bei einem Zähler oder einem Messwert (Temperatur, Leistung …): Sensor und Zeitraum (höchstens 31 Tage) wählen, dazu den letzten guten Wert, eine gerade Linie oder einen festen Wert. Die Vorschau zeigt, welche Daten es für den Zeitraum noch gibt (Verlauf roh, 5-Minuten-Werte, Stundenwerte), und je Tabelle Zeile für Zeile den Wert vorher und nachher. Bei Messwerten werden die Stundenwerte aus den korrigierten 5-Minuten-Werten neu berechnet; sind diese schon gelöscht, bekommt der Stundenwert den Ersatzwert und gilt als Schätzung. Ein Zähler darf dabei nicht sinken; ohne guten Wert davor und danach wird nichts geschrieben. Den Zeitraum wählst du an den Datumsfeldern oder an zwei Reglern unter dem Verlauf des Sensors (letzte 1 bis 365 Tage). Die Prüfung findet auch bei Messwerten Ausschläge weit außerhalb des Üblichen (zum Beispiel 85 °C bei einer Raumtemperatur, die danach wieder normal ist) und übernimmt den Zeitraum auf Knopfdruck ins Formular; Werte innerhalb dessen, was der Sensor sonst auch meldet (Leistungsspitzen, Regen), meldet sie nie. Sicherheit, Backup, Prüfung und Rückgängig wie oben; hat jemand nach der Bereinigung einzelne Zeilen geändert, spielt „Rückgängig“ alle übrigen Zeilen zurück und lässt die geänderten stehen.
- **Geführte Pläne und weitere Wartungsaktionen**: Pläne führen durch Auswahl, Einstellung, Vorschau, Bestätigung, Ausführung und Ergebnis. Housekeeper kann gespeicherte Zustände kürzen, die älter als 7 bis 90 Tage sind (Statistiken bleiben erhalten), geeignete Housekeeper-Backups nach einer Aufbewahrungsregel löschen und eine ungenutzte Automation aus `automations.yaml` entfernen. Diese Aktionen zeigen zuerst ihren genauen Umfang; endgültige Löschungen werden deutlich gekennzeichnet. Die Backup-Bereinigung schützt Backups beobachteter Pläne und das neueste Backup, das noch für Rückgängig benötigt wird.
- **Umbenennen und zuweisen**: Eine Entitäts-ID lässt sich zusammen mit exakten Verweisen in Automationen, Skripten, Szenen und Dashboards im Speichermodus umbenennen; ursprüngliche ID und Dateien bleiben für Rückgängig verfügbar, solange sie unverändert sind. Entitäten und Geräte ohne Bereich können per Plan einen Bereich erhalten, mit einem Vorschlag aus Gerät oder Integration.
- **Wartung**: Die Ansicht **Wartung** beginnt mit dem **Backup-Schutz**: Housekeeper beurteilt, ob die Backup-Strategie belastbar ist (Alter des letzten Backups gegen den Zeitplan, fehlgeschlagene Läufe und Ziele, lokale und externe Ablage, ungewöhnliche Größe, Aufbewahrung, Verschlüsselung, Backup vor Bereinigungen). Emergency Kit und Restore-Test kann Home Assistant nicht erkennen; du bestätigst sie mit Datum, Housekeeper erinnert nach 180 Tagen an den Restore-Test. Housekeeper liest nur, löst keine Backups aus und stellt nie selbst wieder her. Darunter steht der **Update-Preflight**: Backup-Alter, offene Reparaturen, ausgefallene Integrationen, fehlende Referenzen und anstehende Updates. Speichert man vor einem Update den Ausgangszustand, zeigt Housekeeper nach dem Update (Versionswechsel) neue Reparaturen, neu ausgefallene Integrationen, neue fehlende Referenzen sowie neue und entfernte Objekte. Beides liest nur; gespeichert wird allein der Ausgangszustand.
- **Zuverlässigkeit**: Die Ansicht **Zuverlässigkeit** (Menü Betrieb) zeigt je Konfigurationseintrag, wie verfügbar seine Entitäten in den letzten 24 Stunden oder 7 Tagen waren, wann mindestens 80 % von ihnen (mindestens drei, mindestens 5 Minuten) gleichzeitig ausfielen und ob das eher nach Cloud oder nach Gerät und Netz aussieht (als Vermutung benannt). Dauerhaft ausgefallene Entitäten werden getrennt gezählt. Housekeeper liest dafür nur den Recorder, im Hintergrund, und merkt sich das letzte Ergebnis (auch nach einem Neustart, ebenso für Last und Datenbank in der Ansicht Recorder): Die Ansicht öffnet sofort mit dem letzten Stand („Stand: vor …“) und rechnet im Hintergrund neu; für einmal geöffnete Zeiträume rechnet Housekeeper alle 30 Minuten vor. Jede Zeile öffnet die Integration; deren Detailseite hat einen Reiter **Zuverlässigkeit** mit den Entitäten, die ausgefallen waren. Darunter listet **Instabile Entitäten** die Entitäten, die immer wieder ausfallen und zurückkommen (instabil ab 3 Ausfällen und 0,5 pro Tag, flatternd ab 1,5 pro Tag), mit Dauer, Tageszeit-Muster und der Zahl der Automationen, die daran hängen. Ausfälle während eines gemeinsamen Ausfalls der Integration zählen für die Integration. Auf der Detailseite einer Entität stehen „flatternd“ oder „instabil“ mit denselben Zahlen in der Diagnose und in den Eckdaten (aus dem zuletzt berechneten Ergebnis; die Detailseite startet nie die Recorder-Abfrage).
- **Last**: Die Ansicht **Recorder** (Menü Betrieb) beginnt mit der **Last**; sie zeigt, welche Entitäten, Integrationen und Ereignisse den Recorder am meisten beschreiben: Zeilen pro Tag und Entität, die lauteste Stunde, „Updates ohne neuen Zustand“ (der Wert blieb gleich, nur Attribute änderten sich; wirklich identische Updates schreibt Home Assistant nicht), die mittlere Attributgröße der letzten 24 Stunden, den geschätzten Lastanteil jeder Integration (eine Hochrechnung in Prozent, keine Messung in Byte) und die häufigsten Ereignistypen. Auffälliges steht mit Zahlen und den Objekten, die daran hängen (Automationen, Template-Sensoren), obenan. Housekeeper liest dafür nur den Recorder, im Hintergrund, merkt sich wie bei der Zuverlässigkeit das letzte Ergebnis (die Ansicht öffnet sofort mit „Stand: vor …“ und rechnet im Hintergrund neu) und ändert keine Recorder-Einstellung; Empfehlungen sind Text. Läuft gerade eine andere Recorder-Abfrage, fragt das Panel selbst erneut an.
- **Recorder-Kosten**: In der Ansicht **Recorder** (Menü Betrieb) stehen unter der Last die **Recorder-Kosten**: welche Entitäten die Datenbank füllen, mit Anteil, Schreibhäufigkeit, Verwendung und einem Vorschlag für einen Recorder-Ausschluss zum Kopieren in die `configuration.yaml`; Housekeeper ändert die Recorder-Konfiguration nicht.
- **Datenbank**: Die Karte **Datenbank** in der Ansicht Recorder prüft den Recorder nur lesend: Größe von Datenbank und WAL-Datei (nur SQLite; die Tagesgröße wird als Zahl notiert und ergibt das Wachstum), doppelte Statistikzeitpunkte, Stunden, die in den Statistiken fehlen, Statistiken, die nicht zur Entität passen (Einheit, State-Class), und Zeiträume von mindestens 10 Minuten ohne einen einzigen Eintrag, getrennt nach Neustart (laut Protokoll von Housekeeper) und Recorder-Lücke. Jeder Befund nennt Zahlen und eine Empfehlung als Text; diese Prüfung repariert und löscht nichts. Die Berechnung startet beim Öffnen der Recorder-Ansicht; Probleme erscheinen danach auch in den Aufgaben der Übersicht.
- **Freigaben**: Der Eintrag **Freigaben** unter Pflegen zeigt, welche Entitäten Assist, Alexa, Google Assistant und HomeKit erreichen können, und nennt Auffälligkeiten: Diagnose-Entitäten, sensible Entitäten (Schlösser, Alarmanlagen, Personen, Tracker, Garagentore; nur als Hinweis), Freigaben für deaktivierte oder verwaiste Entitäten, doppelte Sprachnamen und Webhooks von Integrationen, die es nicht mehr gibt. Housekeeper liest nur Metadaten: Passwörter, Tokens, Ports und Webhook-IDs werden weder gelesen noch angezeigt, nichts wird gespeichert oder geändert. Antwortet eine Quelle nicht, steht „nicht prüfbar“.
- **Aufbau der langen Ansichten**: Zuverlässigkeit, Recorder, Automationen, Richtlinien und Freigaben beginnen mit einer Zeile Kennzahlen (Ampelfarbe, ein Klick springt zum Abschnitt) und gliedern sich in Reiter mit Zähler und Markierung bei Auffälligem; der gewählte Reiter steht in der Adresse (`?tab=`). In den Freigaben zeigt jede Kachel (Assist, Alexa, Google Assistant, HomeKit) per Klick die erreichbaren Entitäten; bei den Richtlinien sind Regeln (Schalter) und Verstöße getrennt.
- **Zeitlich zusammen mit Updates**: Befunde, die zur selben Zeit begannen wie ein Update von Home Assistant oder einer Integration, tragen einen Hinweis „Zeitlich zusammen mit …“, haben eine Kachel und einen Filter „Nach Update neu“ und stehen gruppiert unter Änderungen. Neustarts und Bereinigungspläne erscheinen nur als Gruppe. Es ist ein zeitlicher Zusammenhang, keine Ursache; nur Ereignisse seit dem Ereignisprotokoll zählen.
- **Verlauf eines Geräts**: Der Reiter **Verlauf** im Gerät zeigt entdeckt, in Quarantäne, durch einen Plan deaktiviert, ersetzt oder entfernt und ob es jetzt instabil ist. Entfernt oder vergisst ein Plan ein Gerät, schreibt Housekeeper das ins Logbuch; der Reiter **Entfernte Geräte** unter Wartung listet, was ein Plan entfernt hat, zusammen mit diesem Eintrag, den du öffnen kannst, um einen Grund zu ergänzen.
- **Wartungsfenster (experimentell, standardmäßig aus)**: Unter Wartung führt es der Reihe nach durch Vorab-Prüfung, Ausgangsstand, einen Bereinigungsplan, das Neuladen der betroffenen Integrationen, deinen Neustart und den Vergleich, am Ende mit Bericht als Markdown. Nichts läuft zeitgesteuert, Housekeeper startet Home Assistant nie neu. Es wurde mit simulierten Schritten getestet, aber noch nicht in einer echten Instanz.
- **Merkt sich Listen und Inventarexport**: Sortierung und Filter jeder Liste kommen beim nächsten Besuch zurück (nur in diesem Browser, der Suchtext nicht). In den Befunden lassen sich mehrere per Kontrollkästchen auswählen, gemeinsam ausblenden oder als CSV exportieren. Das Inventar bietet einen geführten Export ausgewählter Objekte als CSV, Markdown oder JSON, mit wählbaren Feldern, Platzhaltern und Vorschau; alles wird im Browser erzeugt. Im Graph fasst Housekeeper ab fünf gleichartigen Blättern an einem Knoten zu „12 × Entität“ zusammen; ein Klick klappt die Gruppe auf.
- **Recorder-Reste löschen** (Nicht verwendet → Verwaiste Statistiken): Reihen auswählen und daraus einen Plan unter Aufräumen erstellen (Vorschau, Bestätigung je ID und Eintippen des Worts), standardmäßig auch mit den gespeicherten Zuständen (das Kästchen lässt sich abwählen). Housekeeper legt vorher ein Home-Assistant-Backup an und löscht nur, wenn es gelingt; Reihen im Energie-Dashboard, bestehende Entitäten und externe Statistiken sind ausgenommen. Prüft danach, dass die Statistik weg ist, und hält den Lauf im Journal fest. Zurück geht es nur über das Backup. Schreibende Aktionen laufen nie gleichzeitig; eine zweite meldet „beschäftigt“.
- **Nachfolger-Vorschläge** beim Verweis-Ersetzen und beim Zählerwechsel: ähnliche aktive Entitäten derselben Domain (und Einheit) als Knöpfe unter dem Feld. Sie füllen nur das Feld, ausgewählt wird nichts automatisch.
- **Wochenbericht**: Unter Änderungen speichert „Wochenbericht“ den Vergleich mit dem Stand von vor etwa einer Woche als Markdown-Datei (neue und behobene Befunde, neue und entfernte Objekte, Statuswechsel, lauteste Entitäten im Recorder, wenn berechnet).
- **Benachrichtigung** (Einstellungen → Benachrichtigungen, standardmäßig aus): meldet in Home Assistant jede neue defekte Referenz einmal; beim Einschalten wird nichts Altes gemeldet.
- **Diagnose-Datei** (Einstellungen → Info): nur Zahlen und Versionen, ohne Namen, IDs oder Attribute, passend für eine Fehlermeldung.
- **Blueprints** (Wartung): Blueprint-Dateien, die niemand nutzt, und Automationen oder Skripte, deren Blueprint fehlt oder nicht lädt. Nur Hinweise.
- **Suche in Listen**: Lange Listen haben ein Suchfeld, auch Automationen (Läufe), Zuverlässigkeit (Integrationen, instabile Entitäten), Recorder (lauteste Entitäten, Befunde, Integrationen), Richtlinien und Freigaben; es erscheint ab sechs Einträgen.
- **Suche und Ansichten**: Das Suchfeld im Menü oben findet Entitäten, Geräte, Integrationen, Automationen und Skripte nach Name, ID, Plattform, Hersteller und Modell; Pfeiltasten und Enter öffnen den Treffer. In den Listen lassen sich Suche, Filter und Sortierung als benannte **Ansicht** speichern (nur in diesem Browser). Die Zuverlässigkeit kann den Zeitraum mit dem davor vergleichen (Prozentpunkte je Integration).
- **Automationen** (Menü Betrieb): zählt alle 15 Minuten die Läufe, die Home Assistant je Automation und Skript kurz vorhält (standardmäßig 5), und merkt sich 60 Tage lang nur Zähler je Tag und die Stelle eines Fehlers, keine Variablen, Daten oder Fehlertexte. Die Ansicht nennt Auffälliges mit den Zahlen dahinter: viele Fehler, abgewiesene Läufe wegen „Already running“ oder `max`, nie erfolgreich, fast immer an einer Bedingung beendet, ungewöhnlich oft oder lange, Fehlerquote nach einem Update (als zeitlicher Zusammenhang) sowie Wartezeiten ab 5 Minuten, Warten ohne Timeout und `continue_on_error`. Ein fehlerfreier Lauf heißt nicht, dass die Automation ihren Zweck erfüllt. Die Liste lässt sich durchsuchen, nach Typ und „mit Fehlern“ filtern und nach Spalten sortieren. Auf der Detailseite einer Automation oder eines Skripts zeigen die Eckdaten Läufe, Fehler, Bedingung, Dauer und die 7-Tage-Balken, der Tab **Läufe** die Einzelheiten. Dazu führt Housekeeper ein kleines Protokoll der Versionswechsel von Home Assistant und benutzerdefinierten Integrationen sowie der Neustarts. Darunter stehen **Konflikte und Schleifen**: zwei Automationen, die dieselbe Entität gegensätzlich steuern (an gegen aus, zwei verschiedene feste Werte) und gemeinsam auslösen können (gleicher Auslöser oder sich überschneidendes Zeitfenster), sowie Ketten aus Auslösern und Aktionen, die über Gruppen, Helfer oder andere Automationen zum Anfang zurückführen. Jeder Fund trägt eine Stufe: „möglich“ (nur die Konfiguration erlaubt es), „beobachtet“ (alle beteiligten Automationen liefen am selben Tag) oder „wiederholt“ (an mindestens 3 von 7 Tagen); gezählt wird je Tag, die Reihenfolge der Läufe ist unbekannt. Housekeeper führt nichts aus und nennt nichts einen sicheren Fehler.
- **Recorder und Energie-Dashboard** zählen in der Auswirkungsanalyse mit: Entitäten des Energie-Dashboards gelten als verwendet, und Entitäten mit Recorder-Verlauf oder Langzeitstatistiken sind markiert. Die Detailseite einer Entität hat eine Karte **Im Recorder** mit vorhandenen Zeilen und Zeiträumen. In der Ansicht **Nicht verwendet** sind beide Reiter sortier- und filterbare Tabellen (Klick auf eine Spaltenüberschrift sortiert; auf dem Handy werden die Zeilen zu Karten): Die Entitäten nennen Domain, Gerät, Bereich, Integration, letzte Änderung, letzte Meldung, seit wann sie beobachtet werden und ob es Langzeitstatistik gibt. Der Reiter **Verwaiste Statistiken** listet Langzeitstatistiken, zu denen es keine Entität mehr gibt. Jede Zeile nennt den **letzten Eintrag** der Statistik, und die Liste lässt sich danach sortieren (neueste oder älteste zuerst); so erkennst du kürzlich verwaiste von längst toten Statistiken. Der Eintrag wird erst beim Öffnen des Reiters gelesen, nicht beim Scan.
- **Veralteter Scan**: Ist der letzte Scan deutlich älter als das Scanintervall, weist die Übersicht darauf hin. **Änderungen** und viele Integrationsprobleme lassen sich durchsuchen und filtern.
- **Lange Listen** sind seitenweise aufgeteilt (Standard 20 pro Seite, wählbar 20/50/100) und lassen sich durchsuchen, filtern und sortieren (Befunde, Batterien, Nicht verwendet, Inventar). Der Export enthält genau die angezeigten Befunde.
- **Weitere Referenzquellen**: Gruppen (Mitglieder) und Helfer wie Template, Ableitung oder Min/Max-Sensor (Quell-Entitäten) werden in Abhängigkeiten und Auswirkungsanalyse berücksichtigt; fehlende Mitglieder und Quellen werden als Befund gemeldet.
- **Deep-Links**: Das Panel unterstützt Adressen wie `/ha-housekeeper?view=findingsNav&filter=orphaned` oder `?object=entity:sensor.x`; die Reparaturhinweise nutzen sie.

### Node-RED-Flows

In Node-RED gebaute Automationen liegen außerhalb von Home Assistant; ohne sie wirken dort genutzte Entitäten und Geräte unbenutzt. Trage unter **Einstellungen → Geräte & Dienste → HA Housekeeper → Konfigurieren** die Node-RED-Adresse ein (bei Bedarf Benutzername und Passwort oder ein Zugriffstoken). Housekeeper liest die Flows dann bei jedem Scan über die Node-RED-Admin-API mit einem Lese-Token und schreibt nie etwas nach Node-RED.

- Jeder aktive Flow-Tab und Subflow wird zum Objekt **Node-RED-Flow**; seine aktiven Knoten verweisen auf das, was sie nutzen. Aufräumen, *Nicht verwendet*, Auswirkung und Abhängigkeitsansicht berücksichtigen sie.
- Felder der Home-Assistant-Knoten, die eine Entität, ein Gerät, einen Bereich, eine Etage oder ein Label nennen, sind **sicher**; fehlt das Ziel, gibt es einen Befund *fehlender Verweis*.
- Entitäts-IDs in Vorlagen, Funktionscode und Regeln sind **wahrscheinlich**, ebenso Geräte-IDs und **Seriennummern** von Geräten (z. B. Lutron-Picos aus `lutron_caseta_button_event`). Das Gerät warnt dann vor dem Deaktivieren oder Entfernen; seine eigenen Entitäten werden nach ihren eigenen Verweisen beurteilt.
- Ist Node-RED nicht erreichbar, gelten die zuletzt gelesenen Flows, und die Übersicht sagt es.

### Abhängigkeitsansicht

Die Abhängigkeitsansicht stellt direkte Beziehungen dar, zum Beispiel:

```text
Integration → besitzt → Gerät → stellt bereit → Entität
Etage → enthält → Bereich → enthält → Gerät
Automation → reagiert auf / prüft / steuert → Entität oder Gerät
```

Jede Beziehung besitzt eine Vertrauensstufe. Explizite Registry- und Konfigurationsbeziehungen gelten als sicher; von Home Assistant zur Laufzeit ermittelte Referenzen werden gesondert gekennzeichnet.

### Befunde, Export und Reparaturhinweise

- Befundliste mit Begründung und Sicherheit der Diagnose; Export als **CSV** oder **JSON** (berücksichtigt den gewählten Filter)
- Schwellwert für nicht verfügbare Entitäten: Unter **Konfigurieren** lässt sich einstellen, nach wie vielen Tagen (Standard 7, `0` = sofort) eine nicht verfügbare Entität als Befund gilt. Kurze Ausfälle, etwa nach einem Neustart, bleiben so unberücksichtigt. Verwaiste Entitäten werden immer sofort gemeldet.
- **Mögliche Duplikate**: Eine nicht funktionierende Entität mit Zahlensuffix (`…_2`), zu der es eine funktionierende Entität derselben Integration mit gleicher Basis-ID gibt, wird als Überbleibsel markiert
- **Ungenutzte Automationen**: lange ausgeschaltet, seit langem nicht ausgelöst oder nie ausgelöst (mit Alter der Automation)
- Automatischer Scan alle 24 Stunden (einstellbar), damit Verlauf und Hinweise aktuell bleiben
- Hinweise unter **Einstellungen → Reparaturen**: höchstens drei zusammengefasste Einträge (verwaiste Entitäten, lange nicht verfügbare Entitäten, Automationen mit fehlenden Referenzen) mit Link ins Panel. Sie sind rein informativ und bieten keine Reparatur an.
- **Diagnosedaten** für Fehlerberichte (Integration → Diagnosedaten herunterladen) enthalten nur Zählwerte, keine Namen oder IDs.

### Sprachen

Panel und Einrichtungsdialog stehen auf Deutsch und Englisch zur Verfügung. Standardmäßig bestimmt die in Home Assistant gewählte Sprache die Sprache des Panels; unter **Einstellungen → Darstellung** lässt sie sich von Hand auf Deutsch oder Englisch festlegen.

## Sicherheitsmodell

- Das Panel ist ausschließlich für Home-Assistant-Administratoren verfügbar.
- Alle Housekeeper-WebSocket-Endpunkte erfordern Administratorrechte.
- Housekeeper bietet Lese- und Scanoperationen an. Auf Wunsch schreibt es in seinen eigenen Speicher und in die Optionen der Integration. Bestätigte Pläne dürfen in Entitäts- und Geräte-Registries schreiben (deaktivieren, entfernen, umbenennen, Bereich oder Label zuweisen), in Automations-, Skript- und Szenen-Dateien, Dashboards im Speichermodus und Energie-Einstellungen, in Recorder-Verlauf und -Statistiken sowie in von Housekeeper angelegte Backups. Das Löschen von Recorder-Daten oder Backups ist in Housekeeper endgültig; bei anderen Aktionen zeigt der Plan, ob sie über das Journal oder nur über ein Home-Assistant-Backup zurückgesetzt werden können.
- `unavailable` wird niemals automatisch mit „verwaist“ gleichgesetzt.
- Deaktivierte Geräte und Integrationen werden von fehlenden Objekten unterschieden.
- `.storage`-Dateien werden nicht direkt bearbeitet.
- Es wird keine Bereinigung automatisch ausgeführt.

Housekeeper schreibt dynamische Templates, YAML-Dashboards, Helfer oder Gruppen nicht als Ersetzungsquellen um und verändert die Recorder-Konfiguration nicht. Wenn eine bestätigte Reparatur gezielt Recorder-Werte überschreibt, nennt die Vorschau die betroffenen Zeilen und verlangt den vollen Schutzmodus sowie ein erfolgreiches Backup.

## Verwendung

**Housekeeper** über die Home-Assistant-Seitenleiste öffnen. Die Übersicht beginnt mit „Was muss ich jetzt tun?“ und zeigt, was sich seit dem letzten Scan geändert hat, dazu Objektzahlen, Befunde und den Zeitpunkt des letzten Scans.

- Eine Kategoriekarte auswählen, um das entsprechend gefilterte Inventar zu öffnen.
- Ein Objekt auswählen: Oben stehen Zustand, Ursache, Gerät, Bereich und das Risiko beim Entfernen, darunter die Tabs Übersicht, Abhängigkeiten, Technische Daten und Attribute, bei Automationen und Skripten zusätzlich **Läufe**, bei Integrationen **Zuverlässigkeit**.
- Unter **Abhängigkeiten** ein Objekt auswählen, um eingehende und ausgehende Beziehungen zu untersuchen. Ein Umschalter wechselt zwischen Liste und Graph (Herkunft und Verwendung über bis zu drei Ebenen, mit „Was bricht beim Entfernen?“); auf kleinen Bildschirmen steht nur die Liste.
- Mit **Neu scannen** den Datenbestand nach Konfigurations- oder Geräteänderungen aktualisieren. Ohne Eingriff scannt Housekeeper automatisch alle 24 Stunden.
- Unter **Einstellungen → Geräte & Dienste → HA Housekeeper → Konfigurieren** lassen sich sechs Werte einstellen: Tage bis eine nicht verfügbare Entität als Befund gilt (Standard 7), Tage bis eine Automation als ungenutzt gilt (Standard 90, `0` = aus), Scanintervall in Stunden (Standard 24, `0` = aus), Schwelle für schwache Batterien in Prozent (Standard 20), Stunden bis eine Entität als „meldet nicht mehr“ gilt (Standard 48, `0` = aus) und Aufbewahrung des Scanverlaufs in Tagen (Standard 30).
- Das Menü oben hat vier direkte Einträge (Übersicht, Befunde, Aufräumen, Reparieren) und drei Gruppen: Pflegen (Wartung, Batterien, Erinnerungen, Richtlinien, Freigaben), Betrieb (Zuverlässigkeit, Automationen, Recorder) und Erkunden (Inventar, Abhängigkeiten, Änderungen, Journal). **Aufräumen** entfernt, was nicht mehr gebraucht wird (Kacheln mit Zahl: Entitäten deaktivieren, Geräte deaktivieren, Quarantäne und Entfernen, Nicht verwendet, Verwaiste Statistiken, Gelöscht); **Reparieren** zeigt die Aufgaben als Kacheln (Sensorfehler bereinigen, Zähler wechseln, Verweise ersetzen, Gerät austauschen); das **Journal** sammelt alle Pläne aus beiden. Die Übersicht beginnt mit einem Statuskopf (Ring, Satz zur Lage, Kennzahlen) und Kacheln „Was möchtest du tun?“, deren Streifen den Zustand zeigen; verfehlte Wartungsziele stehen als Zeilen in „Was muss ich jetzt tun?“. Der **Housekeeping-Status** ist der schlechtere von zwei Werten: Anteil der Objekte ohne Befund und die offenen Aufgaben dieser Liste; mit einer kaputten Integration oder einem verfehlten Ziel steht er nie auf „In Ordnung“.
- **Zurück**: Detailseiten, der Graph und Sprünge über Links haben ein „Zurück zu …“. Der Graph geht Knoten für Knoten zurück und zuletzt zur Seite, von der er geöffnet wurde; Detailseiten öffnen den Tab, den man verlassen hat, Listen springen an die alte Stelle. Die Zurück-Taste des Browsers folgt diesen Schritten noch nicht.

Der erste Scan legt die anfänglichen Beobachtungszeitpunkte fest. Nachfolgende Scans behalten den Beginn einer unveränderten Klassifikation bei und setzen ihn zurück, sobald sich die Klassifikation ändert.

## Aktuelle Einschränkungen

- Housekeeper bereinigt nie automatisch: Jede Änderung braucht einen von dir bestätigten Plan. Vier Dinge sind zu unterscheiden:
  - *Bestätigte Bereinigung*: Jede Änderung läuft nur als bestätigter Plan. Je nach Aktion gehören dazu Deaktivieren, Entfernen, Gerätebereinigung, Verweise ersetzen, Zähler- und Recorder-Reparaturen, Umbenennen, Bereiche oder Labels zuweisen, Automationen löschen, Verlauf kürzen und Housekeeper-Backups löschen.
  - *Rückgängig im Journal*: Housekeeper stellt Registry-Einträge, Verweise und Entitäts-IDs wieder her, solange sie unverändert sind. Ob ein Gerät seine Entitäten zurückbekommt, entscheidet die Integration.
  - *In Housekeeper nicht rückgängig zu machen*: Gelöschte Recorder-Daten und gelöschte Backups sind endgültig; zusammengeführte Recorder-Daten und gekürzter Verlauf lassen sich nur aus dem vor dem Plan angelegten Backup wiederherstellen.
  - *Vollständiger Backup-Restore*: Das erledigt ausschließlich Home Assistant selbst; Housekeeper stellt keine Backups wieder her.
- Housekeeper benötigt Home Assistant 2026.8 oder neuer, weil ein Gerät dort genau einem Config Entry gehört.
- Die Automationsanalyse umfasst die aktuell von Home Assistant geladenen Automationen. Bei ungültigen oder extern verwalteten Automationen können weniger Details verfügbar sein.
- Dynamische Templates lassen sich nicht immer eindeutig einem Ziel zuordnen. Solche Beziehungen werden ohne Laufzeitbeleg niemals als sicher dargestellt.
- Die Abhängigkeitsansicht konzentriert sich auf direkte Konfigurationsbeziehungen. Recorder-Verlauf und -Statistiken werden erkannt und gezählt, ihre Inhalte aber nicht als Referenzen interpretiert. Nicht lesbare oder automatisch erzeugte Dashboards können ebenfalls unsichtbar bleiben; die Auswirkungsanalyse ist ein Hinweis, keine Garantie.
- Mögliche Duplikate und ungenutzte Automationen beruhen auf Heuristiken und sind Hinweise, keine Gewissheit.

## Änderungsprotokoll

Die Versionshinweise auf Deutsch und Englisch stehen in [CHANGELOG.md](CHANGELOG.md).

## Haftungsausschluss

HA Housekeeper ist ein privat entwickeltes, kostenloses Open-Source-Projekt und wird
ohne Gewährleistung oder Garantie bereitgestellt. Die Nutzung erfolgt auf eigene
Verantwortung; insbesondere kann keine Garantie für einen fehlerfreien Betrieb sowie
für die Richtigkeit, Vollständigkeit, Verfügbarkeit oder den dauerhaften Erhalt von
Konfiguration und Daten übernommen werden. **Housekeeper kann Einträge, Dateien und
Statistiken in deiner Home-Assistant-Installation ändern oder entfernen. Lege daher
vor jedem Aufräumen ein Home-Assistant-Backup an und erstelle regelmäßig unabhängige
Backups, auch außerhalb des Home-Assistant-Systems.**

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).
Copyright 2026 Roberto / bertel2020.
