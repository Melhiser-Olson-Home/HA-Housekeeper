"""Read-only Home Assistant inventory scanner."""

from __future__ import annotations

import asyncio
import logging
import time
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from homeassistant.const import __version__ as HA_VERSION
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import floor_registry as fr
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.loader import IntegrationNotFound, async_get_integration, async_get_integrations

from . import followup
from .automation_analysis import (
    is_concrete_id,
    missing_references,
    summarize_automation_config,
    summarize_script_config,
)
from .backup_health import AttestStore, backup_health
from .battery_care import BatteryStore
from .battery_kind import apply_battery_kinds
from .causes import apply_causes
from .cleanup import JournalStore, is_child_device, quarantine_entries, recurring_devices
from .cleanup_exec import CleanupRunner
from .const import (
    DEFAULT_LOW_BATTERY_PERCENT,
    DEFAULT_MIN_UNAVAILABLE_DAYS,
    DEFAULT_SCAN_INTERVAL_HOURS,
    DEFAULT_STALE_HOURS,
    DEFAULT_UNUSED_AUTOMATION_DAYS,
    DOMAIN,
    IGNORE_LABEL,
    NODERED_STORAGE_KEY,
    QUARANTINE_DAYS,
    SIGNAL_SCAN_COMPLETE,
    STORAGE_VERSION,
    WARMUP_SECONDS,
)
from .coverage import CoverageStore
from .criteria import CriteriaStore
from .dashboard_analysis import (
    HELPER_DOMAINS,
    dashboard_health,
    extract_dashboard_references,
    extract_entity_references,
    extract_helper_references,
    view_keys,
)
from .db_health import database_summary
from .entry_states import EntryStateHistory
from .events import EventLog
from .goals import GoalStore
from .history import ScanHistory
from .hygiene import (
    automation_hygiene_findings,
    duplicate_findings,
    finding_key,
    low_battery_ids,
    mark_duplicates,
    orphan_statistics,
    statistic_continuity,
)
from .ignored import IgnoreStore
from .impact import apply_impact
from .issues import async_sync_issues
from .maintenance import PreflightStore
from .marks import MarkStore, apply_marks, mark_key
from .nodered import OBJECT_TYPE as NODERED_TYPE
from .nodered import NodeRedError, analyze_flows, async_fetch_flows, device_serials
from .notes import NoteStore
from .notify import NotifyStore, async_announce
from .observations import ObservationStore
from .policies import KEY_PREFIX as POLICY_KEY_PREFIX
from .policies import PolicyStore
from .protection import ProtectionStore
from .queries import ReplyStore
from .refactor import RefactorStore
from .reminders import ReminderStore
from .runs import RunStore
from .signals import SignalStore, situations
from .signals import fire as signal_fire
from .stale import StaleStore
from .window import WindowStore

_LOGGER = logging.getLogger(__name__)

# Keys of the Energy dashboard preferences that name statistics, which are entity IDs.
ENERGY_KEYS = frozenset(
    {
        "stat_energy_from",
        "stat_energy_to",
        "stat_cost",
        "stat_compensation",
        "stat_consumption",
        "stat_rate",
        "included_in_stat",
        "entity_energy_price",
        "entity_energy_price_export",
    }
)


# Node-RED node fields that only matter to the editor; left out of the stored copy of the flows.
NODERED_DROP = frozenset({"x", "y", "w", "h", "wires", "info", "outputLabels", "icon", "l"})


def _iso(value: Any) -> str | None:
    """Serialize a datetime when the registry provides one."""
    return value.isoformat() if hasattr(value, "isoformat") else None


def _edge(source: str, target: str, relation: str) -> dict[str, str]:
    """Build a registry-derived dependency edge."""
    return {"source": source, "target": target, "relation": relation, "confidence": "certain"}


def _enum(value: Any) -> str | None:
    """Serialize an enum-like registry value."""
    if value is None:
        return None
    return str(getattr(value, "value", value))


class _DeviceIds(set):
    """The IDs of all devices; an ID Home Assistant still resolves (composite) counts as well."""

    def __init__(self, registry: Any) -> None:
        super().__init__(
            entry.id
            for collection in (registry.devices, getattr(registry, "child_devices", ()))
            for entry in _registry_entries(collection)
        )
        self._registry = registry

    def __contains__(self, device_id: object) -> bool:
        return super().__contains__(device_id) or (
            isinstance(device_id, str) and self._registry.async_get(device_id) is not None
        )


def _registry_entries(collection: Any) -> list[Any]:
    """Return entries from legacy mappings and modern read-only collections."""
    return [collection[value] if isinstance(value, str) else value for value in collection]


def _device_config_entry_ids(device: Any) -> list[str]:
    """The config entry that owns a device (a device belongs to exactly one)."""
    return [device.config_entry_id] if getattr(device, "config_entry_id", None) else []


def _entity_status(
    entry: Any,
    state: Any,
    config_entries: dict[str, Any],
    devices: dict[str, Any],
) -> tuple[str, str]:
    """Classify an entity conservatively and explain why."""
    if entry.disabled_by is not None:
        return "disabled", "entity_disabled"
    if entry.device_id and entry.device_id not in devices:
        return "orphaned", "device_missing"
    if entry.device_id and devices[entry.device_id].disabled_by is not None:
        return "disabled", "device_disabled"
    if entry.config_entry_id and entry.config_entry_id not in config_entries:
        return "orphaned", "config_entry_missing"
    if entry.config_entry_id and config_entries[entry.config_entry_id].disabled_by is not None:
        return "disabled", "integration_disabled"
    if state is None:
        return "orphaned", "state_missing"
    if state.state == "unavailable":
        return "unavailable", "state_unavailable"
    if state.state == "unknown":
        return "unknown", "state_unknown"
    return "active", "state_available"


def alias_texts(aliases: Any, computed_name: str | None = None) -> list[str]:
    """The aliases of a registry entry as sorted text.

    Newer Home Assistant versions mark "use the computed name" with a sentinel instead of text.
    That sentinel stands for the entity's own name, so it is replaced by it (or dropped without one).
    """
    texts = {alias for alias in aliases if isinstance(alias, str)}
    if computed_name and any(not isinstance(alias, str) for alias in aliases):
        texts.add(computed_name)
    return sorted(texts)


