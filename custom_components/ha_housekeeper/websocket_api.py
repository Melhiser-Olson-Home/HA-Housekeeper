"""WebSocket API for the HA Housekeeper panel."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

from . import (
    area_assign,
    counter_repair,
    rename,
    ws_automations,
    ws_care,
    ws_recorder,
)
from . import refactor as refactor_module
from .audit_report import build_report
from .automation_delete import preview as preview_automation_delete
from .backup_cleanup import KEEP_DAYS, KEEP_LAST, MAX_DAYS, MAX_LAST, list_backups
from .cleanup import (
    ACTION_KINDS,
    AREA_KINDS,
    DELETE_AUTOMATION_KINDS,
    DELETE_BACKUP_KINDS,
    LABEL_KINDS,
    MAX_ACTIONS,
    MAX_MERGE,
    METER_KINDS,
    METER_MODES,
    RECORDER_CHOICES,
    REFACTOR_KINDS,
    REFERENCE_KINDS,
    RENAME_KINDS,
    REPAIR_KINDS,
    TRIM_KINDS,
    attach_history,
    build_plan,
    counter_key,
    device_fingerprint,
    device_support,
    history_ids,
    merge_requests,
    plan_summary,
    public_plan,
    refactor_key,
    registry_fingerprint,
    trim_is_plain,
)
from .cleanup_exec import CleanupError, entity_restorable
from .const import CONF_NODERED_PASSWORD, CONF_NODERED_TOKEN, DOMAIN, OPTION_LIMITS
from .device_pairs import pair_devices
from .history import PinError
from .ignored import KINDS as IGNORE_KINDS
from .ignored import REASON_LIMIT as IGNORE_REASON_LIMIT
from .inventory import InventoryScanner
from .meter import prepare_meter
from .protection import MODES as PROTECTION_MODES
from .recorder_purge import MAX_IDS as PURGE_MAX_IDS
from .recorder_purge import TRIM_MAX_DAYS, TRIM_TABLES, count_history, count_older, count_trim
from .references import preview_replacement
from .window import SKIPPABLE, STEPS, WindowError, reload_targets
from .writelock import WriteBusy, acquire_write, release_write, write_holder
from .ws_common import (
    _scanner,
    _versioned,
    scanner_plans,
    with_scanner,
)


async def _send_inventory_result(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    *,
    refresh: bool,
) -> None:
    """Send inventory data or a useful, admin-only scanner error."""
    scanner = _scanner(hass)
    if scanner is None:
        connection.send_error(msg["id"], "not_loaded", "HA Housekeeper is not loaded")
        return
    # A scan in the middle of a plan would record intermediate states in the history, the
    # observations and the repairs hints. The runner scans for its own verification directly.
    if (refresh or scanner.snapshot is None) and scanner.cleanup.running:
        connection.send_error(msg["id"], "cleanup_busy", "A cleanup plan is running")
        return
    try:
        result = await (scanner.async_scan() if refresh else scanner.async_get_snapshot())
    except Exception as err:
        connection.send_error(msg["id"], "scan_failed", f"{type(err).__name__}: {err}")
        return
    connection.send_result(msg["id"], _versioned(result))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/inventory"})
@websocket_api.async_response
async def websocket_inventory(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the last inventory, scanning on first use."""
    await _send_inventory_result(hass, connection, msg, refresh=False)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/scan"})
