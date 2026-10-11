"""Config flow for HA Housekeeper."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry, ConfigFlowResult, OptionsFlow
from homeassistant.data_entry_flow import section
from homeassistant.helpers.selector import TextSelector, TextSelectorConfig, TextSelectorType

from .const import (
    CONF_HISTORY_DAYS,
    CONF_LOW_BATTERY_PERCENT,
    CONF_MIN_UNAVAILABLE_DAYS,
    CONF_NODERED_PASSWORD,
    CONF_NODERED_TOKEN,
    CONF_NODERED_URL,
    CONF_NODERED_USERNAME,
    CONF_SCAN_INTERVAL_HOURS,
    CONF_STALE_HOURS,
    CONF_UNUSED_AUTOMATION_DAYS,
    DEFAULT_HISTORY_DAYS,
    DEFAULT_LOW_BATTERY_PERCENT,
    DEFAULT_MIN_UNAVAILABLE_DAYS,
    DEFAULT_SCAN_INTERVAL_HOURS,
    DEFAULT_STALE_HOURS,
    DEFAULT_UNUSED_AUTOMATION_DAYS,
    DOMAIN,
    NAME,
    OPTION_LIMITS,
)
from .nodered import NodeRedError, async_fetch_flows
from .writelock import write_holder

# Example addresses for the setup help; translations may not contain URLs themselves.
NODERED_EXAMPLES = {
    "url_example": "http://192.168.1.10:1880",
    "admin_example": "http://192.168.1.10:1880/admin",
    "addon_pattern": "http://HA-ADDRESS:PORT",
    "addon_example": "http://homeassistant.local:1880",
}
NODERED_SECTION = "nodered"  # the form groups the connection; the options stay flat
NODERED_FIELDS = (
    (CONF_NODERED_URL, TextSelectorType.URL),
    (CONF_NODERED_USERNAME, TextSelectorType.TEXT),
    (CONF_NODERED_PASSWORD, TextSelectorType.PASSWORD),
    (CONF_NODERED_TOKEN, TextSelectorType.PASSWORD),
)


class HAHousekeeperOptionsFlow(OptionsFlow):
    """Diagnosis thresholds and the Node-RED connection."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Edit thresholds."""
        # Saving reloads the entry, which must not happen while a plan or purge writes.
        scanner = self.hass.data.get(DOMAIN, {}).get("scanner")
        if write_holder(self.hass) or (scanner is not None and scanner.cleanup.running):
            return self.async_abort(reason="busy")
        errors: dict[str, str] = {}
        if user_input is not None:
            user_input = {**user_input, **user_input.pop(NODERED_SECTION, {})}
            if url := user_input.get(CONF_NODERED_URL):
                try:  # a wrong address would otherwise only show up as a quiet scan status
                    await async_fetch_flows(
                        self.hass,
                        url,
                        user_input.get(CONF_NODERED_USERNAME),
                        user_input.get(CONF_NODERED_PASSWORD),
                        user_input.get(CONF_NODERED_TOKEN),
                    )
                except NodeRedError as err:
                    errors["base"] = f"nodered_{err}"
            if not errors:
                return self.async_create_entry(data=user_input)
        options = {**self.config_entry.options, **(user_input or {})}

        def field(key: str, default: int) -> tuple[Any, Any]:
            minimum, maximum = OPTION_LIMITS[key]
            return (
                vol.Required(key, default=options.get(key, default)),
                vol.All(vol.Coerce(int), vol.Range(min=minimum, max=maximum)),
            )

        schema = vol.Schema(
            dict(
                [
                    field(CONF_MIN_UNAVAILABLE_DAYS, DEFAULT_MIN_UNAVAILABLE_DAYS),
                    field(CONF_UNUSED_AUTOMATION_DAYS, DEFAULT_UNUSED_AUTOMATION_DAYS),
                    field(CONF_SCAN_INTERVAL_HOURS, DEFAULT_SCAN_INTERVAL_HOURS),
                    field(CONF_LOW_BATTERY_PERCENT, DEFAULT_LOW_BATTERY_PERCENT),
                    field(CONF_STALE_HOURS, DEFAULT_STALE_HOURS),
                    field(CONF_HISTORY_DAYS, DEFAULT_HISTORY_DAYS),
                    (
                        vol.Optional(NODERED_SECTION),
                        section(
                            vol.Schema(
                                {
                                    vol.Optional(
                                        key, description={"suggested_value": options.get(key)}
                                    ): TextSelector(TextSelectorConfig(type=kind))
                                    for key, kind in NODERED_FIELDS
                                }
                            ),
                            {"collapsed": not options.get(CONF_NODERED_URL) and not errors},
                        ),
                    ),
                ]
            )
        )
        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            errors=errors,
            description_placeholders=NODERED_EXAMPLES,
        )


class HAHousekeeperConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Configure HA Housekeeper."""

    VERSION = 1

    @staticmethod
    def async_get_options_flow(config_entry: ConfigEntry) -> HAHousekeeperOptionsFlow:
        """Return the options flow."""
        return HAHousekeeperOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Create the single local config entry."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(title=NAME, data={})

        return self.async_show_form(step_id="user")