def _entity_item(
    entry: Any, state: Any, config_entries: dict[str, Any], devices: dict[str, Any]
) -> dict[str, Any]:
    """Normalize one entity registry entry together with its live state."""
    status, reason = _entity_status(entry, state, config_entries, devices)
    return {
        "object_type": "entity",
        "object_id": entry.entity_id,
        "name": entry.name or entry.original_name or (state.name if state else entry.entity_id),
        "unique_id": entry.unique_id,
        "platform": entry.platform,
        "original_name": entry.original_name,
        "icon": entry.icon or entry.original_icon,
        "aliases": alias_texts(
            entry.aliases,
            entry.name or entry.original_name or (state.name if state else None),
        ),
        "state_class": state.attributes.get("state_class") if state else None,
        "device_class": (state.attributes.get("device_class") if state else None)
        or getattr(entry, "device_class", None)
        or getattr(entry, "original_device_class", None),
        "unit": state.attributes.get("unit_of_measurement") if state else None,
        "entity_category": _enum(entry.entity_category),
        "config_entry_id": entry.config_entry_id,
        "device_id": entry.device_id,
        "area_id": entry.area_id,
        "labels": sorted(entry.labels),
        "disabled_by": _enum(entry.disabled_by),
        "hidden_by": _enum(entry.hidden_by),
        "status": status,
        "reason": reason,
        "status_since": None,
        "status_since_source": "first_housekeeper_observation",
        "state": state.state if state else None,
        "attributes": dict(state.attributes) if state else {},
        "last_changed": _iso(state.last_changed) if state else None,
        "last_updated": _iso(state.last_updated) if state else None,
        "last_reported": _iso(getattr(state, "last_reported", None)) if state else None,
        "created_at": _iso(getattr(entry, "created_at", None)),
        "modified_at": _iso(getattr(entry, "modified_at", None)),
    }


def _device_item(device: Any, entity_count: int) -> dict[str, Any]:
    """Normalize one device registry entry."""
    status = "disabled" if device.disabled_by is not None else "active" if entity_count else "empty"
    if is_child_device(device):
        # A child device has no manufacturer, connections or via device; reading them from
        # Home Assistant's entry would only report a deprecated access.
        return {
            "object_type": "device",
            "object_id": device.id,
            "name": device.name_by_user or device.name or device.id,
            "manufacturer": None,
            "model": None,
            "model_id": None,
            "serial_number": None,
            "original_name": device.name if device.name_by_user else None,
            "sw_version": None,
            "hw_version": None,
            "entry_type": None,
            "configuration_url": None,
            "identifiers": sorted(":".join(map(str, key)) for key in device.identifiers),
            "connections": [],
            "area_id": device.area_id,
            "config_entry_ids": _device_config_entry_ids(device),
            "device_kind": "child",
            "parent_device_id": device.parent_device_id,
            "via_device_id": None,
            "labels": sorted(device.labels),
            "disabled_by": _enum(device.disabled_by),
            "status": status,
            "entity_count": entity_count,
            "created_at": _iso(getattr(device, "created_at", None)),
            "modified_at": _iso(getattr(device, "modified_at", None)),
        }
    return {
        "object_type": "device",
        "object_id": device.id,
        "name": device.name_by_user or device.name or device.id,
        "manufacturer": device.manufacturer,
        "model": device.model,
        "model_id": getattr(device, "model_id", None),
        "serial_number": getattr(device, "serial_number", None),
        "original_name": device.name if device.name_by_user else None,
        "sw_version": getattr(device, "sw_version", None),
        "hw_version": getattr(device, "hw_version", None),
        "entry_type": _enum(getattr(device, "entry_type", None)),
        "configuration_url": str(device.configuration_url) if device.configuration_url else None,
        "identifiers": sorted(":".join(map(str, key)) for key in device.identifiers),
        "connections": sorted(":".join(map(str, key)) for key in device.connections),
        "area_id": device.area_id,
        "config_entry_ids": _device_config_entry_ids(device),
        "device_kind": "device",
        "parent_device_id": None,
        "via_device_id": device.via_device_id,
        "labels": sorted(device.labels),
        "disabled_by": _enum(device.disabled_by),
        "status": status,
        "entity_count": entity_count,
        "created_at": _iso(getattr(device, "created_at", None)),
        "modified_at": _iso(getattr(device, "modified_at", None)),
    }


def _area_item(area: Any) -> dict[str, Any]:
    return {
        "object_type": "area",
        "object_id": area.id,
        "name": area.name,
        "floor_id": area.floor_id,
        "labels": sorted(area.labels),
        "aliases": sorted(area.aliases),
        "status": "active",
    }


def _floor_item(floor: Any) -> dict[str, Any]:
    return {
        "object_type": "floor",
        "object_id": floor.floor_id,
        "name": floor.name,
        "level": floor.level,
        "aliases": sorted(floor.aliases),
        "status": "active",
    }


def _label_item(label: Any) -> dict[str, Any]:
    return {
        "object_type": "label",
        "object_id": label.label_id,
        "name": label.name,
        "description": label.description,
        "color": label.color,
        "status": "active",
    }


def _config_entry_item(
    entry: Any,
    integration: Any = None,
    entity_count: int = 0,
    device_count: int = 0,
) -> dict[str, Any]:
    """Normalize one config entry; ``integration`` is the loader's description of its domain."""
    state = _enum(entry.state)
    if entry.disabled_by:
        status = "disabled"
    elif entry.source == "ignore":
        status = "ignored"  # a discovery the user dismissed: never set up, so not a problem
    else:
        status = "active" if state == "loaded" else "problem"
    custom = integration is not None and not getattr(integration, "is_built_in", True)
    return {
        "object_type": "config_entry",
        "object_id": entry.entry_id,
        "name": entry.title,
        "domain": entry.domain,
        "integration_name": getattr(integration, "name", None),
        "custom": custom,
        "integration_dir": f"custom_components/{entry.domain}" if custom else None,
        "integration_version": str(integration.version)
        if custom and getattr(integration, "version", None)
        else None,
        "documentation": getattr(integration, "documentation", None),
        "source": entry.source,
        "state": state,
        "error": getattr(entry, "reason", None),
        "unique_id": entry.unique_id,
        "disabled_by": _enum(entry.disabled_by),
        "entity_count": entity_count,
        "device_count": device_count,
        "created_at": _iso(getattr(entry, "created_at", None)),
        "modified_at": _iso(getattr(entry, "modified_at", None)),
        "status": status,
    }


def _fallback_automation_item(state: Any) -> dict[str, Any]:
    """Describe an automation only known through its state object."""
    attrs = state.attributes
    return {
        "object_type": "automation",
        "object_id": state.entity_id,
        "name": attrs.get("friendly_name", state.entity_id),
        "automation_id": attrs.get("id"),
        "mode": attrs.get("mode"),
        "current": attrs.get("current", 0),
        "max": attrs.get("max"),
        "last_triggered": _iso(attrs.get("last_triggered")),
        "status": "active" if state.state == "on" else "disabled",
        "state": state.state,
        "source": "state_fallback",
        "description": "",
        "triggers": [],
        "conditions": [],
        "actions": [],
        "trigger_count": 0,
        "condition_count": 0,
        "action_count": 0,
        "references": [],
    }


