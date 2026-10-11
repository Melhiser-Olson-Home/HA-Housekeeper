"""Node-RED flows as consumers: reference extraction, the scan step and what cleanup makes of it."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import pytest

pytest.importorskip("homeassistant")
pytest.importorskip("pytest_homeassistant_custom_component")

from homeassistant.core import HomeAssistant  # noqa: E402
from homeassistant.helpers import entity_registry as er  # noqa: E402
from test_cleanup_devices import make_device, make_device_plan  # noqa: E402
from test_cleanup_exec import make_scanner  # noqa: E402

from custom_components.ha_housekeeper.cleanup import USAGE_RELATIONS  # noqa: E402
from custom_components.ha_housekeeper.nodered import (  # noqa: E402
    NodeRedError,
    analyze_flows,
    created_entities,
    device_serials,
)
from custom_components.ha_housekeeper.references import SourceError, load_source  # noqa: E402

FETCH = "custom_components.ha_housekeeper.inventory.async_fetch_flows"
SERVER = "srv1"


def tab(tab_id: str, label: str, **extra):
    return {"id": tab_id, "type": "tab", "label": label, "disabled": False, **extra}


def node(node_id: str, kind: str, z: str = "t1", **fields):
    return {"id": node_id, "type": kind, "z": z, "name": node_id, "wires": [[]], **fields}


def ha(node_id: str, kind: str, z: str = "t1", **fields):
    return node(node_id, kind, z, server=SERVER, **fields)


EXISTING = {
    "entity": {"light.porch", "person.alex", "sensor.season", "input_button.charge", "light.hall"},
    "device": {"d" * 32, "picodev"},
    "area": {"kitchen"},
    "floor": set(),
    "label": set(),
}


def refs(flows, existing=EXISTING, serials=None):
    [flow] = analyze_flows(flows, existing, serials or {})
    return {(r["kind"], r["object_id"], r["relation"], r["confidence"]) for r in flow["references"]}


def test_home_assistant_nodes_are_certain_references() -> None:
    found = refs(
        [
            tab("t1", "Lights"),
            {"id": SERVER, "type": "server", "name": "Home Assistant"},
            ha("call", "api-call-service", action="light.turn_off", entityId=["light.porch"],
               deviceId=["d" * 32], areaId=["kitchen"], floorId=[], labelId=[], data=""),
            ha("state", "api-current-state", entity_id="person.alex"),
            ha("trigger", "trigger-state",
               entities={"entity": ["input_button.charge"], "substring": [], "regex": []}),
            ha("poll", "poll-state", entityId="sensor.season"),
        ]
    )  # fmt: skip
    assert found == {
        ("entity", "light.porch", "TARGETS", "certain"),
        ("device", "d" * 32, "TARGETS", "certain"),
        ("area", "kitchen", "TARGETS", "certain"),
        ("entity", "person.alex", "USES_AS_CONDITION", "certain"),
        ("entity", "input_button.charge", "TRIGGERS_ON", "certain"),
        ("entity", "sensor.season", "TRIGGERS_ON", "certain"),
    }
    assert all(relation in USAGE_RELATIONS for _, _, relation, _ in found)


def test_text_matches_are_probable_and_only_for_existing_objects() -> None:
    found = refs(
        [
            tab("t1", "Templates"),
            ha("tpl", "api-render-template", template="{{ states('sensor.season') }} sensor.gone"),
            node("fn", "function", func="if (msg.entity_id === 'light.hall') return msg;"),
            ha("sub", "server-state-changed",
               entities={"entity": [], "substring": ["light."], "regex": []}),
        ]
    )  # fmt: skip
    assert found == {
        ("entity", "sensor.season", "REFERENCES", "probable"),
        ("entity", "light.hall", "REFERENCES", "probable"),
        ("entity", "light.porch", "TRIGGERS_ON", "probable"),
        ("entity", "light.hall", "TRIGGERS_ON", "probable"),
    }


def test_pico_serial_in_function_code_links_the_device_not_its_entities() -> None:
    """Event flows pick a remote by its serial: a probable use of the device itself."""
    serials = device_serials(
        [SimpleNamespace(id="picodev", serial_number=None, identifiers={("lutron", "93017472")})]
    )
    code = 'const deviceMap = { "93017472": "Stairs Right" };\nconst n = 123;'
    found = refs(
        [
            tab("t1", "Pico Remotes"),
            ha("events", "server-events", eventType="lutron_caseta_button_event"),
            node("fn", "function", func=code),
        ],
        serials=serials,
    )
    assert found == {("device", "picodev", "REFERENCES", "probable")}


def test_short_identifiers_never_count_as_serials() -> None:
    serials = device_serials(
        [SimpleNamespace(id="x", serial_number="12", identifiers={("hue", "1"), ("zha", "abc")})]
    )
    assert serials == {}


def test_disabled_tabs_and_nodes_are_skipped() -> None:
    flows = analyze_flows(
        [
            tab("t1", "On"),
            tab("t2", "Off", disabled=True),
            ha("a", "api-call-service", entityId=["light.porch"], d=True),
            ha("b", "api-call-service", "t2", entityId=["light.hall"]),
            ha("c", "api-current-state", entity_id="person.alex"),
        ],
        EXISTING,
    )
    assert [(f["id"], f["node_count"]) for f in flows] == [("t1", 1)]
    assert [r["object_id"] for r in flows[0]["references"]] == ["person.alex"]


async def test_scan_adds_flows_edges_and_missing_findings(hass: HomeAssistant) -> None:
    registry = er.async_get(hass)
    lamp = registry.async_get_or_create("light", "test", "lamp", suggested_object_id="lamp")
    hass.states.async_set(lamp.entity_id, "on")
    flows = [
        tab("t1", "Evening"),
        ha("on", "api-call-service", entityId=[lamp.entity_id, "light.removed"]),
    ]
    scanner = await make_scanner(hass)
    scanner.nodered = {"url": "http://nodered:1880"}
    with patch(FETCH, return_value=flows):
        snapshot = await scanner.async_scan()

    flow = next(o for o in snapshot["objects"] if o["object_type"] == "nodered_flow")
    assert flow["name"] == "Evening" and flow["missing_reference_count"] == 1
    assert flow["editor_url"] == "http://nodered:1880/#flow/t1"
    assert {
        "source": "nodered_flow:t1",
        "target": f"entity:{lamp.entity_id}",
        "relation": "TARGETS",
        "confidence": "certain",
        "location": "on/entityId",
    } in snapshot["edges"]
    [missing] = [f for f in snapshot["findings"] if f["rule_id"] == "nodered_flow.missing_entity"]
    assert missing["affected_object"] == "light.removed"
    assert snapshot["meta"]["nodered"]["flow_count"] == 1
    assert "url" not in snapshot["meta"]["nodered"]  # diagnostics export the meta

    # Node-RED goes away: the last flows read keep their uses alive.
    with patch(FETCH, side_effect=NodeRedError("cannot_connect")):
        snapshot = await scanner.async_scan()
    assert snapshot["meta"]["nodered"]["cached"] is True
    assert snapshot["meta"]["nodered"]["error"] == "cannot_connect"
    assert any(e["source"] == "nodered_flow:t1" for e in snapshot["edges"])


async def test_unconfigured_node_red_changes_nothing(hass: HomeAssistant) -> None:
    scanner = await make_scanner(hass)
    with patch(FETCH) as fetch:
        snapshot = await scanner.async_scan()
    fetch.assert_not_called()
    assert snapshot["meta"]["nodered"] == {"configured": False}


async def test_pico_used_by_node_red_warns_before_disabling_the_device(
    hass: HomeAssistant,
) -> None:
    """The device plan warns (probable use), its unused entities stay candidates on their own."""
    _, device, members = await make_device(hass, "93017472", entities=1)
    flows = [
        tab("t1", "Picos"),
        node("fn", "function", func='const map = { "93017472": "Stairs" };'),
    ]
    scanner = await make_scanner(hass)
    scanner.nodered = {"url": "http://nodered:1880"}
    with patch(FETCH, return_value=flows):
        plan = await make_device_plan(scanner, hass, "disable_device", device.id)
        snapshot = scanner.snapshot

    action = plan["actions"][0]
    assert "used_probable" in action["reasons"]
    assert "used_certain" not in action["reasons"]
    assert [use["source"] for use in action["used_by"]] == ["nodered_flow:t1"]
    # Nothing points at the entity itself, so it is judged as unused on its own.
    assert not any(
        e["target"] == f"entity:{members[0].entity_id}" and e["relation"] in USAGE_RELATIONS
        for e in snapshot["edges"]
    )


async def test_node_red_flows_are_never_rewritten(hass: HomeAssistant) -> None:
    snapshot = {"objects": [{"object_type": "nodered_flow", "object_id": "t1", "name": "x"}]}
    with pytest.raises(SourceError, match="nodered"):
        await load_source(hass, snapshot, "nodered_flow:t1")


async def test_options_check_the_node_red_address(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    from homeassistant.data_entry_flow import FlowResultType
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.ha_housekeeper.const import DOMAIN

    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    check = "custom_components.ha_housekeeper.config_flow.async_fetch_flows"
    result = await hass.config_entries.options.async_init(entry.entry_id)
    with patch(check, side_effect=NodeRedError("invalid_auth")):
        result = await hass.config_entries.options.async_configure(
            result["flow_id"],
            {"nodered": {"nodered_url": "http://nodered:1880", "nodered_token": "bad"}},
        )
    assert result["type"] == FlowResultType.FORM
    assert result["errors"] == {"base": "nodered_invalid_auth"}
    with patch(check, return_value=[]):
        result = await hass.config_entries.options.async_configure(
            result["flow_id"],
            {"nodered": {"nodered_url": "http://nodered:1880", "nodered_token": "good"}},
        )
    assert result["type"] == FlowResultType.CREATE_ENTRY
    assert entry.options["nodered_url"] == "http://nodered:1880"


SERVER_NODE = {"id": SERVER, "type": "server", "name": "Home Assistant"}


def companion(entity_id: str, node_id: str, server: str = SERVER):
    return {
        "object_id": entity_id,
        "platform": "nodered",
        "unique_id": f"nodered-{server}-{node_id}",
    }


def test_created_entities_follow_their_node_or_entity_config() -> None:
    flows = [
        tab("t1", "Garage"),
        SERVER_NODE,
        {"id": "cfg1", "type": "ha-entity-config", "server": SERVER, "name": "Door button"},
        ha("btn", "ha-button", entityConfig="cfg1"),
        ha("ev", "server-state-changed", exposeAsEntityConfig="cfg2"),
        ha("old", "ha-sensor"),  # older entity nodes register under their own ID
        ha("off", "ha-sensor", d=True),
    ]
    found = {
        c["entity_id"]: c
        for c in created_entities(
            flows,
            [
                companion("button.door", "cfg1"),
                companion("switch.expose", "cfg2"),
                companion("sensor.old", "old"),
                companion("sensor.disabled_node", "off"),
                companion("sensor.gone", "deleted"),
                companion("sensor.other_server", "x", server="elsewhere"),
                {"object_id": "light.porch", "platform": "hue", "unique_id": "nodered-srv1-btn"},
            ],
        )
    }
    assert set(found) == {
        "button.door", "switch.expose", "sensor.old", "sensor.disabled_node", "sensor.gone"
    }  # fmt: skip
    assert found["button.door"]["flows"] == ["t1"] and found["button.door"]["input"]
    assert found["switch.expose"]["flows"] == ["t1"] and found["switch.expose"]["input"]
    assert found["sensor.old"]["flows"] == ["t1"] and not found["sensor.old"]["input"]
    # A disabled node still exists: no owner, but not left behind either.
    assert found["sensor.disabled_node"] == {
        "entity_id": "sensor.disabled_node", "node_id": "off", "flows": [],
        "input": False, "node_missing": False,
    }  # fmt: skip
    assert found["sensor.gone"]["node_missing"] is True


async def test_scan_links_created_entities_and_flags_leftovers(hass: HomeAssistant) -> None:
    registry = er.async_get(hass)

    def create(domain: str, node_id: str):
        entry = registry.async_get_or_create(
            domain, "nodered", f"nodered-{SERVER}-{node_id}", suggested_object_id=node_id
        )
        hass.states.async_set(entry.entity_id, "on")
        return entry.entity_id

    button, sensor, leftover = (
        create("button", "btn"),
        create("sensor", "sns"),
        create("sensor", "gone"),
    )
    flows = [
        tab("t1", "Garage"),
        SERVER_NODE,
        ha("btn", "ha-button"),
        ha("sns", "ha-sensor"),
    ]
    scanner = await make_scanner(hass)
    scanner.nodered = {"url": "http://nodered:1880"}
    with patch(FETCH, return_value=flows):
        snapshot = await scanner.async_scan()

    def relation(entity_id: str):
        return [
            e["relation"] for e in snapshot["edges"]
            if e["source"] == "nodered_flow:t1" and e["target"] == f"entity:{entity_id}"
        ]  # fmt: skip

    assert relation(button) == ["TRIGGERS_ON"]  # used: disabling it breaks the flow
    assert relation(sensor) == ["PROVIDES"]  # only written: still counts as unused
    assert not any(
        e["target"] == f"entity:{sensor}" and e["relation"] in USAGE_RELATIONS
        for e in snapshot["edges"]
    )
    [gone] = [f for f in snapshot["findings"] if f["rule_id"] == "entity.nodered_node_missing"]
    assert gone["object_id"] == leftover and gone["classification"] == "orphaned"

    # From the cached copy nothing is called left behind; the links stay.
    with patch(FETCH, side_effect=NodeRedError("cannot_connect")):
        snapshot = await scanner.async_scan()
    assert not [f for f in snapshot["findings"] if f["rule_id"] == "entity.nodered_node_missing"]
    assert relation(button) == ["TRIGGERS_ON"]


async def test_panel_saves_the_connection_and_never_returns_secrets(
    hass: HomeAssistant, hass_ws_client
) -> None:
    from pytest_homeassistant_custom_component.common import MockConfigEntry
    from test_homeassistant_runtime import _ws_setup

    from custom_components.ha_housekeeper.const import DOMAIN

    entry = MockConfigEntry(
        domain=DOMAIN, data={}, options={"min_unavailable_days": 7, "nodered_password": "old"}
    )
    entry.add_to_hass(hass)
    _, client = await _ws_setup(hass, hass_ws_client)
    check = "custom_components.ha_housekeeper.ws_nodered.async_fetch_flows"

    async def ask(**msg):
        await client.send_json_auto_id(msg)
        return await client.receive_json()

    reply = await ask(type="ha_housekeeper/nodered_get")
    assert reply["result"] == {"url": "", "username": "", "has_password": True, "has_token": False}

    with patch(check, side_effect=NodeRedError("invalid_auth")):
        reply = await ask(type="ha_housekeeper/nodered_set", url="http://nr:1880", username="wes")
    assert reply["error"]["code"] == "nodered_invalid_auth"
    assert "nodered_url" not in entry.options  # nothing saved on a failed test

    reply = await ask(type="ha_housekeeper/nodered_set", url="nr:1880")
    assert reply["error"]["code"] == "nodered_invalid_url"

    flows = [tab("t1", "A"), tab("t2", "B")]
    with patch(check, return_value=flows) as fetch:
        reply = await ask(type="ha_housekeeper/nodered_set", url="http://nr:1880", username="wes")
    fetch.assert_awaited_once()
    assert fetch.await_args.args[1:] == ("http://nr:1880", "wes", "old", "")  # kept password
    assert reply["result"]["tabs"] == 2 and reply["result"]["has_password"] is True
    assert "old" not in str(reply)
    assert entry.options["nodered_url"] == "http://nr:1880"
    assert entry.options["nodered_password"] == "old" and entry.options["min_unavailable_days"] == 7

    reply = await ask(type="ha_housekeeper/nodered_set", disconnect=True)
    assert reply["result"]["url"] == ""
    assert not any(key.startswith("nodered_") for key in entry.options)
    assert entry.options["min_unavailable_days"] == 7
