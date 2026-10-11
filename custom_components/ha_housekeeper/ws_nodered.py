"""WebSocket commands for the Node-RED connection, set from the panel's settings.

The panel is the integration's configuration page, so this is where the connection is entered.
Password and token never go back to the browser: the reply only says whether one is saved.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import (
    CONF_NODERED_PASSWORD,
    CONF_NODERED_TOKEN,
    CONF_NODERED_URL,
    CONF_NODERED_USERNAME,
    DOMAIN,
)
from .nodered import NodeRedError, async_fetch_flows
from .writelock import write_holder

FIELDS = (CONF_NODERED_URL, CONF_NODERED_USERNAME, CONF_NODERED_PASSWORD, CONF_NODERED_TOKEN)
SECRETS = (CONF_NODERED_PASSWORD, CONF_NODERED_TOKEN)


def _view(options: dict[str, Any]) -> dict[str, Any]:
    """What the panel may see: address and user, and only whether a secret is saved."""
    return {
        "url": options.get(CONF_NODERED_URL) or "",
        "username": options.get(CONF_NODERED_USERNAME) or "",
        "has_password": bool(options.get(CONF_NODERED_PASSWORD)),
        "has_token": bool(options.get(CONF_NODERED_TOKEN)),
    }


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/nodered_get"})
@websocket_api.async_response
async def websocket_nodered_get(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return the saved Node-RED connection without its secrets."""
    entries = hass.config_entries.async_entries(DOMAIN)
    connection.send_result(msg["id"], _view(dict(entries[0].options) if entries else {}))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/nodered_set",
        vol.Optional("url"): str,
        vol.Optional("username"): str,
        # Left out: keep the saved one. An empty string removes it.
        vol.Optional("password"): str,
        vol.Optional("token"): str,
        vol.Optional("disconnect", default=False): bool,
    }
)
@websocket_api.async_response
async def websocket_nodered_set(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Test and save the Node-RED connection; the entry reloads and scans with it."""
    scanner = hass.data.get(DOMAIN, {}).get("scanner")
    if write_holder(hass) or (scanner is not None and scanner.cleanup.running):
        # The reload would drop the running plan's runner and journal while it still writes.
        connection.send_error(msg["id"], "busy", "A plan, undo or purge is running")
        return
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(msg["id"], "not_found", "Housekeeper is not set up")
        return
    entry = entries[0]
    options = {key: value for key, value in entry.options.items() if key not in FIELDS}
    if not msg["disconnect"]:
        saved = dict(entry.options)
        new = {
            CONF_NODERED_URL: msg.get("url", saved.get(CONF_NODERED_URL, "")).strip(),
            CONF_NODERED_USERNAME: msg.get(
                "username", saved.get(CONF_NODERED_USERNAME, "")
            ).strip(),
            CONF_NODERED_PASSWORD: msg.get("password", saved.get(CONF_NODERED_PASSWORD, "")),
            CONF_NODERED_TOKEN: msg.get("token", saved.get(CONF_NODERED_TOKEN, "")).strip(),
        }
        if not new[CONF_NODERED_URL].startswith(("http://", "https://")):
            connection.send_error(msg["id"], "nodered_invalid_url", "The address needs http(s)://")
            return
        try:
            flows = await async_fetch_flows(
                hass,
                new[CONF_NODERED_URL],
                new[CONF_NODERED_USERNAME],
                new[CONF_NODERED_PASSWORD],
                new[CONF_NODERED_TOKEN],
            )
        except NodeRedError as err:
            connection.send_error(msg["id"], f"nodered_{err}", str(err))
            return
        options.update({key: value for key, value in new.items() if value})
        tabs = sum(1 for node in flows if node.get("type") == "tab")
    else:
        tabs = 0
    if options != dict(entry.options):
        hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {**_view(options), "tabs": tabs})


def async_register(hass: HomeAssistant) -> None:
    """Register the commands of this part."""
    websocket_api.async_register_command(hass, websocket_nodered_get)
    websocket_api.async_register_command(hass, websocket_nodered_set)
