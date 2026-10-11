"""Node-RED flows as consumers of Home Assistant entities and devices: read-only.

Node-RED keeps its flows outside Home Assistant, so automations built there are invisible to the
rest of the scan. This module reads the flows through the Node-RED admin API (``GET /flows``) and
turns every flow tab into one object whose references join the dependency graph like those of an
automation. Nothing is ever written to Node-RED.

Confidence follows the rest of Housekeeper: a field of a Home Assistant node that names an entity,
device, area, floor or label is ``certain``. Anything found by reading text (templates, function
code, switch and change rules) is ``probable``. That includes the device serial numbers that event
driven flows match on, such as Lutron Pico remotes picked from ``lutron_caseta_button_event`` by
their serial. Text matches only count for objects that exist, so code can never create a false
"missing" finding.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from typing import Any

import aiohttp
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .dashboard_analysis import ENTITY_ID

OBJECT_TYPE = "nodered_flow"
TIMEOUT = aiohttp.ClientTimeout(total=15)
ENTITY_IN_TEXT = re.compile(r"(?<![\w.])([a-z0-9_]+\.[a-z0-9_]+)(?![\w])")
DEVICE_ID_IN_TEXT = re.compile(r"(?<![0-9a-f])([0-9a-f]{32})(?![0-9a-f])")
# Quoted literals and bare numbers: how serial numbers appear in function code and rules.
LITERAL_IN_TEXT = re.compile(r"[\"'`]([^\"'`\s]{6,64})[\"'`]|(?<![\w.])(\d{6,20})(?![\w.])")
MIN_SERIAL = 6  # shorter identifiers ("1", "hub") would match by coincidence
# Fields of node-red-contrib-home-assistant-websocket nodes, per relation.
TRIGGER_TYPES = frozenset(
    {"server-state-changed", "trigger-state", "poll-state", "ha-time", "ha-zone", "ha-wait-until"}
)
CONDITION_TYPES = frozenset({"api-current-state", "api-get-history", "ha-get-entities"})
TARGET_FIELDS = {
    "entityId": "entity",
    "deviceId": "device",
    "areaId": "area",
    "floorId": "floor",
    "labelId": "label",
}
TEXT_FIELDS = ("func", "template", "rules", "data", "payload", "initialize", "finalize")
SKIP_FIELDS = frozenset({"id", "type", "z", "g", "wires", "x", "y", "name", "info", "server"})


class NodeRedError(Exception):
    """Node-RED could not be read; the message is a reason code."""


def _url(base: str, path: str) -> str:
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


async def async_fetch_flows(
    hass: HomeAssistant,
    url: str,
    username: str | None = None,
    password: str | None = None,
    token: str | None = None,
) -> list[dict[str, Any]]:
    """Read all flows from the Node-RED admin API, or raise ``NodeRedError``.

    With a username, a read-only token is requested first (``POST /auth/token``); an access token
    can also be given directly. Without either, Node-RED must allow anonymous reading.
    """
    session = async_get_clientsession(hass)
    headers = {"Node-RED-API-Version": "v1", "Accept": "application/json"}
    try:
        if not token and username:
            async with session.post(
                _url(url, "auth/token"),
                data={
                    "client_id": "node-red-admin",
                    "grant_type": "password",
                    "scope": "read",
                    "username": username,
                    "password": password or "",
                },
                timeout=TIMEOUT,
            ) as response:
                if response.status in (401, 403):
                    raise NodeRedError("invalid_auth")
                response.raise_for_status()
                token = (await response.json()).get("access_token")
                if not token:
                    raise NodeRedError("invalid_auth")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        async with session.get(_url(url, "flows"), headers=headers, timeout=TIMEOUT) as response:
            if response.status in (401, 403):
                raise NodeRedError("invalid_auth")
            response.raise_for_status()
            flows = await response.json(content_type=None)
    except NodeRedError:
        raise
    except (aiohttp.ClientError, TimeoutError, ValueError) as err:
        raise NodeRedError("cannot_connect") from err
    if isinstance(flows, Mapping):  # API version v2 wraps the list
        flows = flows.get("flows")
    if not isinstance(flows, list):
        raise NodeRedError("invalid_response")
    return [node for node in flows if isinstance(node, Mapping)]


def device_serials(devices: Iterable[Any]) -> dict[str, set[str]]:
    """Map serial numbers and identifier values of devices to their device IDs."""
    index: dict[str, set[str]] = {}
    for device in devices:
        values = {getattr(device, "serial_number", None)}
        values.update(
            value for identifier in getattr(device, "identifiers", ()) for value in identifier[1:]
        )
        for value in values:
            if isinstance(value, (str, int)) and len(str(value)) >= MIN_SERIAL:
                index.setdefault(str(value), set()).add(device.id)
    return index


def _as_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value else []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str) and item]
    return []


def _strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, Mapping):
        for child in value.values():
            yield from _strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from _strings(child)


class _Collector:
    """References of one flow, without duplicates per target, relation and place."""

    def __init__(self, existing: Mapping[str, set[str]], serials: Mapping[str, set[str]]):
        self.existing = existing
        self.serials = serials
        self.found: list[dict[str, str]] = []
        self._seen: set[tuple[str, str, str, str]] = set()

    def add(self, kind: str, object_id: str, relation: str, location: str, confidence: str):
        key = (kind, object_id, relation, location)
        if key in self._seen:
            return
        self._seen.add(key)
        self.found.append(
            {
                "kind": kind,
                "object_id": object_id,
                "relation": relation,
                "location": location,
                "confidence": confidence,
            }
        )

    def matching(self, patterns: list[str], substring: bool, location: str, relation: str):
        """Entities a substring or regex filter selects today: probable, they may change."""
        for pattern in patterns:
            try:
                matcher = re.compile(pattern)
            except re.error:
                continue
            for entity_id in self.existing.get("entity", ()):
                if (pattern in entity_id) if substring else matcher.search(entity_id):
                    self.add("entity", entity_id, relation, location, "probable")

    def text(self, value: Any, location: str):
        """Entity IDs, device IDs and device serials inside code, templates and rules."""
        entities = self.existing.get("entity", set())
        devices = self.existing.get("device", set())
        for text in _strings(value):
            for match in ENTITY_IN_TEXT.findall(text):
                if match in entities:
                    self.add("entity", match, "REFERENCES", location, "probable")
            for match in DEVICE_ID_IN_TEXT.findall(text):
                if match in devices:
                    self.add("device", match, "REFERENCES", location, "probable")
            for quoted, bare in LITERAL_IN_TEXT.findall(text):
                for device_id in self.serials.get(quoted or bare, ()):
                    self.add("device", device_id, "REFERENCES", location, "probable")


def _node_references(node: Mapping[str, Any], collect: _Collector) -> None:
    """Add the references of one node."""
    kind = node.get("type")
    place = str(node.get("name") or node.get("id"))
    relation = (
        "TRIGGERS_ON"
        if kind in TRIGGER_TYPES
        else "USES_AS_CONDITION"
        if kind in CONDITION_TYPES
        else "TARGETS"
    )
    is_ha = "server" in node  # every Home Assistant node names its server config node

    if is_ha:
        # Entity lists: {"entity": [...], "substring": [...], "regex": [...]} since version 5.
        entities = node.get("entities")
        if isinstance(entities, Mapping):
            for entity_id in _as_list(entities.get("entity")):
                collect.add("entity", entity_id, relation, f"{place}/entities", "certain")
            collect.matching(_as_list(entities.get("substring")), True, place, relation)
            collect.matching(_as_list(entities.get("regex")), False, place, relation)
        elif isinstance(entities, list):  # ha-zone and older nodes
            for entity_id in _as_list(entities):
                if ENTITY_ID.match(entity_id):
                    collect.add("entity", entity_id, relation, f"{place}/entities", "certain")
        for field, target in TARGET_FIELDS.items():
            if field == "entityId" and node.get("entityIdType") in ("substring", "regex"):
                collect.matching(
                    _as_list(node.get(field)), node["entityIdType"] == "substring", place, relation
                )
                continue
            for object_id in _as_list(node.get(field)):
                if target != "entity" or ENTITY_ID.match(object_id):
                    collect.add(target, object_id, relation, f"{place}/{field}", "certain")
        for field in ("entity_id", "entityid"):  # api-current-state and old versions
            for entity_id in _as_list(node.get(field)):
                if ENTITY_ID.match(entity_id):
                    collect.add("entity", entity_id, relation, f"{place}/{field}", "certain")
        if isinstance(node.get("device"), str) and node["device"]:  # device trigger and action
            collect.add("device", node["device"], relation, f"{place}/device", "certain")

    for field in TEXT_FIELDS:
        if field in node:
            collect.text(node[field], f"{place}/{field}")
    if not is_ha:
        # Nodes of other packages: an exact entity ID in any setting, never a missing finding.
        for field, value in node.items():
            if field in SKIP_FIELDS or field in TEXT_FIELDS:
                continue
            for text in _strings(value):
                if text in collect.existing.get("entity", ()):
                    collect.add("entity", text, "REFERENCES", f"{place}/{field}", "probable")


def analyze_flows(
    flows: list[Mapping[str, Any]],
    existing: Mapping[str, set[str]],
    serials: Mapping[str, set[str]] | None = None,
) -> list[dict[str, Any]]:
    """Describe every enabled flow tab and subflow with the references of its enabled nodes.

    Returns ``{"id", "name", "kind", "node_count", "references"}`` per flow, in Node-RED order.
    """
    containers: dict[str, dict[str, Any]] = {}
    for node in flows:
        if node.get("type") in ("tab", "subflow") and node.get("id"):
            if node.get("disabled"):
                continue
            containers[node["id"]] = {
                "id": node["id"],
                "name": node.get("label") or node.get("name") or node["id"],
                "kind": node["type"],
                "node_count": 0,
                "collector": _Collector(existing, serials or {}),
            }
    for node in flows:
        flow = containers.get(node.get("z"))
        if flow is None or node.get("d") or node.get("type") in ("group", "comment"):
            continue
        flow["node_count"] += 1
        _node_references(node, flow["collector"])
    return [
        {
            "id": flow["id"],
            "name": flow["name"],
            "kind": flow["kind"],
            "node_count": flow["node_count"],
            "references": flow.pop("collector").found,
        }
        for flow in containers.values()
    ]