@websocket_api.async_response
async def websocket_scan(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Run and return a fresh inventory scan."""
    await _send_inventory_result(hass, connection, msg, refresh=True)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/status"})
@callback
@with_scanner
def websocket_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Return scan progress without triggering work."""
    connection.send_result(msg["id"], _versioned({**scanner.status, "writing": write_holder(hass)}))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/detail",
        vol.Required("object_type"): str,
        vol.Required("object_id"): str,
    }
)
@callback
@with_scanner
def websocket_detail(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Return attributes and automation structure of one inventory object."""
    details = scanner.get_details(msg["object_type"], msg["object_id"])
    if details is None:
        connection.send_error(msg["id"], "not_found", "Object not found in the latest scan")
        return
    connection.send_result(msg["id"], details)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/history_series"})
@websocket_api.async_response
@with_scanner
async def websocket_history_series(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Totals per day from the scan history, for the sparklines. Reads only."""
    connection.send_result(msg["id"], scanner.history.series())


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/scan_point",
        vol.Required("action"): vol.In(["save", "delete"]),
        vol.Optional("name", default=""): str,
        vol.Optional("baseline"): str,
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_scan_point(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Keep the latest scan as a named comparison point, or delete one. Only Housekeeper's history."""
    try:
        if msg["action"] == "save":
            scanner.history.pin(await scanner.async_get_snapshot(), msg["name"])
        else:
            scanner.history.unpin(msg.get("baseline", ""))
    except PinError as err:
        connection.send_error(msg["id"], "invalid_format", f"Not accepted: {err}")
        return
    connection.send_result(msg["id"], _versioned({"baselines": scanner.history.baselines()}))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/compare", vol.Optional("baseline", default="previous"): str}
)
@websocket_api.async_response
@with_scanner
async def websocket_compare(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Compare the latest scan with an earlier one."""
    try:
        snapshot = await scanner.async_get_snapshot()
    except Exception as err:
        connection.send_error(msg["id"], "scan_failed", f"{type(err).__name__}: {err}")
        return
    connection.send_result(msg["id"], scanner.history.compare(snapshot, msg["baseline"]))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/ignore",
        vol.Required("finding_key"): str,
        vol.Required("ignored"): bool,
        vol.Optional("kind", default="ignore"): vol.In(IGNORE_KINDS),
        vol.Optional("reason", default=""): vol.All(str, vol.Length(max=IGNORE_REASON_LIMIT)),
        vol.Optional("days"): vol.All(int, vol.Range(min=1, max=3650)),
    }
)
@callback
@with_scanner
def websocket_ignore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Hide, keep or put off one finding, or show it again. Only Housekeeper's own list changes."""
    if msg["ignored"]:
        if msg["kind"] == "keep" and not msg["reason"].strip():
            connection.send_error(msg["id"], "reason_required", "Keeping a finding needs a reason")
            return
        if msg["kind"] == "snooze" and "days" not in msg:
            connection.send_error(msg["id"], "days_required", "Putting a finding off needs days")
            return
    if not scanner.set_finding_ignored(
        msg["finding_key"],
        msg["ignored"],
        kind=msg["kind"],
        reason=msg["reason"],
        days=msg.get("days"),
        by=connection.user.id if connection.user else None,
    ):
        connection.send_error(msg["id"], "not_found", "Finding not found in the latest scan")
        return
    connection.send_result(msg["id"], {"ignored": msg["ignored"]})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/set_options",
        **{
            vol.Optional(key): vol.All(int, vol.Range(min=low, max=high))
            for key, (low, high) in OPTION_LIMITS.items()
        },
    }
)
@callback
def websocket_set_options(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Change Housekeeper's own options. The entry reloads afterwards to apply them."""
    scanner = _scanner(hass)
    if write_holder(hass) or (scanner is not None and scanner.cleanup.running):
        # The reload would drop the running plan's runner and journal while it still writes.
        connection.send_error(msg["id"], "busy", "A plan, undo or purge is running")
        return
    entries = hass.config_entries.async_entries(DOMAIN)
    changes = {key: msg[key] for key in OPTION_LIMITS if key in msg}
    if not entries or not changes:
        connection.send_error(msg["id"], "invalid_format", "Nothing to change")
        return
    entry = entries[0]
    options = {**entry.options, **changes}
    if options != dict(entry.options):
        hass.config_entries.async_update_entry(entry, options=options)
    secret = (CONF_NODERED_PASSWORD, CONF_NODERED_TOKEN)  # never sent to the browser
    connection.send_result(
        msg["id"], {"options": {k: v for k, v in options.items() if k not in secret}}
    )


async def _plan_from_requests(
    hass: HomeAssistant,
    snapshot: dict[str, Any],
    requests: list[dict[str, Any]],
    refactor_enabled: bool = False,
) -> dict[str, Any]:
    """Judge ``requests`` against the snapshot and the live registries: a plan, not yet journaled."""
    registry = er.async_get(hass)

    def fingerprint(object_id: str) -> str | None:
        entry = registry.async_get(object_id)
        return registry_fingerprint(entry) if entry else None

    def restorable(object_id: str) -> bool | None:
        return entity_restorable(hass, registry.async_get(object_id))

    devices = dr.async_get(hass)

    def device_info(device_id: str) -> tuple[str | None, dict[str, Any]]:
        entry = devices.async_get(device_id)
        return (device_fingerprint(entry), device_support(hass, entry)) if entry else (None, {})

    reference_data = {}
    for action in requests:
        if action["kind"] in REFERENCE_KINDS and action.get("target"):
            pair = (action["object_id"], action["target"])
            if pair not in reference_data and pair[0] != pair[1]:
                reference_data[pair] = await preview_replacement(hass, snapshot, *pair)

    meter_data = {}
    for action in requests:
        if action["kind"] in METER_KINDS and action.get("target"):
            key = (action["object_id"], action["target"], action.get("mode") or "both")
            if key not in meter_data and key[0] != key[1]:
                meter_data[key] = await prepare_meter(hass, key[0], key[1], key[2])

    counter_data = {}
    for action in requests:
        if action["kind"] in REPAIR_KINDS:
            key = counter_key(action)
            if key not in counter_data:
                counter_data[key] = await counter_repair.prepare(
                    hass,
                    key[0],
                    key[1],
                    rng=action.get("range") if action["kind"] == "repair_range" else None,
                )

    label_data = {}
    for action in requests:
        if action["kind"] in LABEL_KINDS:
            entry = er.async_get(hass).async_get(action["object_id"])
            label = lr.async_get(hass).async_get_label(action.get("target") or "")
            label_data[(action["object_id"], action.get("target") or "")] = {
                "exists": entry is not None,
                "label": label.name if label else None,
                "has": entry is not None and (action.get("target") or "") in entry.labels,
                "fingerprint": registry_fingerprint(entry) if entry else None,
            }

    rename_data = {}
    for action in requests:
        if action["kind"] in RENAME_KINDS:
            key = (action["object_id"], action.get("target") or "")
            if key not in rename_data:
                rename_data[key] = await rename.prepare(hass, snapshot, *key)

    area_data = {
        action["object_id"]: area_assign.prepare(
            hass, action["object_id"], action.get("target") or ""
        )
        for action in requests
        if action["kind"] in AREA_KINDS
    }

    backup_data: dict[str, dict[str, Any]] = {}
    if any(a["kind"] in DELETE_BACKUP_KINDS for a in requests):
        listing = await list_backups(hass, scanner_plans(hass), datetime.now(UTC))
        backup_data = {r["backup_id"]: r for r in listing["rows"]}
    delete_data: dict[str, dict[str, Any]] = {}
    for action in requests:
        if action["kind"] in DELETE_AUTOMATION_KINDS:
            delete_data[action["object_id"]] = await preview_automation_delete(
                hass, snapshot, action["object_id"]
            )

    trim_data: dict[tuple[str, int], dict[str, Any] | None] = {}
    plain_trims = [a for a in requests if a["kind"] in TRIM_KINDS and trim_is_plain(a)]
    for days in {a["keep_days"] for a in plain_trims if a.get("keep_days")}:
        found = await count_older(
            hass, [a["object_id"] for a in plain_trims if a.get("keep_days") == days], days
        )
        for a in plain_trims:
            if a.get("keep_days") == days:
                trim_data[(a["object_id"], days)] = (
                    None if found is None else found.get(a["object_id"])
                )
    for a in requests:  # statistics or a stretch of states: counted one by one
        if a["kind"] in TRIM_KINDS and not trim_is_plain(a):
            trim_data[(a["object_id"], a.get("keep_days") or 0)] = await count_trim(
                hass,
                a["object_id"],
                a.get("keep_days"),
                a.get("range"),
                a.get("tables") or ["states"],
            )

    def statistic_exists(statistic_id: str) -> bool:
        return registry.async_get(statistic_id) is not None or hass.states.get(statistic_id)

    refactor_data = {}
    for action in requests:
        if action["kind"] in REFACTOR_KINDS and refactor_enabled:
            fix, values = action.get("fix") or "", action.get("values") or {}
            key = refactor_key(action["object_id"], fix, values)
            if key not in refactor_data:
                refactor_data[key] = await refactor_module.preview(
                    hass, snapshot, action["object_id"], fix, values
                )

    plan = build_plan(
        snapshot,
        requests,
        datetime.now(UTC),
        fingerprint,
        restorable,
        device_info=device_info,
        reference_data=reference_data,
        meter_data=meter_data,
        statistic_exists=statistic_exists,
        refactor_data=refactor_data,
        refactor_enabled=refactor_enabled,
        counter_data=counter_data,
        label_data=label_data,
        area_data=area_data,
        rename_data=rename_data,
        trim_data=trim_data,
        backup_data=backup_data,
        delete_data=delete_data,
    )
    await _add_history(hass, snapshot, plan)
    return plan


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/plan_create",
        vol.Required("actions"): vol.All(
            [
                {
                    vol.Required("kind"): vol.In(sorted(ACTION_KINDS)),
                    vol.Required("object_id"): str,
                    vol.Optional("target"): str,
                    vol.Optional("mode"): vol.In((*METER_MODES, *counter_repair.RANGE_MODES)),
                    vol.Optional("range"): {
                        vol.Required("from"): vol.Coerce(float),
                        vol.Required("to"): vol.Coerce(float),
                        vol.Optional("fixed"): vol.Coerce(float),
                    },
                    vol.Optional("states"): bool,
                    vol.Optional("keep_days"): vol.All(int, vol.Range(min=1, max=TRIM_MAX_DAYS)),
                    vol.Optional("tables"): vol.All([vol.In(TRIM_TABLES)], vol.Length(min=1)),
                    vol.Optional("recorder"): vol.In(RECORDER_CHOICES),
                    vol.Optional("fix"): vol.In(refactor_module.FIXES),
                    vol.Optional("values"): {
                        vol.Optional("description"): vol.All(
                            str, vol.Length(max=refactor_module.DESCRIPTION_MAX)
                        ),
                        vol.Optional("timeout"): vol.All(
                            int, vol.Range(min=1, max=refactor_module.TIMEOUT_MAX)
                        ),
                        vol.Optional("continue_on_timeout"): bool,
                        vol.Optional("mode"): vol.In(refactor_module.MODES),
                        vol.Optional("max"): vol.All(
                            int, vol.Range(min=2, max=refactor_module.MAX_RUNS)
                        ),
                    },
                }
            ],
            vol.Length(min=1, max=MAX_ACTIONS),
        ),
        # Asked for after the small backup failed: back up as the automatic backup settings say.
        vol.Optional("full_backup", default=False): bool,
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_plan_create(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Create a dry-run cleanup plan from the latest scan. Nothing is changed or executed."""
    if scanner.warming_up:
        connection.send_error(msg["id"], "warming_up", "Home Assistant is still starting")
        return
    try:
        snapshot = await scanner.async_get_snapshot()
    except Exception as err:
        connection.send_error(msg["id"], "scan_failed", f"{type(err).__name__}: {err}")
        return
    plan = await _plan_from_requests(hass, snapshot, msg["actions"], scanner.refactor.enabled)
    if msg["full_backup"]:
        plan["full_backup"] = True
    scanner.journal.add(plan)
    connection.send_result(msg["id"], _versioned(public_plan(plan)))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/plan_merge",
        vol.Required("plan_ids"): vol.All([str], vol.Length(min=2, max=MAX_MERGE)),
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_plan_merge(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Build one new plan from several open previews and drop those previews. Executes nothing."""
    if scanner.warming_up:
        connection.send_error(msg["id"], "warming_up", "Home Assistant is still starting")
        return
    ids = list(dict.fromkeys(msg["plan_ids"]))
    plans = [scanner.journal.get(i) for i in ids]
    if len(ids) < 2 or any(p is None for p in plans):
        connection.send_error(msg["id"], "not_found", "Two or more known plans are needed")
        return
    if any(p.get("executed") or p.get("run") for p in plans):
        connection.send_error(msg["id"], "plan_not_open", "Only open previews can be merged")
        return
    requests, conflicts, dropped = merge_requests(plans)
    if not requests:
        connection.send_error(msg["id"], "nothing_to_merge", "Nothing is left after the conflicts")
        return
    if len(requests) > MAX_ACTIONS:
        connection.send_error(msg["id"], "too_many", f"At most {MAX_ACTIONS} actions in one plan")
        return
    try:
        snapshot = await scanner.async_get_snapshot()
    except Exception as err:
        connection.send_error(msg["id"], "scan_failed", f"{type(err).__name__}: {err}")
        return
    plan = await _plan_from_requests(hass, snapshot, requests, scanner.refactor.enabled)
    plan["events"].append({"at": datetime.now(UTC).isoformat(), "type": "merged", "plans": ids})
    scanner.journal.add(plan)
    for plan_id in ids:
        scanner.journal.remove(plan_id)
    connection.send_result(
        msg["id"],
        _versioned(
            {
                "plan": public_plan(plan),
                "merged": ids,
                "conflicts": conflicts,
                "dropped": dropped,
            }
        ),
    )


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/plan_list"})
@callback
@with_scanner
def websocket_plan_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Return the journal of plans as short entries, newest first; details come per plan."""
    connection.send_result(
        msg["id"],
        _versioned(
            {
                "plans": [plan_summary(p) for p in scanner.journal.plans],
                "purges": scanner.journal.purges,
            }
        ),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/plan_detail", vol.Required("plan_id"): str}
)
@callback
def websocket_plan_detail(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return one plan for display, without the data only the server needs to undo it."""
    scanner = _scanner(hass)
    plan = scanner.journal.get(msg["plan_id"]) if scanner else None
    if scanner is None or plan is None:
        connection.send_error(msg["id"], "not_found", "Plan not found")
        return
    connection.send_result(msg["id"], _versioned(public_plan(plan)))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/plan_report",
        vol.Required("plan_id"): str,
        vol.Optional("anonymize", default=True): bool,
        vol.Optional("lang", default="en"): vol.In(["de", "en"]),
    }
)
@callback
def websocket_plan_report(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the audit report of one plan as Markdown; IDs are anonymized unless asked."""
    scanner = _scanner(hass)
    plan = scanner.journal.get(msg["plan_id"]) if scanner else None
    if scanner is None or plan is None:
        connection.send_error(msg["id"], "not_found", "Plan not found")
        return
    markdown = build_report(plan, anonymize=msg["anonymize"], lang=msg["lang"])
    connection.send_result(
        msg["id"],
        _versioned(
            {
                "filename": f"housekeeper-plan-{plan['plan_id']}.md",
                "anonymized": msg["anonymize"],
                "markdown": markdown,
            }
        ),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/device_pairs",
        vol.Required("old_device_id"): str,
        vol.Required("new_device_id"): str,
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_device_pairs(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Suggest the entities of a new device for those of an old one. Reads only; nothing is chosen."""
    try:
        snapshot = await scanner.async_get_snapshot()
    except Exception as err:
        connection.send_error(msg["id"], "scan_failed", f"{type(err).__name__}: {err}")
        return
    pairs = pair_devices(snapshot, msg["old_device_id"], msg["new_device_id"])
    if pairs is None:
        connection.send_error(msg["id"], "not_found", "Two different known devices are needed")
        return
    connection.send_result(msg["id"], _versioned(pairs))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/plan_delete", vol.Required("plan_id"): str}
)
@callback
@with_scanner
def websocket_plan_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Remove a dry-run entry from Housekeeper's journal."""
    if not scanner.journal.remove(msg["plan_id"]):
        connection.send_error(msg["id"], "not_found", "Plan not found")
        return
    connection.send_result(msg["id"], {"removed": True})


