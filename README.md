<p align="center">
  <img src="https://raw.githubusercontent.com/Melhiser-Olson-Home/HA-Housekeeper/main/custom_components/ha_housekeeper/brand/logo.png" alt="HA Housekeeper" width="160">
</p>

<h1 align="center">HA Housekeeper</h1>

<p align="center">
  Maintenance and analysis for Home Assistant: inventory, diagnostics, and dependencies at a glance.
</p>

<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5.svg" alt="HACS Custom"></a>
  <a href="https://www.home-assistant.io/"><img src="https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-18BCF2.svg?logo=home-assistant&logoColor=white" alt="Home Assistant"></a>
  <a href="https://github.com/Melhiser-Olson-Home/HA-Housekeeper/releases"><img src="https://img.shields.io/github/v/release/Melhiser-Olson-Home/HA-Housekeeper?sort=semver&include_prereleases" alt="Release"></a>
  <a href="https://github.com/Melhiser-Olson-Home/HA-Housekeeper/actions/workflows/validate.yml"><img src="https://github.com/Melhiser-Olson-Home/HA-Housekeeper/actions/workflows/validate.yml/badge.svg" alt="Validate"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Melhiser-Olson-Home/HA-Housekeeper" alt="License"></a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/bertel2020"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"></a>
  <a href="https://ko-fi.com/bertel2020"><img src="https://img.shields.io/badge/Ko--fi-support-FF5E5B?logo=ko-fi&logoColor=white" alt="Ko-fi"></a>
  <a href="https://paypal.me/RobertoMartins"><img src="https://img.shields.io/badge/PayPal-donate-00457C?logo=paypal&logoColor=white" alt="PayPal"></a>
</p>

<p align="center"><em><a href="https://github.com/Melhiser-Olson-Home/HA-Housekeeper/blob/main/README.de.md">Deutsche Version</a></em></p>