def _long_enough(item: dict[str, Any], now: datetime, min_days: int) -> bool:
    """Whether an unavailable entity has been so for at least ``min_days``.

    Orphaned entities always qualify; only transient outages are filtered.
    """
    if min_days <= 0 or item["status"] != "unavailable":
        return True
    since = item.get("status_since")
    return bool(since) and now - datetime.fromisoformat(since) >= timedelta(days=min_days)


def _entity_findings(
    entities: list[dict[str, Any]],
    now: datetime | None = None,
    min_unavailable_days: int = 0,
) -> list[dict[str, Any]]:
    """Create findings for entities that need attention."""
    now = now or datetime.now(UTC)
    return [
        {
            "rule_id": f"entity.{item['reason']}",
            "object_id": item["object_id"],
            "classification": item["status"],
            "confidence": 0.98 if item["reason"] == "config_entry_missing" else 0.75,
            "first_detected_at": item["status_since"],
            "evidence": [{"kind": item["reason"], "source": "entity_registry"}],
        }
        for item in entities
        if item["status"] in {"orphaned", "unavailable"}
        and _long_enough(item, now, min_unavailable_days)
    ]


def _missing_findings(
    domain: str, object_id: str, missing: list[dict[str, str]]
) -> list[dict[str, Any]]:
    """Create one finding per reference whose target no longer exists."""
    return [
        {
            "rule_id": f"{domain}.missing_{reference['kind']}",
            "object_id": object_id,
            "classification": "broken_reference",
            "confidence": 0.98,
            "first_detected_at": None,
            "affected_object": reference["object_id"],
            "evidence": [
                {
                    "kind": "missing_reference",
                    "source": f"{domain}_runtime_config",
                    "location": reference["location"],
                }
            ],
        }
        for reference in missing
    ]