def _cleanup_error(
    connection: websocket_api.ActiveConnection, msg: dict[str, Any], err: CleanupError
) -> None:
    connection.send_error(msg["id"], str(err), f"Cleanup: {err}")


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/plan_confirm",
        vol.Required("plan_id"): str,
        vol.Optional("acknowledged", default=[]): [str],
    }
)
@callback
@with_scanner
def websocket_plan_confirm(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Pick the actions that may run and return a short-lived confirmation token."""
    try:
        result = scanner.cleanup.confirm(msg["plan_id"], msg["acknowledged"], connection.user.id)
    except CleanupError as err:
        _cleanup_error(connection, msg, err)
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/plan_execute",
        vol.Required("plan_id"): str,
        vol.Required("token"): str,
    }
)
@callback
@with_scanner
def websocket_plan_execute(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Start a confirmed plan. It runs in the background; poll ``plan_status``."""
    try:
        scanner.cleanup.start(msg["plan_id"], msg["token"], connection.user.id)
    except CleanupError as err:
        _cleanup_error(connection, msg, err)
        return
    connection.send_result(msg["id"], {"started": True})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/plan_cancel"})
@callback
@with_scanner
def websocket_plan_cancel(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Stop a running plan after the current step."""
    scanner.cleanup.cancel()
    connection.send_result(msg["id"], {"cancelling": scanner.cleanup.running})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/plan_status", vol.Required("plan_id"): str}
)
@callback
def websocket_plan_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return progress and the current state of one plan."""
    scanner = _scanner(hass)
    plan = scanner.journal.get(msg["plan_id"]) if scanner else None
    if scanner is None or plan is None:
        connection.send_error(msg["id"], "not_found", "Plan not found")
        return
    connection.send_result(
        msg["id"],
        _versioned({"progress": scanner.cleanup.status, "plan": public_plan(plan)}),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/plan_undo",
        vol.Required("plan_id"): str,
        vol.Optional("object_ids"): [str],
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_plan_undo(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Re-enable quarantined entities that are still as Housekeeper left them."""
    try:
        result = await scanner.cleanup.undo(msg["plan_id"], msg.get("object_ids"))
    except CleanupError as err:
        _cleanup_error(connection, msg, err)
        return
    connection.send_result(msg["id"], result)


async def _add_history(hass: HomeAssistant, snapshot: dict[str, Any], plan: dict[str, Any]) -> None:
    """Count the recorder rows a plan is about, so the end state can name them (exact, no sizes)."""
    ids = history_ids(plan)
    if ids and snapshot["meta"].get("recorder_available"):
        rows = await count_history(hass, ids)
        if rows is not None:
            attach_history(plan, rows)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/backup_cleanup",
        vol.Optional("keep_last", default=KEEP_LAST): vol.All(int, vol.Range(min=0, max=MAX_LAST)),
        vol.Optional("keep_days", default=KEEP_DAYS): vol.All(int, vol.Range(min=0, max=MAX_DAYS)),
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_backup_cleanup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Housekeeper's own backups with the suggestion of the rule. Reads only."""
    result = await list_backups(
        hass, scanner.journal.plans, datetime.now(UTC), msg["keep_last"], msg["keep_days"]
    )
    connection.send_result(msg["id"], _versioned(result))


def _window_view(scanner: InventoryScanner) -> dict[str, Any]:
    window = scanner.window
    return {"enabled": window.enabled, "state": window.state, "current": window.current()}


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/window"})
@callback
@with_scanner
def websocket_window(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """The maintenance window: whether it is switched on and where it stands. Reads the store only."""
    connection.send_result(msg["id"], _versioned(_window_view(scanner)))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/purge_statistics",
        vol.Required("statistic_ids"): vol.All([str], vol.Length(min=1, max=PURGE_MAX_IDS)),
        vol.Required("states"): bool,
        vol.Required("confirmed"): True,
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_purge_statistics(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Delete the recorder statistics of orphaned entities after a backup. Not undoable."""
    if scanner.warming_up or scanner.cleanup.running or write_holder(hass):
        connection.send_error(
            msg["id"], "busy", "Home Assistant is starting or a plan or purge is running"
        )
        return
    if not scanner.snapshot or not scanner.snapshot["meta"].get("recorder_available"):
        connection.send_error(msg["id"], "no_recorder", "The recorder is not available")
        return
    by = connection.user.id if connection.user else None
    registry = er.async_get(hass)
    ids = list(dict.fromkeys(msg["statistic_ids"]))
    plan = build_plan(
        scanner.snapshot,
        [{"kind": "purge_statistics", "object_id": i, "states": msg["states"]} for i in ids],
        datetime.now(UTC),
        statistic_exists=lambda sid: (
            registry.async_get(sid) is not None or hass.states.get(sid) is not None
        ),
    )
    await _add_history(hass, scanner.snapshot, plan)
    scanner.journal.add(plan)
    legacy = {"entity_exists": "exists"}
    result: dict[str, Any] = {
        "removed": [],
        "skipped": [
            {"id": a["object_id"], "reason": legacy.get(a["reasons"][0], a["reasons"][0])}
            for a in plan["actions"]
            if not a["executable"]
        ],
        "backup": False,
        "states": msg["states"],
        "plan_id": plan["plan_id"],
    }
    runnable = [a["object_id"] for a in plan["actions"] if a["executable"]]
    if runnable:
        try:
            confirmation = scanner.cleanup.confirm(plan["plan_id"], runnable, by)
            scanner.cleanup.start(plan["plan_id"], confirmation["token"], by)
        except CleanupError as err:
            _cleanup_error(connection, msg, err)
            return
        await scanner.cleanup.wait()
        results = {a["object_id"]: a.get("result") or {} for a in plan["actions"]}
        result["removed"] = [i for i in runnable if results[i].get("state") == "done"]
        result["skipped"] += [
            {"id": i, "reason": results[i].get("reason", "not_run")}
            for i in runnable
            if i not in result["removed"]
        ]
        result["backup"] = bool(plan.get("backup"))
        failures = {"backup_unavailable", "no_backup_agent", "backup_failed", "recorder_busy"}
        result["error"] = next(
            (r["reason"] for r in results.values() if r.get("reason") in failures), None
        )
    connection.send_result(msg["id"], _versioned(result))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/window_set",
        vol.Required("action"): vol.In(("enable", "disable", "begin", "advance", "clear")),
        vol.Optional("plan_id"): str,
        vol.Optional("step"): vol.In(STEPS),
        vol.Optional("note", default=""): str,
        vol.Optional("skip", default=False): bool,
    }
)
@callback
@with_scanner
def websocket_window_set(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Switch the window on or off, open it with a plan, take the next step, or close it.

    Taking a step only records it. The plan step needs the plan to have run; the restart step needs
    a restart in the event log after the window began (or an explicit skip).
    """
    window, now = scanner.window, datetime.now(UTC).isoformat()
    try:
        action = msg["action"]
        if action in ("enable", "disable"):
            window.set_enabled(action == "enable")
        elif action == "begin":
            window.begin(now, msg.get("plan_id", ""))
        elif action == "clear":
            window.clear()
        else:
            step = msg.get("step")
            if step is None or window.state is None:
                raise WindowError("out of order")
            if msg["skip"] and step not in SKIPPABLE:
                raise WindowError("not skippable")
            if step == "plan":
                plan = scanner.journal.get(window.state["plan_id"] or "")
                if not plan or not plan.get("executed"):
                    raise WindowError("the plan has not run")
            if step == "restart" and not msg["skip"]:
                started = window.state["started_at"]
                if not any(
                    e["kind"] == "start" and e["at"] > started for e in scanner.events.events
                ):
                    raise WindowError("no restart seen yet")
            window.advance(step, now, "skipped" if msg["skip"] else msg["note"])
    except WindowError as err:
        connection.send_error(msg["id"], "invalid_format", f"Not accepted: {err}")
        return
    connection.send_result(msg["id"], _versioned(_window_view(scanner)))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/window_reload",
        vol.Optional("execute", default=False): bool,
    }
)
@websocket_api.async_response
@with_scanner
async def websocket_window_reload(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """List, or with ``execute`` reload, the integrations that the window's executed plan changed."""
    state = scanner.window.state
    plan = scanner.journal.get((state or {}).get("plan_id") or "")
    if state is None or not plan or not plan.get("executed"):
        connection.send_error(msg["id"], "invalid_format", "Not accepted: the plan has not run")
        return
    snapshot = await scanner.async_get_snapshot()
    targets = reload_targets(plan, snapshot)
    if msg["execute"]:
        if scanner.window.current() != "reload":
            connection.send_error(msg["id"], "invalid_format", "Not accepted: out of order")
            return
        # A reload changes the running system, so it follows the same rules as a plan: not while
        # Home Assistant starts or another change runs, not in the read-only modes, and it is journaled.
        if scanner.warming_up or scanner.cleanup.running or write_holder(hass):
            connection.send_error(
                msg["id"], "busy", "Home Assistant is starting or a change is running"
            )
            return
        if PROTECTION_MODES.index(scanner.protection.mode) < 2:
            connection.send_error(msg["id"], "protection_mode", "Cleanup: protection_mode")
            return
        try:
            acquire_write(hass, "window")
        except WriteBusy:
            connection.send_error(msg["id"], "busy", "Another change is running")
            return
        try:
            for target in targets:
                try:
                    await hass.config_entries.async_reload(target["entry_id"])
                    target["ok"] = True
                except Exception as err:
                    target["ok"] = False
                    target["error"] = type(err).__name__
                plan["events"].append(
                    {
                        "at": datetime.now(UTC).isoformat(),
                        "type": "integration_reloaded"
                        if target["ok"]
                        else "integration_reload_failed",
                        "object_id": target["entry_id"],
                    }
                )
            scanner.journal.save()
        finally:
            release_write(hass, "window")
    connection.send_result(msg["id"], _versioned({"targets": targets, "executed": msg["execute"]}))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/events"})
@callback
@with_scanner
def websocket_events(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    scanner: InventoryScanner,
) -> None:
    """Return Housekeeper's own event log (version changes, restarts); reads the store only."""
    connection.send_result(
        msg["id"],
        _versioned({"events": scanner.events.recent(), "heartbeat": scanner.events.heartbeat}),
    )


def async_register(hass: HomeAssistant) -> None:
    """Register Housekeeper WebSocket commands."""
    ws_automations.async_register(hass)
    ws_care.async_register(hass)
    ws_recorder.async_register(hass)
    websocket_api.async_register_command(hass, websocket_inventory)
    websocket_api.async_register_command(hass, websocket_scan)
    websocket_api.async_register_command(hass, websocket_status)
    websocket_api.async_register_command(hass, websocket_detail)
    websocket_api.async_register_command(hass, websocket_compare)
    websocket_api.async_register_command(hass, websocket_scan_point)
    websocket_api.async_register_command(hass, websocket_history_series)
    websocket_api.async_register_command(hass, websocket_ignore)
    websocket_api.async_register_command(hass, websocket_set_options)
    websocket_api.async_register_command(hass, websocket_plan_create)
    websocket_api.async_register_command(hass, websocket_plan_merge)
    websocket_api.async_register_command(hass, websocket_plan_list)
    websocket_api.async_register_command(hass, websocket_plan_detail)
    websocket_api.async_register_command(hass, websocket_plan_delete)
    websocket_api.async_register_command(hass, websocket_plan_report)
    websocket_api.async_register_command(hass, websocket_device_pairs)
    websocket_api.async_register_command(hass, websocket_plan_confirm)
    websocket_api.async_register_command(hass, websocket_plan_execute)
    websocket_api.async_register_command(hass, websocket_plan_cancel)
    websocket_api.async_register_command(hass, websocket_plan_status)
    websocket_api.async_register_command(hass, websocket_plan_undo)
    websocket_api.async_register_command(hass, websocket_window)
    websocket_api.async_register_command(hass, websocket_window_set)
    websocket_api.async_register_command(hass, websocket_purge_statistics)
    websocket_api.async_register_command(hass, websocket_backup_cleanup)
    websocket_api.async_register_command(hass, websocket_window_reload)
    websocket_api.async_register_command(hass, websocket_events)
