"""Constants for HA Housekeeper."""

from typing import Final

DOMAIN: Final = "ha_housekeeper"
NAME: Final = "HA Housekeeper"

PANEL_URL: Final = "ha-housekeeper"
PANEL_ELEMENT: Final = "ha-housekeeper-panel"
FRONTEND_URL: Final = "/ha_housekeeper/ha-housekeeper-panel.js"
LOGO_URL: Final = "/ha_housekeeper/logo.png"
FONTS_URL: Final = "/ha_housekeeper/fonts"

STORAGE_KEY: Final = f"{DOMAIN}.observations"
IGNORED_STORAGE_KEY: Final = f"{DOMAIN}.ignored"
HISTORY_STORAGE_KEY: Final = f"{DOMAIN}.history"
PREFLIGHT_STORAGE_KEY: Final = f"{DOMAIN}.preflight"
POLICIES_STORAGE_KEY: Final = f"{DOMAIN}.policies"
REPLIES_STORAGE_KEY: Final = f"{DOMAIN}.replies"
ATTEST_STORAGE_KEY: Final = f"{DOMAIN}.attest"
EVENTS_STORAGE_KEY: Final = f"{DOMAIN}.events"
RUNS_STORAGE_KEY: Final = f"{DOMAIN}.runs"
MARKS_STORAGE_KEY: Final = f"{DOMAIN}.marks"
GOALS_STORAGE_KEY: Final = f"{DOMAIN}.goals"
CRITERIA_STORAGE_KEY: Final = f"{DOMAIN}.criteria"
COVERAGE_STORAGE_KEY: Final = f"{DOMAIN}.coverage"
REFACTOR_STORAGE_KEY: Final = f"{DOMAIN}.refactor"
PROTECTION_STORAGE_KEY: Final = f"{DOMAIN}.protection"
SIGNALS_STORAGE_KEY: Final = f"{DOMAIN}.signals"
ENTRY_STATES_STORAGE_KEY: Final = f"{DOMAIN}.entry_states"
REMINDERS_STORAGE_KEY: Final = f"{DOMAIN}.reminders"
NOTES_STORAGE_KEY: Final = f"{DOMAIN}.notes"
BATTERY_STORAGE_KEY: Final = f"{DOMAIN}.batteries"
WINDOW_STORAGE_KEY: Final = f"{DOMAIN}.window"
NOTIFY_STORAGE_KEY: Final = f"{DOMAIN}.notify"
STALE_STORAGE_KEY: Final = f"{DOMAIN}.stale"
NODERED_STORAGE_KEY: Final = f"{DOMAIN}.nodered"
STORAGE_VERSION: Final = 1

CONF_MIN_UNAVAILABLE_DAYS: Final = "min_unavailable_days"
DEFAULT_MIN_UNAVAILABLE_DAYS: Final = 7
CONF_SCAN_INTERVAL_HOURS: Final = "scan_interval_hours"
DEFAULT_SCAN_INTERVAL_HOURS: Final = 24
CONF_UNUSED_AUTOMATION_DAYS: Final = "unused_automation_days"
DEFAULT_UNUSED_AUTOMATION_DAYS: Final = 90
CONF_LOW_BATTERY_PERCENT: Final = "low_battery_percent"
DEFAULT_LOW_BATTERY_PERCENT: Final = 20
CONF_STALE_HOURS: Final = "stale_hours"
DEFAULT_STALE_HOURS: Final = 48
# Node-RED admin API; flows read there count as consumers of entities and devices.
CONF_NODERED_URL: Final = "nodered_url"
CONF_NODERED_USERNAME: Final = "nodered_username"
CONF_NODERED_PASSWORD: Final = "nodered_password"
CONF_NODERED_TOKEN: Final = "nodered_token"
CONF_HISTORY_DAYS: Final = "history_days"
DEFAULT_HISTORY_DAYS: Final = 30
JOURNAL_STORAGE_KEY: Final = f"{DOMAIN}.journal"
# Earliest point at which a quarantined entity may be removed (a later step, preview only today).
QUARANTINE_DAYS: Final = 14
IGNORE_LABEL: Final = "housekeeper_ignore"
CRITICAL_LABEL: Final = "housekeeper_critical"
# Allowed range (min, max) per option, shared by the options flow and the panel command.
OPTION_LIMITS: Final = {
    CONF_MIN_UNAVAILABLE_DAYS: (0, 365),
    CONF_UNUSED_AUTOMATION_DAYS: (0, 3650),
    CONF_SCAN_INTERVAL_HOURS: (0, 720),
    CONF_LOW_BATTERY_PERCENT: (1, 100),
    CONF_STALE_HOURS: (0, 8760),
    CONF_HISTORY_DAYS: (1, 365),
}
# While Home Assistant is still starting, entities of slow integrations have no state yet.
# Scans in this window are preliminary: they change no stored observations, issues or history.
WARMUP_SECONDS: Final = 300
# Version of the WebSocket reply contract; raise it when a field is renamed or removed.
API_SCHEMA: Final = 1
SIGNAL_SCAN_COMPLETE: Final = f"{DOMAIN}_scan_complete"

# Undo data kept in the journal for a rewritten YAML file: files up to MAX_FILE_BACKUP are kept
# whole (byte-exact undo); one plan keeps at most MAX_PLAN_SNAPSHOTS of such copies.
MAX_FILE_BACKUP: Final = 512 * 1024
MAX_PLAN_SNAPSHOTS: Final = 2 * 1024 * 1024