def _structure_edges(
    entities: list[dict[str, Any]],
    devices: list[dict[str, Any]],
    areas: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Create registry-derived dependency edges."""
    edges: list[dict[str, str]] = []
    for entity in entities:
        entity_key = f"entity:{entity['object_id']}"
        if entity["device_id"]:
            edges.append(_edge(f"device:{entity['device_id']}", entity_key, "PROVIDES"))
        if entity["config_entry_id"]:
            edges.append(_edge(f"config_entry:{entity['config_entry_id']}", entity_key, "PROVIDES"))
        if entity["area_id"]:
            edges.append(_edge(f"area:{entity['area_id']}", entity_key, "CONTAINS"))
    for device in devices:
        device_key = f"device:{device['object_id']}"
        edges.extend(
            _edge(f"config_entry:{entry_id}", device_key, "OWNS")
            for entry_id in device["config_entry_ids"]
        )
        if device["via_device_id"]:
            edges.append(_edge(f"device:{device['via_device_id']}", device_key, "VIA_DEVICE"))
        if device["area_id"]:
            edges.append(_edge(f"area:{device['area_id']}", device_key, "CONTAINS"))
    edges.extend(
        _edge(f"floor:{area['floor_id']}", f"area:{area['object_id']}", "CONTAINS")
        for area in areas
        if area["floor_id"]
    )
    return edges


DETAIL_FIELDS = ("attributes", "triggers", "conditions", "actions", "references")


def _split_details(objects: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Move bulky per-object fields out of the list payload into a detail index."""
    details: dict[str, dict[str, Any]] = {}
    for item in objects:
        bulky = {name: item.pop(name) for name in DETAIL_FIELDS if name in item}
        if bulky:
            details[f"{item['object_type']}:{item['object_id']}"] = bulky
    return details


STORED = ("observations", "history", "journal", "events", "runs", "replies")


def storage_sizes(hass: HomeAssistant) -> dict[str, int]:
    """Blocking: the size in bytes of each of Housekeeper's own files in ``.storage``."""
    base = Path(hass.config.path(".storage"))
    sizes: dict[str, int] = {}
    for name in STORED:
        try:
            sizes[name] = (base / f"{DOMAIN}.{name}").stat().st_size
        except OSError:
            continue
    return sizes


class InventoryScanner:
    """Build and cache a normalized, read-only inventory."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.observations = ObservationStore(hass)
        self.history = ScanHistory(hass)
        self.ignored = IgnoreStore(hass)
        self.policies = PolicyStore(hass)
        self.replies = ReplyStore(hass)
        self.journal = JournalStore(hass)
        self.preflight = PreflightStore(hass)
        self.attest = AttestStore(hass)
        self.events = EventLog(hass)
        self.marks = MarkStore(hass)
        self.stale = StaleStore(hass)
        self._started = datetime.now(UTC)
        self.goals = GoalStore(hass)
        self.criteria = CriteriaStore(hass)
        self.coverage = CoverageStore(hass)
        self.refactor = RefactorStore(hass)
        self.protection = ProtectionStore(hass)
        self.signals = SignalStore(hass)
        self.entry_states = EntryStateHistory(hass)
        self.reminders = ReminderStore(hass)
        self.notes = NoteStore(hass)
        self.batteries = BatteryStore(hass)
        self.window = WindowStore(hass)
        self.notify = NotifyStore(hass)
        self.runs = RunStore(hass)
        self.cleanup = CleanupRunner(hass, self)
        self.paused = False
        self._booting = False
        self._warmup_until: float | None = None
        self._recorder_available = False
        self._lock = asyncio.Lock()
        self._snapshot: dict[str, Any] | None = None
        self._details: dict[str, dict[str, Any]] = {}
        self.min_unavailable_days = DEFAULT_MIN_UNAVAILABLE_DAYS
        self.unused_automation_days = DEFAULT_UNUSED_AUTOMATION_DAYS
        self.low_battery_percent = DEFAULT_LOW_BATTERY_PERCENT
        self.stale_hours = DEFAULT_STALE_HOURS
        self.scan_interval_hours = DEFAULT_SCAN_INTERVAL_HOURS
        self.version: str | None = None
        # Node-RED admin API: url, username, password, token. None when not configured.
        self.nodered: dict[str, str] | None = None
        # The last flows read, kept so an unreachable Node-RED does not make its uses vanish.
        self._nodered_store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, NODERED_STORAGE_KEY
        )
        self._nodered_flows: dict[str, Any] | None = None
        self.status: dict[str, Any] = {
            "running": False,
            "phase": "idle",
            "progress": 0,
            "last_error": None,
        }

    async def async_initialize(self) -> None:
        """Load persisted observations and read the installed version."""
        try:
            self.version = str((await async_get_integration(self.hass, DOMAIN)).version)
        except IntegrationNotFound:
            self.version = None
        await self.observations.async_load()
        await self.history.async_load()
        await self.ignored.async_load()
        await self.policies.async_load()
        await self.replies.async_load()
        await self.journal.async_load()
        await self.preflight.async_load()
        await self.attest.async_load()
        await self.events.async_load()
        await self.marks.async_load()
        await self.stale.async_load()
        await self.goals.async_load()
        await self.criteria.async_load()
        await self.coverage.async_load()
        await self.refactor.async_load()
        await self.protection.async_load()
        await self.signals.async_load()
        await self.entry_states.async_load()
        await self.reminders.async_load()
        await self.notes.async_load()
        await self.batteries.async_load()
        await self.window.async_load()
        await self.notify.async_load()
        await self.runs.async_load()
        self._nodered_flows = await self._nodered_store.async_load()

    def begin_boot(self) -> None:
        """Home Assistant is still booting: scans are preliminary until the warm-up is over."""
        self._booting = True

    def begin_warmup(self, seconds: float) -> None:
        """Home Assistant just started: scans stay preliminary for the next ``seconds``."""
        self._booting = False
        self._warmup_until = time.monotonic() + seconds

    @property
    def warmup_seconds_left(self) -> int:
        """Seconds until scans count again, 0 when the warm-up is over."""
        if self._booting:
            return WARMUP_SECONDS
        if self._warmup_until is None:
            return 0
        return max(0, round(self._warmup_until - time.monotonic()))

    @property
    def warming_up(self) -> bool:
        """Whether entity states may still be missing because Home Assistant is starting."""
        return self._booting or self.warmup_seconds_left > 0

    async def async_scan(self) -> dict[str, Any]:
        """Scan registries and states. Concurrent callers share serialized work."""
        async with self._lock:
            self.status.update(running=True, phase="registries", progress=5, last_error=None)
            try:
                # Decided before the states are read: a scan that began during the warm-up stays
                # preliminary even if the warm-up ends while it runs.
                preliminary = self.warming_up
                snapshot = await self._async_build_snapshot(preliminary)
                self._details = _split_details(snapshot["objects"])
                self._snapshot = snapshot
                if not preliminary:
                    async_sync_issues(self.hass, snapshot["findings"])
                    async_announce(self.hass, self.notify.new(snapshot["findings"]))
                    self.history.record(snapshot)
                    self.entry_states.record(
                        {
                            e.entry_id: getattr(e.state, "value", str(e.state))
                            for e in self.hass.config_entries.async_entries()
                        },
                        datetime.now(UTC),
                    )
                    self._observe_versions(snapshot)
                    if followup.check(
                        self.journal.plans, snapshot, datetime.now(UTC), self.runs.errors_since
                    ):
                        self.journal.save()
                    snapshot["regressions"] = followup.regressions(
                        self.journal.plans, datetime.now(UTC)
                    )
                    snapshot["criteria_alerts"] = self.criteria.alerts(datetime.now(UTC).date())
                    self.hass.async_create_background_task(
                        self._announce(snapshot), "HA Housekeeper events"
                    )
                async_dispatcher_send(self.hass, SIGNAL_SCAN_COMPLETE)
                self.status.update(running=False, phase="complete", progress=100)
                return snapshot
            except Exception as err:
                self.status.update(
                    running=False,
                    phase="failed",
                    last_error=f"{type(err).__name__}: {err}",
                )
                raise

    async def _announce(self, snapshot: dict[str, Any]) -> None:
        """Fire the events for situations that are new since the last scan."""
        backup = None
        try:
            async with asyncio.timeout(20):
                backup = await backup_health(self.hass, self.attest, self.journal.plans)
        except Exception:  # noqa: BLE001 - without the backup report only that event is skipped
            backup = None
        try:
            found = situations(
                snapshot,
                self.journal.plans,
                backup,
                datetime.now(UTC),
                snapshot.get("reminders"),
            )
            # Unknown is not "overdue", and a missing report must not end that situation either.
            unknown = ("backup:",) if backup is None else ()
            signal_fire(self.hass, self.signals.fresh(found, unknown))
        except Exception:  # noqa: BLE001 - events never break a scan
            _LOGGER.debug("Events failed", exc_info=True)

    def _observe_versions(self, snapshot: dict[str, Any]) -> None:
        custom = {
            item["domain"]: item["integration_version"]
            for item in snapshot["objects"]
            if item["object_type"] == "config_entry" and item.get("integration_version")
        }
        self.events.observe(HA_VERSION, custom, datetime.now(UTC))

    @property
    def snapshot(self) -> dict[str, Any] | None:
        """Return the latest snapshot without triggering a scan."""
        return self._snapshot

    async def async_get_snapshot(self) -> dict[str, Any]:
        """Return the latest snapshot, scanning on first access."""
        if self._snapshot is None:
            return await self.async_scan()
        return self._snapshot

    def get_details(self, object_type: str, object_id: str) -> dict[str, Any] | None:
        """Return bulky fields of one object from the latest snapshot."""
        if self._snapshot is None:
            return None
        key = f"{object_type}:{object_id}"
        if key in self._details:
            return self._details[key]
        known = any(
            f"{item['object_type']}:{item['object_id']}" == key
            for item in self._snapshot["objects"]
        )
        return {} if known else None

    async def _async_build_snapshot(self, preliminary: bool = False) -> dict[str, Any]:
        # Seconds per phase, in the snapshot and the debug log: the scan runs in the event loop,
        # so a slow phase on a large installation shows here first.
        timing: dict[str, float] = {}
        mark = time.monotonic()

        def lap(phase: str) -> None:
            nonlocal mark
            now = time.monotonic()
            timing[phase] = round(now - mark, 3)
            mark = now

        entity_registry = er.async_get(self.hass)
        device_registry = dr.async_get(self.hass)
        area_registry = ar.async_get(self.hass)
        floor_registry = fr.async_get(self.hass)
        label_registry = lr.async_get(self.hass)
        config_entries = self.hass.config_entries.async_entries()
        config_entries_by_id = {entry.entry_id: entry for entry in config_entries}
        main_devices = _registry_entries(device_registry.devices)
        child_devices = _registry_entries(getattr(device_registry, "child_devices", ()))
        device_entries = [*main_devices, *child_devices]
        devices_by_id = {device.id: device for device in device_entries}
        # Entities may still name a pre-migration composite device ID that the registry resolves
        # on demand; such a device exists and must not make its entities look orphaned.
        for entry in _registry_entries(entity_registry.entities):
            if (
                entry.device_id
                and entry.device_id not in devices_by_id
                and (resolved := device_registry.async_get(entry.device_id)) is not None
            ):
                devices_by_id[entry.device_id] = resolved
        observed_at = datetime.now(UTC)

        entities = [
            _entity_item(
                entry, self.hass.states.get(entry.entity_id), config_entries_by_id, devices_by_id
            )
            for entry in _registry_entries(entity_registry.entities)
        ]
        lap("entities")
        self.status.update(phase="devices", progress=30)
        await asyncio.sleep(0)

        entity_counts = Counter(item["device_id"] for item in entities if item["device_id"])
        devices = [_device_item(device, entity_counts[device.id]) for device in device_entries]
        areas = [_area_item(area) for area in _registry_entries(area_registry.areas)]
        floors = [_floor_item(floor) for floor in _registry_entries(floor_registry.floors)]
        labels = [_label_item(label) for label in _registry_entries(label_registry.labels)]
        entities_per_entry = Counter(item["config_entry_id"] for item in entities)
        devices_per_entry = Counter(
            entry_id for device in device_entries for entry_id in _device_config_entry_ids(device)
        )
        described = await async_get_integrations(
            self.hass, {entry.domain for entry in config_entries}
        )
        integrations = [
            _config_entry_item(
                entry,
                described.get(entry.domain)
                if not isinstance(described.get(entry.domain), BaseException)
                else None,
                entities_per_entry[entry.entry_id],
                devices_per_entry[entry.entry_id],
            )
            for entry in config_entries
        ]

        lap("devices")
        self.status.update(phase="automations", progress=60)
        await asyncio.sleep(0)
        # One view of what exists for the whole reference analysis of this scan.
        existing_objects = self._existing_objects()
        automations, automation_edges, automation_findings = self._automation_inventory(
            existing_objects
        )
        dashboards, dashboard_edges, dashboard_findings = await self._dashboard_inventory(
            existing_objects
        )
        energy, energy_edges = await self._energy_inventory(existing_objects)
        dashboards.extend(energy)
        dashboard_edges.extend(energy_edges)
        helper_edges, helper_findings = self._helper_inventory(existing_objects)
        flows, flow_edges, flow_findings, nodered_status = await self._nodered_inventory(
            existing_objects, device_entries, preliminary
        )
        group_edges, group_findings = self._group_inventory(existing_objects)
        known_automation_ids = {item["object_id"] for item in automations}
        automations.extend(
            _fallback_automation_item(state)
            for state in self.hass.states.async_all("automation")
            if state.entity_id not in known_automation_ids
        )

        # One update for everything: anything missing from it would be forgotten.
        tracked = [("entity", item) for item in entities] + [
            ("automation", item) for item in automations
        ]
        if not preliminary:
            await self.observations.async_update(
                {f"{kind}:{item['object_id']}": item["status"] for kind, item in tracked},
                observed_at,
            )
        for kind, item in tracked:
            item["status_since"] = self.observations.since(
                f"{kind}:{item['object_id']}", item["status"]
            )
        if not preliminary:
            self.stale.observe(
                entities,
                observed_at,
                self._started,
                self._started + timedelta(seconds=WARMUP_SECONDS),
                self.stale_hours,
            )
        self.stale.annotate(entities, observed_at, self.stale_hours)
        statistics = await self._statistics()
        statistic_ids = {item["statistic_id"] for item in statistics}
        for item in entities:
            item["has_statistics"] = item["object_id"] in statistic_ids
        statistic_issues = statistic_continuity(statistics, entities)
        mark_duplicates(entities)

        edges = (
            _structure_edges(entities, devices, areas)
            + automation_edges
            + dashboard_edges
            + helper_edges
            + group_edges
            + flow_edges
        )
        objects = (
            entities
            + devices
            + integrations
            + areas
            + floors
            + labels
            + automations
            + dashboards
            + flows
        )
        findings = (
            _entity_findings(entities, observed_at, self.min_unavailable_days)
            + duplicate_findings(
                entities,
                lambda item: _long_enough(item, observed_at, self.min_unavailable_days),
            )
            + ([] if preliminary else self.stale.findings(entities, observed_at, self.stale_hours))
            + automation_hygiene_findings(automations, observed_at, self.unused_automation_days)
            + automation_findings
            + (
                []
                if preliminary
                else self.criteria.findings(
                    observed_at.date(), {a["object_id"] for a in automations}
                )
            )
            + dashboard_findings
            + helper_findings
            + group_findings
            + flow_findings
        )

        quarantine = quarantine_entries(self.journal.plans, [*entities, *devices])
        recurring = recurring_devices(
            self.journal.plans,
            [
                (
                    device.id,
                    device.name_by_user or device.name or device.id,
                    {*map(tuple, device.identifiers), *map(tuple, device.connections)},
                )
                for device in main_devices
            ],
        )
        orphaned_statistics = orphan_statistics(
            statistics,
            existing_objects["entity"],
            {edge["target"][7:] for edge in energy_edges},
        )

        entity_registry_entries = er.async_get(self.hass)
        for finding in findings:
            finding["key"] = finding_key(finding)
            self._mark_ignored(finding, entity_registry_entries)
        apply_marks(objects, findings, self.marks.items)
        apply_battery_kinds(objects, self.batteries.kinds)
        apply_impact(objects, edges, findings)
        causes = apply_causes(objects, edges, findings)

        lap("analysis")
        self.status.update(phase="finalizing", progress=90)

        storage = await self.hass.async_add_executor_job(storage_sizes, self.hass)
        try:
            database = await database_summary(self.hass, self.events)
        except Exception:  # noqa: BLE001 - the overview works without the size of the database
            database = None

        lap("finalizing")
        _LOGGER.debug("Scan took %.2f s: %s", sum(timing.values()), timing)
        return {
            "meta": {
                "scan_timing": timing,
                "storage": storage,
                "database": database,
                "scanned_at": observed_at.isoformat(),
                "read_only": True,
                "preliminary": preliminary,
                "warmup_seconds_left": self.warmup_seconds_left,
                "min_unavailable_days": self.min_unavailable_days,
                "unused_automation_days": self.unused_automation_days,
                "ignore_label": IGNORE_LABEL,
                "version": self.version,
                "notify": self.notify.enabled,
                "protection": self.protection.mode,
                "recorder_available": self._recorder_available,
                "orphaned_statistics": len(orphaned_statistics),
                "quarantined": len(quarantine),
                "recurring_devices": len(recurring),
                "quarantine_days": QUARANTINE_DAYS,
                "ha_version": HA_VERSION,
                "nodered": nodered_status,
                "scan_interval_hours": self.scan_interval_hours,
                "low_battery_percent": self.low_battery_percent,
                "stale_hours": self.stale_hours,
                "history_days": self.history.retention_days,
                "low_batteries": len(low_battery_ids(entities, self.low_battery_percent)),
                "object_count": len(objects),
                "status_counts": dict(Counter(item["status"] for item in objects)),
                "type_counts": dict(Counter(item["object_type"] for item in objects)),
            },
            "objects": objects,
            "edges": edges,
            "findings": findings,
            "causes": causes,
            "reminders": self.reminders.view(datetime.now(UTC).date()),
            "notes": self.notes.view(),
            "regressions": [],
            "criteria_alerts": [],
            "orphaned_statistics": orphaned_statistics,
            "statistic_issues": statistic_issues,
            "quarantine": quarantine,
            "recurring_devices": recurring,
        }

    def _ignored_by(self, finding: dict[str, Any], registry: Any) -> str | None:
        """Return why a finding is hidden: by the user, or by the ignore label."""
        if self.ignored.is_ignored(finding["key"]):
            return "user"
        entry = registry.async_get(finding["object_id"])
        if entry is not None and IGNORE_LABEL in entry.labels:
            return "label"
        return None

    def _mark_ignored(self, finding: dict[str, Any], registry: Any) -> None:
        """Set what hides a finding, the decision behind it and whether one ran out."""
        finding["ignored_by"] = self._ignored_by(finding, registry)
        finding["ignored"] = finding["ignored_by"] is not None
        info = self.ignored.info(finding["key"])
        finding["ignore_info"] = info if finding["ignored_by"] == "user" else None
        finding["resurfaced"] = not finding["ignored"] and self.ignored.is_due(finding["key"])

    def set_finding_ignored(
        self,
        key: str,
        ignored: bool,
        *,
        kind: str = "ignore",
        reason: str = "",
        days: int | None = None,
        by: str | None = None,
    ) -> bool:
        """Hide or show one finding in the stored state and the cached snapshot.

        ``kind`` and ``reason`` say what was decided and why; ``days`` how long it holds.
        A policy violation (key ``policy.<rule>|...``) is no finding: only the ignore list changes.
        """
        now = datetime.now(UTC)

        def store() -> bool:
            if not ignored:
                self.ignored.set_ignored(key, False, now)
                return True
            until = now + timedelta(days=days) if days else None
            return self.ignored.decide(key, kind, now, reason=reason, until=until, by=by)

        if key.startswith(POLICY_KEY_PREFIX):
            return store()
        finding = next(
            (f for f in (self._snapshot or {}).get("findings", []) if f["key"] == key), None
        )
        if finding is None:
            return False
        if not store():
            return False
        self._mark_ignored(finding, er.async_get(self.hass))
        self._snapshot["causes"] = apply_causes(
            self._snapshot["objects"], self._snapshot["edges"], self._snapshot["findings"]
        )
        async_sync_issues(self.hass, self._snapshot["findings"])
        async_dispatcher_send(self.hass, SIGNAL_SCAN_COMPLETE)
        return True

    def set_mark(
        self,
        object_type: str,
        object_id: str,
        kind: str,
        *,
        reason: str = "",
        days: int | None = None,
        target: str | None = None,
        by: str | None = None,
    ) -> str | None:
        """Mark an entity or device; the reason it failed, or None."""
        snapshot = self._snapshot or {}
        known = {(item["object_type"], item["object_id"]) for item in snapshot.get("objects", [])}
        if (object_type, object_id) not in known:
            return "not_found"
        if target and (object_type, target) not in known:
            return "target_unknown"
        now = datetime.now(UTC)
        until = now + timedelta(days=days) if days else None
        if not self.marks.set(
            mark_key(object_type, object_id),
            kind,
            now,
            reason=reason,
            until=until,
            target=target,
            by=by,
        ):
            return "too_many"
        self._refresh_marks()
        return None

    async def set_stale_limit(self, entity_id: str, hours: int | None) -> str | None:
        """Set the "no new report" limit of one sensor (0 = off, ``None`` = default); the failure, or None."""
        known = {
            item["object_id"]
            for item in (self._snapshot or {}).get("objects", [])
            if item["object_type"] == "entity"
        }
        if entity_id not in known:
            return "not_found"
        if not self.stale.set_limit(entity_id, hours):
            return "too_many"
        await self.async_scan()
        return None

    def clear_mark(self, object_type: str, object_id: str) -> bool:
        """Take a mark away again."""
        if not self.marks.clear(mark_key(object_type, object_id)):
            return False
        self._refresh_marks()
        return True

    def set_battery_kinds(self, items: list[tuple[str, str]]) -> None:
        """Store the kinds of battery sensors and bring the cached snapshot and its count up to date."""
        self.batteries.set_kinds(items)
        snapshot = self._snapshot
        if not snapshot:
            return
        apply_battery_kinds(snapshot["objects"], self.batteries.kinds)
        # The forecast was read for the sensors of the time before; the next one reads them anew.
        self.hass.data.get(DOMAIN, {}).get("query_cache", {}).pop("battery_trend", None)
        entities = [o for o in snapshot["objects"] if o["object_type"] == "entity"]
        snapshot["meta"]["low_batteries"] = len(low_battery_ids(entities, self.low_battery_percent))
        async_dispatcher_send(self.hass, SIGNAL_SCAN_COMPLETE)

    def _refresh_marks(self) -> None:
        """Bring the objects and findings of the cached snapshot up to date with the marks."""
        snapshot = self._snapshot
        if not snapshot:
            return
        registry = er.async_get(self.hass)
        for finding in snapshot["findings"]:
            self._mark_ignored(finding, registry)
        apply_marks(snapshot["objects"], snapshot["findings"], self.marks.items)
        snapshot["causes"] = apply_causes(
            snapshot["objects"], snapshot["edges"], snapshot["findings"]
        )
        async_sync_issues(self.hass, snapshot["findings"])
        async_dispatcher_send(self.hass, SIGNAL_SCAN_COMPLETE)

    def _existing_objects(self) -> dict[str, set[str]]:
        """Collect the IDs a reference may legitimately point to."""
        registries = {
            "devices": dr.async_get(self.hass),
            "areas": ar.async_get(self.hass),
            "floors": fr.async_get(self.hass),
            "labels": lr.async_get(self.hass),
        }
        return {
            "entity": {
                entry.entity_id for entry in _registry_entries(er.async_get(self.hass).entities)
            }
            | {state.entity_id for state in self.hass.states.async_all()},
            "device": _DeviceIds(registries["devices"]),
            "area": {entry.id for entry in _registry_entries(registries["areas"].areas)},
            "floor": {entry.floor_id for entry in _registry_entries(registries["floors"].floors)},
            "label": {entry.label_id for entry in _registry_entries(registries["labels"].labels)},
        }

    def _runtime_component(self, domain: str) -> Any | None:
        """Return a loaded entity component such as automation or script."""
        try:
            module = __import__(f"homeassistant.components.{domain}", fromlist=["DATA_COMPONENT"])
        except ImportError:
            return None
        return self.hass.data.get(getattr(module, "DATA_COMPONENT", domain))

    def _config_object_inventory(
        self,
        domain: str,
        summarize: Any,
        existing: dict[str, set[str]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[dict[str, Any]]]:
        """Inspect automations or scripts through Home Assistant runtime APIs."""
        component = self._runtime_component(domain)
        if component is None:
            return [], [], []

        items: list[dict[str, Any]] = []
        edges: list[dict[str, str]] = []
        findings: list[dict[str, Any]] = []

        for entity in component.entities:
            entity_id = entity.entity_id
            state = self.hass.states.get(entity_id)
            summary = summarize(getattr(entity, "raw_config", None))
            references = summary["references"]

            # HA's runtime extraction also detects references inside templates.
            explicit_markers = {(ref["kind"], ref["object_id"]) for ref in references}
            runtime_sets = {
                "entity": getattr(entity, "referenced_entities", set()),
                "device": getattr(entity, "referenced_devices", set()),
                "area": getattr(entity, "referenced_areas", set()),
                "floor": getattr(entity, "referenced_floors", set()),
                "label": getattr(entity, "referenced_labels", set()),
            }
            for kind, object_ids in runtime_sets.items():
                for object_id in object_ids:
                    # Home Assistant may hand over unevaluated Template objects here.
                    if is_concrete_id(object_id) and (kind, object_id) not in explicit_markers:
                        references.append(
                            {
                                "kind": kind,
                                "object_id": object_id,
                                "relation": "REFERENCES",
                                "location": "runtime_extraction",
                                "confidence": "probable",
                            }
                        )

            edges.extend(
                {
                    "source": f"{domain}:{entity_id}",
                    "target": f"{reference['kind']}:{reference['object_id']}",
                    "relation": reference["relation"],
                    "confidence": reference["confidence"],
                    "location": reference["location"],
                }
                for reference in references
            )

            missing = missing_references(references, existing)
            findings.extend(_missing_findings(domain, entity_id, missing))

            attrs = state.attributes if state else {}
            blueprint = getattr(entity, "referenced_blueprint", None)
            item = {
                "object_type": domain,
                "object_id": entity_id,
                "name": getattr(entity, "name", None) or attrs.get("friendly_name", entity_id),
                "status": "unavailable"
                if state is None or state.state == "unavailable"
                else ("active" if state.state == "on" or domain == "script" else "disabled"),
                "state": state.state if state else None,
                "source": "blueprint" if blueprint else "home_assistant_runtime",
                "blueprint": blueprint,
                "missing_reference_count": len(missing),
                "last_triggered": _iso(attrs.get("last_triggered")),
                **summary,
            }
            if domain == "automation":
                registry_entry = er.async_get(self.hass).async_get(entity_id)
                item.update(
                    {
                        "created_at": _iso(getattr(registry_entry, "created_at", None)),
                        "automation_id": getattr(entity, "unique_id", None),
                        "mode": attrs.get("mode"),
                        "current": attrs.get("current", 0),
                        "max": attrs.get("max"),
                    }
                )
            else:
                item["mode"] = attrs.get("mode")
            items.append(item)

        return items, edges, findings

    def _automation_inventory(
        self, existing: dict[str, set[str]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[dict[str, Any]]]:
        """Inspect automations, scripts and scenes."""
        automations, edges, findings = self._config_object_inventory(
            "automation", summarize_automation_config, existing
        )
        scripts, script_edges, script_findings = self._config_object_inventory(
            "script", summarize_script_config, existing
        )
        scenes, scene_edges, scene_findings = self._scene_inventory(existing)
        return (
            automations + scripts + scenes,
            edges + script_edges + scene_edges,
            findings + script_findings + scene_findings,
        )

    def _helper_inventory(
        self, existing: dict[str, set[str]]
    ) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
        """Link helper config entries (template, derivative, ...) to the entities they use."""
        edges: list[dict[str, str]] = []
        findings: list[dict[str, Any]] = []
        for entry in self.hass.config_entries.async_entries():
            if entry.domain not in HELPER_DOMAINS:
                continue
            references = extract_helper_references(dict(entry.options), existing["entity"])
            edges.extend(
                {
                    "source": f"config_entry:{entry.entry_id}",
                    "target": f"entity:{reference['object_id']}",
                    "relation": reference["relation"],
                    "confidence": reference["confidence"],
                    "location": reference["location"],
                }
                for reference in references
            )
            findings.extend(
                _missing_findings(
                    "config_entry", entry.entry_id, missing_references(references, existing)
                )
            )
        return edges, findings

    def _group_inventory(
        self, existing: dict[str, set[str]]
    ) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
        """Link groups (any entity listing members in ``entity_id``) to their members."""
        edges: list[dict[str, str]] = []
        findings: list[dict[str, Any]] = []
        for state in self.hass.states.async_all():
            if state.domain in {"automation", "script", "scene"}:
                continue
            members = state.attributes.get("entity_id")
            if not isinstance(members, (list, tuple)) or not all(
                isinstance(member, str) for member in members
            ):
                continue
            references = [
                {
                    "kind": "entity",
                    "object_id": member,
                    "relation": "INCLUDES",
                    "location": "entity_id",
                    "confidence": "certain",
                }
                for member in members
            ]
            edges.extend(
                {
                    "source": f"entity:{state.entity_id}",
                    "target": f"entity:{reference['object_id']}",
                    "relation": reference["relation"],
                    "confidence": reference["confidence"],
                    "location": reference["location"],
                }
                for reference in references
            )
            for reference in missing_references(references, existing):
                findings.append(
                    {
                        "rule_id": "entity.missing_member",
                        "object_id": state.entity_id,
                        "classification": "broken_reference",
                        "confidence": 0.9,
                        "first_detected_at": None,
                        "affected_object": reference["object_id"],
                        "evidence": [
                            {
                                "kind": "missing_reference",
                                "source": "group_members",
                                "location": "entity_id",
                            }
                        ],
                    }
                )
        return edges, findings

    async def _nodered_inventory(
        self, existing: dict[str, set[str]], devices: list[Any], preliminary: bool
    ) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[dict[str, Any]], dict[str, Any]]:
        """Describe Node-RED flows through the entities and devices they use.

        Falls back to the flows of the last successful read when Node-RED cannot be reached, so
        an outage never makes its uses vanish (and cleanup suggest what Node-RED still needs).
        """
        config = self.nodered
        if not config or not config.get("url"):
            return [], [], [], {"configured": False}
        url = config["url"]
        status: dict[str, Any] = {"configured": True, "error": None, "cached": False}
        cache = self._nodered_flows if (self._nodered_flows or {}).get("url") == url else None
        try:
            flows = await async_fetch_flows(
                self.hass, url, config.get("username"), config.get("password"), config.get("token")
            )
        except NodeRedError as err:
            status["error"] = str(err)
            if cache is None:
                return [], [], [], status
            flows = cache["flows"]
            status.update(cached=True, read_at=cache.get("read_at"))
        else:
            read_at = datetime.now(UTC).isoformat()
            status["read_at"] = read_at
            trimmed = [
                {key: value for key, value in node.items() if key not in NODERED_DROP}
                for node in flows
            ]
            if not preliminary and (cache is None or cache.get("flows") != trimmed):
                self._nodered_flows = {"url": url, "read_at": read_at, "flows": trimmed}
                cached = self._nodered_flows
                self._nodered_store.async_delay_save(lambda: cached, 1)
        analyzed = await self.hass.async_add_executor_job(
            analyze_flows, flows, existing, device_serials(devices)
        )
        items: list[dict[str, Any]] = []
        edges: list[dict[str, str]] = []
        findings: list[dict[str, Any]] = []
        for flow in analyzed:
            source = f"{NODERED_TYPE}:{flow['id']}"
            references = flow["references"]
            edges.extend(
                {
                    "source": source,
                    "target": f"{reference['kind']}:{reference['object_id']}",
                    "relation": reference["relation"],
                    "confidence": reference["confidence"],
                    "location": reference["location"],
                }
                for reference in references
            )
            # Only fields that name an object can be missing; text matches exist by construction.
            missing = missing_references(
                [r for r in references if r["confidence"] == "certain"], existing
            )
            findings.extend(_missing_findings(NODERED_TYPE, flow["id"], missing))
            items.append(
                {
                    "object_type": NODERED_TYPE,
                    "object_id": flow["id"],
                    "name": flow["name"],
                    "status": "active",
                    "flow_kind": flow["kind"],
                    "node_count": flow["node_count"],
                    "entity_count": len(
                        {r["object_id"] for r in references if r["kind"] == "entity"}
                    ),
                    "device_count": len(
                        {r["object_id"] for r in references if r["kind"] == "device"}
                    ),
                    "missing_reference_count": len(missing),
                    "editor_url": f"{url.rstrip('/')}/#flow/{flow['id']}",
                    "references": references,
                }
            )
        status["flow_count"] = len(items)
        return items, edges, findings, status

    async def _statistics(self) -> list[dict[str, Any]]:
        """Long-term statistics known to the recorder; empty without a recorder."""
        self._recorder_available = False
        if "recorder" not in self.hass.config.components:
            return []
        try:
            from homeassistant.components.recorder.statistics import async_list_statistic_ids

            statistics = await async_list_statistic_ids(self.hass)
        except Exception:  # The recorder may be unavailable or still starting.
            return []
        self._recorder_available = True
        return list(statistics)

    async def _energy_inventory(
        self, existing: dict[str, set[str]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
        """Describe the Energy dashboard through the entities its preferences use."""
        if "energy" not in self.hass.config.components:
            return [], []
        try:
            from homeassistant.components.energy.data import async_get_manager

            manager = await async_get_manager(self.hass)
            preferences = manager.data
        except Exception:  # Energy is optional and may not be configured.
            return [], []
        references = extract_entity_references(
            preferences, existing["entity"], ENERGY_KEYS, "SHOWS"
        )
        if not references:
            return [], []
        edges = [
            {
                "source": "dashboard:energy",
                "target": f"entity:{reference['object_id']}",
                "relation": "SHOWS",
                "confidence": reference["confidence"],
                "location": reference["location"],
            }
            for reference in references
        ]
        dashboard = {
            "object_type": "dashboard",
            "object_id": "energy",
            "name": "Energy",
            "url_path": "energy",
            "mode": "energy",
            "view_count": 0,
            "entity_count": len({reference["object_id"] for reference in references}),
            "missing_reference_count": 0,
            "status": "active",
            "references": references,
        }
        return [dashboard], edges

    async def _dashboard_inventory(
        self, existing: dict[str, set[str]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[dict[str, Any]]]:
        """Read dashboard configurations and link the entities they show."""
        try:
            from homeassistant.components.lovelace.const import LOVELACE_DATA
        except ImportError:
            return [], [], []
        lovelace = self.hass.data.get(LOVELACE_DATA)
        if lovelace is None:
            return [], [], []

        dashboards: list[dict[str, Any]] = []
        edges: list[dict[str, str]] = []
        findings: list[dict[str, Any]] = []
        configs: dict[str, Any] = {}
        for url_path, dashboard in lovelace.dashboards.items():
            try:
                config = await dashboard.async_load(False)
            except Exception:  # Auto-generated, missing or invalid dashboards have nothing to read.
                continue
            object_id = url_path or "lovelace"
            configs[object_id] = config
            references = extract_dashboard_references(config, existing["entity"])
            edges.extend(
                {
                    "source": f"dashboard:{object_id}",
                    "target": f"entity:{reference['object_id']}",
                    "relation": reference["relation"],
                    "confidence": reference["confidence"],
                    "location": reference["location"],
                }
                for reference in references
            )
            missing = missing_references(references, existing)
            findings.extend(_missing_findings("dashboard", object_id, missing))
            settings = getattr(dashboard, "config", None) or {}
            views = config.get("views") if isinstance(config.get("views"), list) else []
            dashboards.append(
                {
                    "object_type": "dashboard",
                    "object_id": object_id,
                    "name": settings.get("title") or config.get("title") or object_id,
                    "url_path": url_path,
                    "mode": getattr(dashboard, "mode", None),
                    "view_count": len(views),
                    "entity_count": len({ref["object_id"] for ref in references}),
                    "missing_reference_count": len(missing),
                    "status": "active",
                    "references": references,
                }
            )
        views_of = {
            object_id: {
                key
                for index, view in enumerate(config.get("views") or [])
                for key in view_keys(view, index)
            }
            for object_id, config in configs.items()
            if isinstance(config.get("views"), list)
        }
        try:
            resources: int | None = len(lovelace.resources.async_items())
        except Exception:  # noqa: BLE001 - unknown resources only switch one check off
            resources = None
        for item in dashboards:
            item["health"] = dashboard_health(configs[item["object_id"]], views_of, resources)
        return dashboards, edges, findings

    def _scene_inventory(
        self, existing: dict[str, set[str]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[dict[str, Any]]]:
        """Describe scenes through the entities listed in their state attributes."""
        scenes: list[dict[str, Any]] = []
        edges: list[dict[str, str]] = []
        findings: list[dict[str, Any]] = []
        for state in self.hass.states.async_all("scene"):
            entity_ids = [value for value in state.attributes.get("entity_id", ()) if value]
            references = [
                {
                    "kind": "entity",
                    "object_id": entity_id,
                    "relation": "TARGETS",
                    "location": "entities",
                    "confidence": "certain",
                }
                for entity_id in entity_ids
            ]
            edges.extend(
                {
                    "source": f"scene:{state.entity_id}",
                    "target": f"entity:{reference['object_id']}",
                    "relation": reference["relation"],
                    "confidence": reference["confidence"],
                    "location": reference["location"],
                }
                for reference in references
            )
            missing = missing_references(references, existing)
            findings.extend(_missing_findings("scene", state.entity_id, missing))
            scenes.append(
                {
                    "object_type": "scene",
                    "object_id": state.entity_id,
                    "name": state.attributes.get("friendly_name", state.entity_id),
                    "status": "unavailable" if state.state == "unavailable" else "active",
                    "state": state.state,
                    "scene_id": state.attributes.get("id"),
                    "entities": entity_ids,
                    "entity_count": len(entity_ids),
                    "missing_reference_count": len(missing),
                    "references": references,
                }
            )
        return scenes, edges, findings
