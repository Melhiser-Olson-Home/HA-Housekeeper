"""Dependency-free contract tests for the installable alpha package."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[1]
COMPONENT = ROOT / "custom_components" / "ha_housekeeper"


def _json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _leaf_paths(value: object, prefix: str = "") -> set[str]:
    if isinstance(value, dict):
        result: set[str] = set()
        for key, child in value.items():
            result |= _leaf_paths(child, f"{prefix}.{key}" if prefix else key)
        return result
    return {prefix}


def test_manifest_declares_installable_custom_integration() -> None:
    manifest = _json(COMPONENT / "manifest.json")
    assert manifest["domain"] == "ha_housekeeper"
    assert manifest["config_flow"] is True
    assert manifest["single_config_entry"] is True
    assert re.fullmatch(r"\d+\.\d+\.\d+(\.\d+)?", manifest["version"])  # 4th: fork release


def test_manifest_version_matches_latest_changelog_entry() -> None:
    manifest = _json(COMPONENT / "manifest.json")
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    match = re.search(r"^## (\d+\.\d+\.\d+(?:\.\d+)?) ", changelog, re.MULTILINE)
    assert match is not None
    assert match.group(1) == manifest["version"]


def test_manifest_points_to_the_fork_repository() -> None:
    """Issues about the fork go to the fork; upstream credit stays in LICENSE and README."""
    manifest = _json(COMPONENT / "manifest.json")
    assert manifest["codeowners"] == ["@wnmelhiser"]
    assert manifest["documentation"].startswith("https://github.com/Melhiser-Olson-Home/")
    assert manifest["issue_tracker"].startswith("https://github.com/Melhiser-Olson-Home/")


def test_german_and_english_translation_keys_match() -> None:
    german = _json(COMPONENT / "translations" / "de.json")
    english = _json(COMPONENT / "translations" / "en.json")
    assert _leaf_paths(german) == _leaf_paths(english)


def test_frontend_bundle_is_packaged() -> None:
    bundle = COMPONENT / "frontend" / "ha-housekeeper-panel.js"
    assert bundle.stat().st_size > 1_000
    assert "customElements.define" in bundle.read_text(encoding="utf-8")


def _websocket_source() -> str:
    """The WebSocket commands: the core module and its parts by area."""
    paths = [COMPONENT / "websocket_api.py", *sorted(COMPONENT.glob("ws_*.py"))]
    return "".join(path.read_text(encoding="utf-8") for path in paths)


def test_websocket_api_is_read_only() -> None:
    source = _websocket_source()
    assert "ha_housekeeper/inventory" not in source  # assembled from DOMAIN
    assert "async_remove" not in source
    assert "async_update_entity" not in source


def test_cleanup_plans_never_change_home_assistant() -> None:
    """Dry run and journal only: no registry or config mutation anywhere in the planner."""
    source = (COMPONENT / "cleanup.py").read_text(encoding="utf-8")
    for forbidden in ("async_remove", "async_update_entity", "async_update_device", "services"):
        assert forbidden not in source
    assert "executed" in source


def test_only_the_cleanup_runner_changes_the_registry() -> None:
    """Writes live in cleanup_exec.py: registries, configuration files, dashboards, Energy."""
    runner = (COMPONENT / "cleanup_exec.py").read_text(encoding="utf-8")
    writes = (
        "async_update_entity",
        "registry.async_remove(",
        "async_update_device",
        "async_remove_device",
        "write_utf8_file_atomic",
        "async_save(",
        "manager.async_update(",
        "async_import_statistics(",
        "async_adjust_statistics(",
    )
    assert all(write in runner for write in writes)
    for path in COMPONENT.glob("*.py"):
        if path.name == "cleanup_exec.py":
            continue
        source = path.read_text(encoding="utf-8")
        for write in writes:
            assert write not in source, f"{path.name}: {write}"


def test_every_websocket_command_uses_current_admin_decorator() -> None:
    source = _websocket_source()
    assert source.count("@websocket_api.websocket_command") == 71
    assert source.count("@websocket_api.require_admin") == 71
    assert "connection.require_admin" not in source


def test_websocket_scan_errors_are_actionable() -> None:
    source = (COMPONENT / "websocket_api.py").read_text(encoding="utf-8")
    assert 'connection.send_error(msg["id"], "scan_failed"' in source


def test_initial_scan_uses_a_tracked_background_task() -> None:
    source = (COMPONENT / "__init__.py").read_text(encoding="utf-8")
    assert "entry.async_create_background_task" in source
    assert "hass.async_create_task(scanner.async_scan())" not in source


def test_panel_javascript_unit_tests_pass() -> None:
    """Run the Node-based panel tests; skipped where Node.js is unavailable."""
    import shutil
    import subprocess

    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js not installed")
    result = subprocess.run(
        [node, "--test", "tests/panel.test.mjs"],
        cwd=COMPONENT.parents[1],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_every_optional_component_that_is_imported_is_an_after_dependency() -> None:
    """Hassfest rejects imports of other components that the manifest does not mention."""
    import json
    import re

    manifest = json.loads((COMPONENT / "manifest.json").read_text(encoding="utf-8"))
    declared = set(manifest.get("dependencies", [])) | set(manifest.get("after_dependencies", []))
    used = set()
    for path in COMPONENT.glob("*.py"):
        used |= set(
            re.findall(r"homeassistant\.components\.(\w+)", path.read_text(encoding="utf-8"))
        )
    # homeassistant is the core component, sensor is an entity platform and http/websocket_api/frontend are core; Hassfest accepts them
    assert used - {"websocket_api", "frontend", "http", "sensor", "homeassistant"} <= declared, (
        used - declared
    )


def test_every_finding_module_publishes_its_limits_as_numbers() -> None:
    from custom_components.ha_housekeeper import db_health, reliability, run_health, storms

    for module in (db_health, reliability, run_health, storms):
        assert module.THRESHOLDS, module.__name__
        for name, value in module.THRESHOLDS.items():
            assert isinstance(value, int | float) and not isinstance(value, bool), (module, name)


def test_no_two_panel_parts_define_a_method_of_the_same_name() -> None:
    """The parts are mixed into one class; a later one silently replaces an earlier one."""
    seen: dict[str, str] = {}
    for part in sorted((ROOT / "panel-src").glob("*.js")):
        names = re.findall(
            r"^  (?:async )?([A-Za-z_]\w*)\(.*\) \{$", part.read_text(encoding="utf-8"), re.M
        )
        for name in set(names) - {"if", "for", "while", "switch", "catch"}:
            assert name not in seen, f"{name} is defined in {seen[name]} and {part.name}"
            seen[name] = part.name


def test_the_panel_knows_the_same_action_kinds_as_the_backend() -> None:
    """The panel keeps its own copies of the kind sets; they must not drift from the backend."""
    pytest.importorskip("homeassistant")
    from custom_components.ha_housekeeper import cleanup, protection

    source = (ROOT / "panel-src" / "02-constants.js").read_text(encoding="utf-8")

    def js(name: str) -> set[str]:
        match = re.search(rf"^const {name} = \[([^\]]*)\];", source, re.MULTILINE)
        assert match, name
        return set(re.findall(r'"([a-z_]+)"', match.group(1)))

    assert js("REMOVAL_KINDS") == cleanup.REMOVAL_KINDS
    assert js("BACKUP_KINDS") == cleanup.BACKUP_KINDS
    assert js("PURGE_KINDS") == protection.IRREVERSIBLE_KINDS
    assert js("REPAIR_KINDS") == cleanup.REPAIR_KINDS
    assert js("DEVICE_KINDS") == cleanup.DEVICE_KINDS
    assert js("CLEANUP_KINDS") == cleanup.ENTITY_KINDS | cleanup.DEVICE_KINDS
    assert f"const MAX_PLAN_ACTIONS = {cleanup.MAX_ACTIONS};" in source