> **This is a fork** of [bertel2020/HA-Housekeeper](https://github.com/bertel2020/HA-Housekeeper) by Roberto (bertel2020), maintained by Melhiser-Olson-Home. It adds **[Node-RED flows](#node-red-flows)**: entities and devices your flows use count as used, so cleanup does not suggest disabling them. Fork releases carry a fourth version number on top of the upstream version they are based on (for example `1.3.0.1` is based on `1.3.0`). Please report problems with this fork [here](https://github.com/Melhiser-Olson-Home/HA-Housekeeper/issues), not upstream. The donation links above support the original author.

HA Housekeeper is a maintenance and analysis integration for Home Assistant. It creates a clear inventory of your installation, explains suspicious or orphaned objects, and shows how entities, devices, integrations, areas, and automations depend on each other.

The goal is not aggressive automatic cleanup. Housekeeper helps you understand what exists, why something is considered problematic, and what a cleanup or repair would affect before you confirm it.

> Housekeeper reads and analyzes first. It changes something only after you explicitly confirm a plan. Plans cover quarantine and removal, repairs, replacing references, renaming entities, assigning areas, deleting unused automations, trimming recorder history and other maintenance tasks. Depending on the action, Housekeeper requires a quarantine period, an additional confirmation and a successful backup. Reversible changes can be undone while their targets remain unchanged; irreversible recorder and backup deletions are clearly marked. Integrations and hubs are never modified, and Housekeeper changes only what a confirmed plan names.

## Screenshots

<p align="center">
  <img src="screenshots/showcase-en/overview-desktop-light.png" alt="Housekeeping overview" width="100%">
</p>

| Findings | Repair |
| --- | --- |
| ![Findings](screenshots/showcase-en/findings-desktop-light.png) | ![Repair](screenshots/showcase-en/repair-desktop-light.png) |

| Tidy up | Dependency path |
| --- | --- |
| ![Tidy up](screenshots/showcase-en/cleanup-desktop-light.png) | ![Dependency path](screenshots/showcase-en/graph-desktop-light.png) |

| Automations in operation | Reliability |
| --- | --- |
| ![Automations in operation](screenshots/showcase-en/runs-desktop-light.png) | ![Reliability](screenshots/showcase-en/reliability-desktop-light.png) |

<p align="center">
  <img src="screenshots/showcase-en/recorder-desktop-light.png" alt="Recorder analysis" width="100%">
</p>

<details>
<summary>Dark mode</summary>

| Overview | Dependency path | Reliability |
| --- | --- | --- |
| ![Overview in dark mode](screenshots/showcase-en/overview-desktop-dark.png) | ![Dependency path in dark mode](screenshots/showcase-en/graph-desktop-dark.png) | ![Reliability in dark mode](screenshots/showcase-en/reliability-desktop-dark.png) |

</details>

## What Housekeeper does

| Task | Behavior |
| --- | --- |
| **Inventory** | Entities, devices, integrations, areas, floors, labels, and automations with search, filters, and sorting |
| **Diagnostics** | Distinguishes active, unavailable, unknown, disabled, and orphaned objects, each with a reason |
| **Observation time** | Stores since when Housekeeper has observed a classification |
| **Automation analysis** | Triggers, conditions, actions, blueprints, and missing references; likewise for scripts, scenes, dashboards, groups, and helpers |
| **Scan comparison** | New and resolved findings, status changes, new and removed objects since the last scan |
| **Cleanup hints** | Possible duplicates, unused automations, low batteries |
| **Sensors and hints** | Counters as sensors, aggregated repair hints, findings export as CSV/JSON and inventory export as CSV/Markdown/JSON |
| **Dependencies** | Relationships between integration, device, entity, area, and automation with a confidence level |
| **Safety** | Administrators only; server-side protection modes, previews and explicit confirmation; backup, verification and undo where the action supports them |

## Why HA Housekeeper?

Mature Home Assistant installations often accumulate registry entries, unavailable entities, replaced devices, old statistics, and automation references that are difficult to assess safely. A missing state alone does not explain whether an entity was intentionally disabled, whether its integration is disabled, or whether the underlying device no longer exists.

Housekeeper combines registry data and the live Home Assistant runtime to provide that context in one administrator-only panel.

## Installation

### Via HACS (recommended)

[![Open the HACS repository in My Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Melhiser-Olson-Home&repository=HA-Housekeeper&category=integration)
[![Add HA Housekeeper to My Home Assistant](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=ha_housekeeper)

1. Use the first button to open the Housekeeper repository in HACS.
2. Download **HA Housekeeper** and restart Home Assistant.
3. **Add the integration** (important): use the second button, or open
   **Settings → Devices & services → Add integration → HA Housekeeper** in
   Home Assistant and finish the dialog. Downloading in HACS alone is not enough;
   without this step no sidebar entry appears.
4. Then open **Housekeeper** in the sidebar while signed in as an administrator.

If the first button does not work, add
`https://github.com/Melhiser-Olson-Home/HA-Housekeeper` in HACS under **Integrations →
Custom repositories** with the category **Integration**.

This fork is not in the default HACS store, so the first button registers it as a
custom repository. The HA Housekeeper in the default store is the original version,
without Node-RED support.

### Manual

Copy the `custom_components/ha_housekeeper` directory to
`/config/custom_components/ha_housekeeper` and restart Home Assistant. Then add
the integration as described above.

The resulting directory should look like this:

```text
config/
└── custom_components/
    └── ha_housekeeper/
        ├── __init__.py
        ├── manifest.json
        └── ...
```

## Features

### Installation overview

- Inventory of entities, devices, integrations/config entries, areas, floors, labels, and automations
- Search by name, object ID, unique ID, platform, or integration
- Filter by object type and status
- Sortable and paginated inventory for larger installations
- Summary of object counts and current findings

### Entity and device diagnostics

Housekeeper distinguishes between:

- an active entity with a current state
- an entity reporting `unknown`
- an entity reporting `unavailable`
- an intentionally disabled entity
- an entity belonging to a disabled device
- an entity belonging to a disabled integration
- an entity whose device no longer exists in the device registry
- an entity whose config entry no longer exists
- a registry entity that no longer has a state

For every continuously observed classification, Housekeeper stores when it first detected that condition. This timestamp is explicitly presented as a **first Housekeeper observation**, not as an invented deletion or failure date.

### Automation analysis

- Lists loaded automations and their current state
- Shows mode, concurrency limits, last trigger time, and blueprint origin
- Displays triggers, conditions, and actions in the detail view; the **Flow** tab shows them as a tree (if/then, repeats, parallel steps) with a plain sentence per step, clickable entities, and steps with missing objects or findings marked red
- Extracts entity, device, area, floor, and label references
- Includes references detected by the Home Assistant runtime, including many template references
- Detects references whose target no longer exists
- Retains the precise configuration location for explicit references when available
- Scripts, scenes and dashboards are checked for references and missing targets in the same way; the detail page shows under **Impact of removal** what a removal would affect (analysis only, no changes)

### Changes since the last scan

The **Changes** view compares the current state with the previous scan or with the last scan of each earlier day (kept for 30 days by default, adjustable from 1 to 365 under Settings, with a timeline of the stored scans): status changes (worsened first), new and resolved findings, and new and removed objects. You can add your own dated notes to the timeline. The history is stored compactly in Home Assistant and contains only statuses and IDs; notes contain the text and optional target you enter.

### More views and sources

- **Hide findings**: a finding can be hidden on the detail page (only in Housekeeper's own list, Home Assistant stays untouched). Alternatively the label `housekeeper_ignore` on an entity or automation hides its findings. Housekeeper does not create this label automatically: create it once in Home Assistant under **Settings → Areas, labels & zones → Labels**, using the exact name `housekeeper_ignore`, and assign it to the object you want Housekeeper to ignore. Hidden findings do not count in the overview, sensors, or repair hints and can be shown again with **Show hidden**. When hiding you choose the kind: **Hidden**, **Kept on purpose** (a reason is required) or **Remind me later**, optionally with a duration (7, 30, 90 or 365 days). When the time runs out the finding returns to the list, marked **Due again** and filterable. The reason and the time show in the list of hidden findings.
- **Marks**: On the detail page (Relations tab) of a device or entity you tell Housekeeper what to expect: **Offline on purpose**, **Seasonal**, **Spare device**, **Being replaced** (with a target) or **Do not remove**, with a reason and optionally a review date (30, 90, 180 or 365 days). A mark hides “not available” on that object (on a device: on its entities), never a broken reference. **Do not remove** blocks every cleanup step on the object. After the review date the findings come back, marked as due. Marks live only in Housekeeper.
- **Finding status**: Known (with a reason), Snoozed (with a date) and Hidden; New, In work (a plan is running or open) and Fixed lately are added automatically. The list filters by it, and the selection marks several findings as known or snoozes them at once. A possible duplicate offers “Not a duplicate”.
- **What you can do**: On the detail page a card sums up what is possible for the object: decide findings, replace, plan a disable, add a label. Everything only opens a preview under Cleanup.
- **Refactoring hints** (read only) for automations: device triggers, long delays and branches that can never apply. A refactoring assistant that rebuilds automations with a preview and an undo is experimental and off by default.
- **Impact**: Every finding has an impact (**high**, **medium**, **low**, **none**) with the reasons behind it, for example “used by 3 active automations” or “controls 1 critical object”. Objects are critical when they carry the label `housekeeper_critical` (on an entity, device or area), or are locks, alarm panels, valves, sirens, garage doors and gates, or sensors for smoke, gas, carbon monoxide, water and safety. The findings list sorts by impact by default, then by certainty of the diagnosis, and can be filtered by it. There is no numeric score.
- **Cleaning critical objects**: cleanup actions on critical objects (see Impact) ask for a separate confirmation per object, even when nothing else speaks against them. Policy violations can be hidden, kept (with a reason) or put off for later, like findings.
- **Log of deleted statistics**: every deletion of orphaned recorder statistics is noted under Cleanup (time, who, backup, what was deleted and skipped). It cannot be undone, so it is only logged.
- **Exchange device**: Under Cleanup you pick the old and the new device. Housekeeper proposes matching new entities for each old one (device class, unit, area, name) and decides nothing for you: you confirm every pair one by one, and for meters you choose whether references are replaced or the meter history is carried over. The result is an ordinary preview with backup, verification and undo. You disable the old device afterwards with "Disable device".
- **Follow-up, end state and audit report**: After a plan has run, Housekeeper watches for 24 hours whether new broken references, unavailable entities or returning devices appear (**clean** or **regression**; regressions show under "What should I do now?"). The preview shows the expected end state beforehand, and every plan has an audit report as Markdown, with real names and IDs by default, or with placeholders instead (for sharing). Optionally and experimentally (off by default) Housekeeper suggests small mechanical improvements of an automation (add a description, remove exactly identical triggers, add a timeout to wait steps, change mode and limit; afterwards Housekeeper watches for 24 hours whether the automation gets error runs), each as a plan with a diff, a check by Home Assistant, a backup and undo; blueprint automations are never touched. Several open preview plans can be merged into one in the journal; it is judged afresh, and conflicts (the same object asked for in different ways) are named, not decided silently.
- **Automation diagnostics** (tab "Quality" in the runs view): Seven separate views of each automation, deliberately without an overall grade: integrity, reliability, effectiveness, maintainability, restart safety, efficiency and conflicts; "unknown" means there is nothing to judge by yet. Each automation can get **success criteria** (target entities, expected state, time limit, optional hold time, or: a service such as a notification or a script is called by the same run, matched by the run context); Housekeeper then keeps a history of reached and missed criteria per trigger. Criteria missed again and again become a finding and show under "What should I do now?". On request, **coverage** counts which trigger and which branch ran and which never did (off by default; the trace is read briefly in memory, only counters are kept). Two runs can be **compared** (different trigger, branch, end, run time, updates in between). The **test run** explains what an automation would do with the current and your own test states; it never executes anything and marks critical targets such as locks and garage doors.
- **Maintenance goals**: the overview has a card with seven goals you set yourself: at most 0 broken references, at most 10 unavailable entities, backup no older than 36 hours, restore test no older than 90 days, database growth at most 50 MB a day, no weak battery, at most 5 devices without an area. Each goal shows the current value, the limit and whether it is **met**, **missed** or **unknown** (for example while there are too few size samples); "never confirmed" counts as missed. Every goal can be adjusted or switched off. Nothing changes in Home Assistant and the health figure is untouched.
- **Common causes**: when an integration is not loaded, all its entities show as "unavailable". Housekeeper folds that into one cause ("Integration X is not loaded", with state, error text and the affected automations, scripts and dashboards). The same goes for a device with at least three entities that are all down. The block sits above the findings list and in "What should I do now?"; the follow-up findings stay folded until you choose **Show follow-up findings** (the export always includes them). Hidden and marked findings do not count. The health figure is unchanged; this is a hint, not proof.
- **Safety status**: A thin line under the navigation, on every view, shows the last backup, the last change by Housekeeper, whether undo is still possible or only a backup restore, a running operation and a running follow-up. A click opens the matching view. The health card shows "N / 100 healthy" and how many objects are affected; each common cause is a fold with counts per object type and its follow-up findings inside.
- **Recorder data on removal**: When removing entities or devices you choose in the toolbar what happens to their recorder data: **Keep** (default), **Delete statistics** or **Delete statistics and history**. The choice holds for the whole plan. It cannot be undone (only from the backup), so you confirm each removal one by one; it is blocked when the Energy dashboard uses the entity or there is no recorder. The preview names the exact row counts.
- **Protection mode** (Settings → Safety): sets on the server what plans may change: 1 read only, 2 quarantine (disabling only), 3 confirmed changes with backup (no irreversible deletion of recorder data), 4 full maintenance (default, as before). The limit holds for confirming, starting and undoing, not only for buttons in the panel; making plans and every view stay allowed. When the mode is not "full" the safety line says so.
- **Battery forecast** (menu Maintain → Batteries) **and maintenance reminders** (Maintain → Reminders): The forecast estimates from the last five weeks when a battery reaches the limit and groups batteries that fall due in the same two weeks. It promises nothing with too few days or a flat or rising curve. You can record the battery type per device; the 30-day shopping list groups the expected replacements by type, and a detected battery change can be entered in the history. Below it you keep your own reminders (filter, descaling, battery change) with a name, an interval in days and the last date; due ones show in "What do I need to do now?" and fire the event `ha_housekeeper_reminder_due`. Housekeeper changes nothing in Home Assistant for this. In Reliability each entry also shows how often its setup failed lately (counted from the scans).
- **Events for your own automations**: After a scan Housekeeper fires an event on the Home Assistant bus for each new situation: `ha_housekeeper_critical_finding`, `ha_housekeeper_backup_overdue`, `ha_housekeeper_quarantine_expired`, `ha_housekeeper_followup_regression` and `ha_housekeeper_integration_down` and `ha_housekeeper_reminder_due`. Each situation is announced once (silent the first time so the existing state does not fire at once); the data holds ids and numbers only. Housekeeper sends nothing itself; you build the notification in an automation.
- **Statistics and dashboards in the policies**: two rules check the metadata of the long-term statistics (unit no longer convertible, state class does not fit the statistics), five rules check dashboards (navigation to a missing view, disabled entities, doubled cards, more than 200 cards, custom cards without any resource). All are off at first; the statistic values (jumps, resets) are not checked.
- **Sensors**: Housekeeper creates a service device with counters (findings, orphaned and unavailable entities, broken references, possible duplicates, unused automations, low batteries, last scan) for use in dashboards and automations.
- **Batteries**: a dedicated view with all battery entities, lowest values first (low from 20 %, configurable). Sensors that report volts instead of percent do not count as percent batteries but get their own card: Housekeeper guesses the type from the highest voltage of the last weeks (for example a 3 V coin cell, a 1.5 V cell, lithium-ion, 12 V), uses that type's limit and runs the same forecast. The type is shown; it is a guess.
- **Not used**: a view of active entities that appear in no automation, script, scene, group, helper, or readable dashboard (without diagnostic and configuration entities). Entities and orphaned statistics are shown in tables that can be filtered and sorted by column (entities: device, area, integration, last change, last report, observed since; statistics: kind, unit, last entry, Energy dashboard); on a phone they appear as cards. A hint only, not a finding: voice assistants, apps, auto-generated dashboards, and external systems are invisible to Housekeeper.
- **Overview**: below the key figures the **inventory status** shows three groups (Unremarkable, Check, Problematic) with count and share, followed by the findings. Header tiles include small sparklines where a history exists. On the right come the trend, the **Database** card (size, WAL file, retention as set in the recorder of Home Assistant, growth per day; two file sizes only, no table queries), tidy-up and the objects by type. The key facts of an entity show the last state change, the last report and, with long-term statistics, the last statistics entry.
- **Policies (Maintain)**: your own rules for tidiness, switched on one by one and all off at first: entity without an area (only entities of physical devices, without diagnostic, configuration and disabled entities and without service devices), device without an area, automation without a description, battery entity without a device, duplicate display name (per domain), automation without a label (only automations with a registry entry) and naming scheme (one prefix per domain, up to 10, for example `wz_` for `sensor`). Violations are hints and do not count in health, findings, repair hints or sensors. The label `housekeeper_ignore` or **Hide** takes an object out; the switches live only in Housekeeper. Plus the rule “State changes per day” with an adjustable limit (default 5,000); it only reads the last calculated load numbers and never starts a recorder query. More rules: entity id with a trailing number, entity id with a device address (IP, MAC, radio, Zigbee), default name on an automation or script, script without a description or label, device without manufacturer or model, empty area, label without use, automation with more than 10 triggers, exposure without use, sensitive entity exposed, low battery without an automation, entity that writes a lot to the recorder but is unused, and long retention with a big database. These run as heuristics (a hint that can raise false alarms): automation without error handling, literal entity ids in templates, automation triggers itself, and “only ever turned on”.
- **Integrations with problems** appear on the overview, next to a **Hints** card with quick access to batteries, duplicates, unused automations, and unused entities.
- **Settings** (cog on the right of the top menu) with a header band (version, Home Assistant, objects, “Copy info”) and seven tabs: **Appearance**, **Safety**, **Scan and thresholds**, **Notifications**, **Maintenance goals**, **Hidden** and **Info**. Appearance includes language, font size, mode, color scheme, density, animation, start view and entries per page; it is stored in your Home Assistant user profile (and in the browser as well). Safety selects the server-side protection mode. Scan and thresholds contains the scan interval and all diagnostic limits. Saving is possible only after a change, and Housekeeper reloads afterwards.
- **Cleanup**: the **Tidy up** view checks selected orphaned or long-unavailable entities in a dry run: no known use, to review, or blocked (certain use, working entity), including references and a note on long-term statistics. Housekeeper changes nothing at that point. A plan can be explicitly confirmed (type a word) and executed; **disabling** as quarantine (registry entry; history and statistics stay untouched) and, under the conditions below, **removal**, device cleanup, replacing references and the meter change are executable. Blocked entries never run, “to review” only with an individual confirmation. Every step is re-checked first; if an entity changed since the preview, the run aborts. Afterwards Housekeeper verifies the result. Most steps can be undone in the journal while the entity is unchanged; the long-term statistics of a meter change can only be reset with the backup. A quarantine card shows since when an entity has been in quarantine and when a later removal would earliest be possible (14 days). Every plan is in the journal (executed plans stay as the audit trail). **Removal** (deleting the registry entry) is possible only for entities that have been in quarantine for at least 14 days: Housekeeper first creates a Home Assistant backup (Home Assistant only, no apps or folders, no database unless the plan writes into it; locations and encryption as in your automatic backups; it shows up as its own backup “Housekeeper …” and does not count as your regular one), waits for it to complete successfully, and starts nothing otherwise. The registry entry is kept in the journal so a removed entity can be restored while its ID is free and the integration still exists; it is back in quarantine afterwards.
  **Devices** follow the same rules: *Disable* (quarantine) is only possible if no entity of the device works any more, nothing hangs off the device (hubs and coordinators are blocked) and nothing certainly uses it. Housekeeper shows child devices but never cleans them up; a device with child devices counts like a hub. *Remove* uses Home Assistant's official path (the integration is asked and may refuse) and is only possible after 14 days of quarantine and with a backup. *Forget locally* is meant only for integrations that offer no regular removal: Housekeeper removes the registry entry and reloads the integration; the source system (device, hub, cloud) stays unchanged, and if the device shows up again a **Returning devices** card says so. Removing a device also removes its entities; restoring recreates the registry entry from the journal, and whether the integration provides the entities again is up to it. That is why every removal needs an individual confirmation.
  **Replace references** swaps an old entity for a new one wherever it is entered exactly: automations, scripts and scenes (YAML files), storage-mode dashboards and the Energy dashboard. The preview lists the changes per source. Templates, YAML dashboards, helpers and files using `!secret`/`!include` are not changed by Housekeeper but listed for you to adjust by hand. Each source is saved in the journal first (comments in YAML files are lost on writing, as with the Home Assistant editor; undo writes the original file back byte for byte while it is unchanged, otherwise only the changed item), a backup is mandatory, and undo works while the source is still exactly as Housekeeper left it. History and statistics are not moved or merged (the meter change does that).
  **Meter change** joins the history of a replaced meter with the new one. Housekeeper first checks that both statistics fit together (same unit and type) and shows the switch point, gaps, overlaps and the transition of the total in advance. There are three ways: copy the old meter's long-term statistics in front of the new one's and shift the new total by the old final reading (the raw readings of the new meter stay as they are), let the new meter take over the old one's ID (the old one moves to a free `_alt` ID; Home Assistant moves history and statistics along with the ID, and automations and dashboards keep working without rewriting), or both. Existing values are never overwritten: overlapping values of the old meter are not copied. Writing the statistics is experimental, requires the backup and can only be reset with it; the ID takeover can be given back through the journal. Only the hourly long-term statistics are joined, not the raw states and not the short-term statistics of the last days. Afterwards the old meter can go into quarantine.
  **Repair counter glitches** fixes a counter that briefly reported a wrong value (for example a water meter that fell from 91 to 41 m³ for hours). Home Assistant counts the jump back as new consumption and spoils the sum. Housekeeper finds such outliers (readings that break the order and then return, at most 48 hours long; a value that stays low for good, as after a meter replacement, is never touched) and replaces the wrong values in the history, in the 5-minute rows and in the hourly rows, either with the last good value or on a straight line to the next one. The spoiled sum is recalculated. The preview shows the readings before and after and the rows per table. This writes into the recorder database: only in the protection mode "full", with a backup, verified afterwards, and the overwritten values stay in the journal, so everything can be put back as long as nobody changed the rows afterwards. Housekeeper refuses more than 5000 rows in one run, and writes nothing when the database schema is unknown.

  **Clean up a range yourself** also works for an error you spotted yourself, in a counter or a measurement (temperature, power …): choose the sensor and a period (at most 31 days), plus the last good value, a straight line or a fixed value. The preview shows which data still exists for the period (raw history, 5-minute rows, hourly rows) and, per table, row by row the value before and after. For measurements the hourly rows are recalculated from the corrected 5-minute rows; where those are already gone, the hourly row gets the replacement value and counts as an estimate. A counter must not fall, and without a good value before and after nothing is written. You pick the period in the date fields or with two sliders under the sensor's readings (last 1 to 365 days). The check also finds spikes of measurements far outside the usual (for example 85 °C in a room temperature that is normal again afterwards) and fills the period into the form with one click; values within what the sensor reports at other times (power peaks, rain) are never reported. Safety, backup, verification and undo as above; if someone changed single rows after the cleanup, undo puts back all other rows and leaves the changed ones.
- **Guided plans and additional maintenance actions**: Plans lead through selection, setup, preview, confirmation, execution and result. Housekeeper can trim stored states older than 7 to 90 days (statistics stay), delete eligible Housekeeper backups according to a retention rule, and remove an unused automation from `automations.yaml`. These actions show their exact scope first; irreversible deletions are clearly marked. Backup cleanup protects backups of watched plans and the newest backup still needed for undo.
- **Rename and assign**: An entity ID can be renamed together with exact references in automations, scripts, scenes and storage-mode dashboards; the original ID and files remain available for undo while unchanged. Entities and devices without an area can receive one through a plan, with a suggestion from their device or integration.
- **Maintenance**: the **Maintenance** view starts with **Backup protection**: Housekeeper judges whether the backup strategy is sound (age of the latest backup against the schedule, failed runs and targets, local and remote storage, unusual size, retention, encryption, backup before cleanups). Home Assistant cannot detect the emergency kit and a restore test, so you confirm them with a date, and Housekeeper reminds you of the restore test after 180 days. Housekeeper only reads, starts no backup and never restores by itself. Below is the **update preflight**: backup age, open repairs, failed integrations, missing references and pending updates. If you save the starting state before an update, Housekeeper shows after the update (version change) new repairs, newly failed integrations, new missing references and new and removed objects. Both only read; the only thing stored is the starting state.
- **Reliability**: the **Reliability** view (Operation menu) shows for each config entry how available its entities were over the last 24 hours or 7 days, when at least 80 % of them (at least three, for at least 5 minutes) failed together, and whether that looks more like the cloud or like the device and network (named as a guess). Entities that were down all the time are counted apart. Housekeeper only reads the recorder for this, in the background, and remembers the last result (also across a restart, and likewise for load and database in the Recorder view): the view opens at once with the last numbers ("As of …") and recalculates in the background; for windows that were opened once it recalculates every 30 minutes. Every row opens the integration; its detail page has a **Reliability** tab with the entities that were down. Below, **Unstable entities** lists entities that keep failing and coming back (unstable from 3 failures and 0.5 a day, flapping from 1.5 a day), with duration, time-of-day pattern and the number of automations that depend on them. Failures during a shared outage of the integration count for the integration. On an entity's detail page “flapping” or “unstable” appears with the same numbers in the diagnosis and the key facts (from the last calculated result; the detail page never starts the recorder query).
- **Load**: The **Recorder** view (Operation menu) starts with the **load**; it shows which entities, integrations and events write the most to the recorder: rows per day and entity, the busiest hour, “updates without a new state” (the value stayed the same, only attributes changed; truly identical updates are not written by Home Assistant), the mean attribute size of the last 24 hours, the estimated load share of each integration (an extrapolation in percent, not a measurement in bytes) and the most frequent event types. Anything unusual comes first with its numbers and the objects that depend on it (automations, template sensors). Housekeeper only reads the recorder for this, in the background, remembers the last result like reliability does (the view opens at once with “As of …” and recalculates in the background) and changes no recorder setting; recommendations are text. If another recorder query is running, the panel asks again by itself.
- **Recorder costs**: Below the load, the **Recorder** view (Operation menu) shows the **recorder costs**: which entities fill the database, with share, write frequency, use and a suggested recorder exclusion to copy into `configuration.yaml`; Housekeeper does not change the recorder configuration.
- **Database**: The **Database** card in the Recorder view checks the recorder, read only: size of the database and WAL file (SQLite only; the daily size is noted as a number and gives the growth), duplicate statistics timestamps, hours missing from the statistics, statistics that do not fit their entity (unit, state class), and stretches of at least 10 minutes without a single entry, told apart as restart (according to Housekeeper's own log) and recorder gap. Each finding names numbers and a recommendation as text; this check repairs and deletes nothing. The calculation starts when the Recorder view is opened; problems then also appear in the overview tasks.
- **Exposure**: The **Exposure** entry under Maintain shows which entities Assist, Alexa, Google Assistant and HomeKit can reach and names what stands out: diagnostic entities, sensitive entities (locks, alarm panels, persons, trackers, garage doors; a hint only), exposure of disabled or orphaned entities, duplicate voice names and webhooks of integrations that no longer exist. Housekeeper reads metadata only: passwords, tokens, ports and webhook ids are neither read nor shown, and nothing is stored or changed. If a source does not answer, it says "cannot be checked".
- **Layout of the long views**: Reliability, Recorder, Automations, Policies and Exposure start with a row of key figures (traffic-light colour, a click jumps to the section) and are split into tabs with a counter and a mark for anything unusual; the chosen tab is kept in the address (`?tab=`). In Exposure every tile (Assist, Alexa, Google Assistant, HomeKit) shows the entities it reaches on a click; in Policies the rules (switches) and the violations are apart.
- **At about the same time as updates**: findings that began at the same time as an update of Home Assistant or an integration carry a note “At about the same time as …”, have a tile and a filter “New after update” and are grouped under Changes. Restarts and cleanup plans appear only as a group. It is a link in time, not a cause; only events since the event log counts.
- **History of a device**: the **History** tab on a device shows discovered, in quarantine, disabled by a plan, replaced or removed and whether it is unstable now. When a plan removes or forgets a device, Housekeeper writes it into the logbook; the **Removed devices** tab under Maintenance lists what a plan removed together with that entry, which you can open to add a reason.
- **Maintenance window (experimental, off by default)**: under Maintenance it guides you through the check, the starting state, a cleanup plan, the reload of the affected integrations, your restart and the comparison, ending with a Markdown report. Nothing runs on a timer, Housekeeper never restarts Home Assistant. It was tested with simulated steps, not yet in a real instance.
- **Lists remember and inventory export**: sort and filters of every list come back at the next visit (this browser only, not the search text). In Findings you can tick several, hide them together or export them as CSV. The Inventory has a guided export for selected objects as CSV, Markdown or JSON, with selectable fields, placeholders and a preview; everything is generated in the browser. In the graph, five or more alike leaves on one node fold into “12 × Entity”; a click opens the group.
- **Delete recorder leftovers** (Unused → Orphaned statistics): pick series and make a plan under Cleanup (preview, confirmation per ID and typing the word), by default also with the stored states (the box can be switched off). Housekeeper creates a Home Assistant backup first and only deletes if it succeeds; series in the Energy dashboard, existing entities and external statistics are left out. It then checks that the statistic is gone and keeps the run in the journal. Only the backup brings them back. Writing actions never run at the same time; a second one reports busy.
- **Successor hints** when replacing references and on a meter change: similar active entities of the same domain (and unit) as buttons under the field. They only fill the field; nothing is chosen for you.
- **Weekly report**: under Changes, “Weekly report” saves the comparison with the state of about a week ago as a Markdown file (new and resolved findings, new and removed objects, status changes, loudest entities in the recorder when calculated).
- **Notification** (Settings → Notifications, off by default): tells you in Home Assistant about each new broken reference once; switching it on announces nothing old.
- **Diagnostics file** (Settings → Info): numbers and versions only, no names, ids or attributes, fit for an issue.
- **Blueprints** (Maintenance): blueprint files nobody uses, and automations or scripts whose blueprint is missing or fails to load. Hints only.
- **Search in lists**: Long lists have a search box, also Automations (runs), Reliability (integrations, unstable entities), Recorder (loudest entities, findings, integrations), Policies and Exposure; it appears from six entries on.
- **Search and views**: The search box in the top menu finds entities, devices, integrations, automations and scripts by name, ID, platform, manufacturer and model; arrow keys and Enter open the hit. In the lists, search, filters and sort can be saved as a named **view** (in this browser only). Reliability can compare the period with the one before (percentage points per integration).
- **Automations** (Operation menu): every 15 minutes it counts the runs Home Assistant keeps for each automation and script for a short time (5 by default) and remembers for 60 days only counters per day and the place of a failure, no variables, data or error texts. The view names what stands out with the numbers behind it: many errors, runs rejected because of “Already running” or `max`, never successful, almost always ending at a condition, unusually frequent or long, the error rate after an update (as a coincidence in time), and waits of 5 minutes or more, waits without a timeout and `continue_on_error`. A run without an error does not mean the automation does its job. The list can be searched, filtered by type and “with errors” and sorted by column. On the detail page of an automation or script the key facts show runs, errors, condition, duration and the 7-day bars, and the **Runs** tab the details. Housekeeper also keeps a small log of version changes of Home Assistant and custom integrations and of restarts. Below it, **Conflicts and loops** lists two automations that control the same entity in opposite ways (on against off, two different fixed values) and can fire together (same trigger or overlapping time window), and chains of triggers and actions that lead back to the start through groups, helpers or other automations. Each finding has a stage: “possible” (only the configuration allows it), “observed” (all involved automations ran on the same day) or “repeated” (on at least 3 of 7 days); counting is per day, the order of the runs is unknown. Housekeeper runs nothing and never calls anything a certain error.
- **Recorder and Energy dashboard** are part of the impact analysis: entities of the Energy dashboard count as used, and entities with recorder history or long-term statistics are marked. An entity's detail page has an **In the recorder** card with the available rows and periods. In the **Not used** view both tabs are sortable and filterable tables (a click on a column heading sorts; on the phone the rows become cards): the entities name domain, device, area, integration, last change, last report, since when they have been observed and whether there are long-term statistics. The **Orphaned statistics** tab lists long-term statistics that no longer have an entity. Each row names the **last entry** of the statistic and the list can be sorted by it (newest or oldest first), so recently orphaned statistics are easy to tell from long dead ones. The entry is read when the tab is opened, not during a scan.
- **Outdated scan**: if the last scan is clearly older than the scan interval, the overview says so. **Changes** and long lists of integration problems can be searched and filtered.
- **Long lists** are paged (default 20 per page, selectable 20/50/100) and can be searched, filtered, and sorted (findings, batteries, not used, inventory). The export contains exactly the findings shown.
- **More reference sources**: groups (members) and helpers such as template, derivative, or min/max sensors (source entities) are included in dependencies and impact analysis; missing members and sources are reported as findings.
- **Deep links**: the panel supports addresses like `/ha-housekeeper?view=findingsNav&filter=orphaned` or `?object=entity:sensor.x`; the repair hints use them.

### Node-RED flows

Automations built in Node-RED live outside Home Assistant, so on their own they would leave entities and devices looking unused. Enter the Node-RED address under **Settings → Devices & services → HA Housekeeper → Configure** (plus a username and password, or an access token, if the editor needs a login). Housekeeper then reads the flows through the Node-RED admin API with a read-only token on every scan. It never writes to Node-RED.

- Every enabled flow tab and subflow becomes a **Node-RED flow** object. Its enabled nodes link to what they use, like an automation's links do. Cleanup, *Not used*, impact and the dependency view all take them into account.
- Fields of Home Assistant nodes (`api-call-service`, `trigger-state`, `server-state-changed`, `poll-state`, `api-current-state`, …) that name an entity, device, area, floor or label are **certain**. A Node-RED flow that names an entity that no longer exists produces a *missing reference* finding.
- Entity IDs in templates, function code and switch or change rules are **probable**. So are device IDs and **device serial numbers** found there. Event-driven flows (for example Lutron Pico remotes matched by serial from `lutron_caseta_button_event`) then mark the *device* as possibly used, so disabling or removing it shows a warning. The device's own entities are judged by their own links, so unused ones remain candidates.
- If Node-RED cannot be reached, the scan uses the flows from the last successful read and the overview says so. That way an outage never makes Node-RED's uses vanish.
- Replacing references and renaming list Node-RED flows as places to adjust by hand.

### Dependency explorer

The dependency view visualizes direct relationships such as:

```text
Integration → owns → Device → provides → Entity
Floor → contains → Area → contains → Device
Automation → triggers on / checks / targets → Entity or Device
Node-RED flow → triggers on / checks / targets → Entity, Device or Area
```

Each relationship includes a confidence level. Explicit registry and configuration relationships are marked as certain; references inferred by Home Assistant at runtime are identified separately.

### Findings, export, and repair hints

- Findings list with reasons and diagnosis confidence; export as **CSV** or **JSON** (respects the selected filter)
- Threshold for unavailable entities: under **Configure** you choose after how many days (default 7, `0` = immediately) an unavailable entity becomes a finding. Short outages, for example after a restart, are ignored. Orphaned entities are always reported immediately.
- **Possible duplicates**: a non-working entity with a number suffix (`…_2`) for which a working entity of the same integration with the same base ID exists is marked as a leftover
- **Unused automations**: switched off for a long time, not triggered for a long time, or never triggered (using the automation's age); threshold under **Configure** (default 90 days, `0` = off)
- **Automatic scan** every 24 hours (adjustable) keeps the history and repair hints current
- Hints under **Settings → Repairs**: at most three aggregated entries (orphaned entities, long-unavailable entities, automations with missing references) linking to the panel. They are informational only and offer no repair.
- **Diagnostics download** for bug reports (integration → Download diagnostics) contains counts only, no names or IDs.

### Languages

The panel and configuration flow are available in German and English. By default the active Home Assistant language determines the panel language; under **Settings → Appearance** you can set German or English by hand.

## Safety model

- The panel is available to Home Assistant administrators only.
- All Housekeeper WebSocket endpoints require administrator privileges.
- Housekeeper offers read and scan operations. It writes to Housekeeper's own storage and integration options when requested. Confirmed plans may write to entity and device registries (disable, remove, rename, assign an area or label), automation, script and scene files, storage-mode dashboards and Energy settings, recorder history and statistics, and Housekeeper-created backups. Deleting recorder data or backups is irreversible in Housekeeper; other actions document whether journal undo or only a Home Assistant backup can restore them.
- `unavailable` is never treated as automatically orphaned.
- Disabled devices and integrations are distinguished from missing objects.
- No `.storage` file is edited directly.
- No cleanup action runs automatically.

Housekeeper does not rewrite dynamic templates, YAML-mode dashboards, helpers or groups as replacement sources, and it does not change the recorder configuration. Where a confirmed repair intentionally rewrites recorder values, its preview names the affected rows and requires full protection mode and a successful backup.

## Usage

Open **Housekeeper** from the Home Assistant sidebar. The overview starts with a status header (ring, a sentence about the situation, key figures) and tiles “What would you like to do?” whose stripe shows the state, then “What do I need to do now?”, and shows what changed since the last scan, plus object totals, findings, and the time of the last scan.

- Select a category card to open a filtered inventory.
- Select an object: status, cause, device, area, and the risk of removing it are on top, with the tabs Overview, Dependencies, Technical data, and Attributes below, plus **Runs** for automations and scripts and **Reliability** for integrations.
- Open **Dependencies** and select an object to explore incoming and outgoing relationships. A switch toggles between list and graph (origin and users across up to three levels, with “What breaks on removal?”); small screens show only the list.
- Use **Scan now** to refresh the snapshot after configuration or device changes. Without intervention Housekeeper scans automatically every 24 hours.
- Under **Settings → Devices & services → HA Housekeeper → Configure** you can set six values: days until an unavailable entity becomes a finding (default 7), days until an automation counts as unused (default 90, `0` = off), scan interval in hours (default 24, `0` = off), low-battery threshold in percent (default 20), hours until an entity counts as no longer reporting (default 48, `0` = off), and scan-history retention in days (default 30).
- The top menu has four direct entries (Overview, Findings, Clean up, Repair) and three groups: Maintain (Maintenance, Batteries, Reminders, Policies, Exposure), Operation (Reliability, Automations, Recorder) and Explore (Inventory, Dependencies, Changes, Journal). **Clean up** is a row of tiles with a count each: disable entities, disable devices, quarantine and removal, not used, orphaned statistics, deleted.
- **Back**: detail pages, the graph and jumps through links have a “Back to …”. The graph goes back node by node and finally to the page it was opened from; detail pages reopen the tab you left, lists jump back to the old spot. The browser's back button does not follow these steps yet.

The first scan establishes the initial observation timestamps. Later scans preserve the start of an unchanged classification and reset it when the classification changes.

## Current limitations

- Housekeeper never cleans up automatically: every change needs a plan you confirmed. Four things are different:
  - *Confirmed cleanup*: every change runs only as a confirmed plan. Depending on the action this includes disabling, removal, device cleanup, replacing references, meter and recorder repairs, renaming, assigning areas or labels, deleting automations, trimming history and deleting Housekeeper backups.
  - *Undo in the journal*: Housekeeper restores registry entries, references and entity IDs while they are unchanged. Whether a device gets its entities back is up to the integration.
  - *Not undoable in Housekeeper*: deleted recorder data and deleted backups are final; recorder merges and history trimming can only be restored from the backup created before the plan.
  - *Full backup restore*: only Home Assistant itself does that; Housekeeper does not restore backups.
- Housekeeper needs Home Assistant 2026.8 or newer, because a device belongs to exactly one config entry there.
- Automation analysis covers automations currently loaded by Home Assistant. The amount of available detail can vary for invalid or externally managed automations.
- Dynamic templates cannot always be resolved to one definite target. Such relationships are never presented as certain without supporting runtime information.
- The dependency view focuses on direct configuration relationships. Recorder history and statistics are detected and counted, but their contents are not interpreted as references. Unreadable or auto-generated dashboards may also remain invisible; impact analysis is guidance, not a guarantee.
- Possible duplicates and unused automations are based on heuristics and are hints, not certainty.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes in English and German.

## Disclaimer

HA Housekeeper is a privately developed, free open-source project and is provided
without warranty or guarantee. Use is at your own risk; in particular, no guarantee
can be given for error-free operation or for the correctness, completeness,
availability or lasting preservation of configuration and data. **Housekeeper can
change or remove entries, files and statistics in your Home Assistant installation.
Therefore make a Home Assistant backup before every cleanup and make independent
backups regularly, also outside the Home Assistant system.**

## License

This project is released under the [MIT License](LICENSE).
Copyright 2026 Roberto / bertel2020.
