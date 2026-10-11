const ICONS = {
  entity: "mdi:shape-outline", device: "mdi:devices", config_entry: "mdi:puzzle-outline",
  area: "mdi:floor-plan", automation: "mdi:robot-outline", floor: "mdi:layers-outline",
  label: "mdi:label-outline", script: "mdi:script-text-outline", scene: "mdi:palette-outline", dashboard: "mdi:view-dashboard-outline",
  nodered_flow: "mdi:sitemap-outline",
};

const REMOVAL_KINDS = ["remove_entity", "remove_device", "forget_device"];
// Kinds that get a Home Assistant backup first (as in the backend).
const BACKUP_KINDS = ["remove_entity", "remove_device", "forget_device", "replace_references", "rename_entity", "migrate_meter", "purge_statistics", "trim_history", "delete_automation", "refactor_automation", "repair_counter", "repair_range"];
// Deleting recorder rows: cannot be undone, only the backup brings them back.
const PURGE_KINDS = ["purge_statistics", "trim_history", "delete_backup"];
// Reasons that mean "all is well, there is nothing to do" and not "Housekeeper may not".
const NOTHING_REASONS = ["nothing_found", "nothing_to_do"];
const REPAIR_KINDS = ["repair_counter", "repair_range"];
const IMPACT_RANK = { none: 0, low: 1, medium: 2, high: 3 };
const BACKUP_FAILURES = ["backup_failed", "backup_small_failed", "backup_unavailable", "no_backup_agent"];
const DEVICE_KINDS = ["disable_device", "remove_device", "forget_device"];
// What a finished action says it did; kinds not listed just say "done".
const DONE_RESULTS = Object.fromEntries([
  ...REMOVAL_KINDS.map(kind => [kind, "removed"]), ...REPAIR_KINDS.map(kind => [kind, "repaired"]), ...PURGE_KINDS.map(kind => [kind, "purged"]),
  ["delete_automation", "purged"], ["replace_references", "replaced"], ["refactor_automation", "refactored"], ["migrate_meter", "migrated"],
  ["add_label", "labeled"], ["set_area", "area"], ["rename_entity", "renamed"],
]);

const MAX_PLAN_ACTIONS = 200; // as MAX_ACTIONS in cleanup.py: more entries do not fit into one plan
const PREFS_KEY = "ha_housekeeper.prefs";
const DEFAULT_PREFS = { size: "normal", mode: "auto", scheme: "standard", density: "normal", motion: "auto", pageSize: 20, startView: "overview", graphMode: "list", language: "auto" };
const USER_DATA_KEY = "ha_housekeeper";
const OPTION_LIMITS = { min_unavailable_days: [0, 365], unused_automation_days: [0, 3650], scan_interval_hours: [0, 720], low_battery_percent: [1, 100], stale_hours: [0, 8760], history_days: [1, 365] };
// Text scale only; spacing and icons stay put. Normal is a bit larger than the original 1.0.
const SIZES = { small: 1, normal: 1.1, large: 1.25 };
// The dependency graph shows this many nodes per side at first; "more" adds another step.
const GRAPH_NODE_STEP = 40;
const GRAPH_GROUP_MIN = 5; // leaf nodes of one type on one node from which the graph folds them into one
// Scan thresholds as cards: option key, title, explanation, unit and default (the defaults of const.py).
const OPTION_FIELDS = [
  ["min_unavailable_days", "optMinUnavailableTitle", "optMinUnavailableHint", "unitDays", 7],
  ["unused_automation_days", "optUnusedAutomationTitle", "optUnusedAutomationHint", "unitDays", 90],
  ["scan_interval_hours", "optScanIntervalTitle", "optScanIntervalHint", "unitHours", 24],
  ["low_battery_percent", "optLowBatteryTitle", "optLowBatteryHint", "unitPercent", 20],
  ["stale_hours", "optStaleTitle", "optStaleHint", "unitHours", 48],
  ["history_days", "optHistoryDaysTitle", "optHistoryDaysHint", "unitDays", 30],
];
const START_VIEWS = ["overview", "findingsNav", "inventory", "changes", "batteries"];
const REPO_URL = "https://github.com/bertel2020/HA-Housekeeper";
// Palettes for explicit light/dark; taken from the Zeitarchiv app's design system (app.css).
// "standard" keeps the Home Assistant accent and, in automatic mode, the Home Assistant theme itself.
const SCHEMES = {
  standard: {
    light: { accent: "var(--primary-color,#0789cf)", bg: "#f3f3f3", surface: "#ffffff", soft: "#ececec", text: "#202020", muted: "#5e5e5e", border: "#e6e6e6", positive: "#2e7d32", warning: "#b77a00", danger: "#b30532" },
    dark: { accent: "var(--primary-color,#37c8fd)", on: "#141414", bg: "#141414", surface: "#202020", soft: "#363636", text: "#f3f3f3", muted: "#cccccc", border: "#4a4a4a", positive: "#66bb6a", warning: "#ffd166", danger: "#fd8f90" },
  },
  housekeeper: {
    light: { accent: "#0c6b5d", bg: "#f5f6f1", surface: "#ffffff", soft: "#eef1e9", text: "#131c17", muted: "#4b584e", border: "#e1e6db", positive: "#2e7d46", warning: "#8a6d1e", danger: "#a23b36" },
    dark: { accent: "#4fc3ae", on: "#0e1512", bg: "#0e1512", surface: "#171f1b", soft: "#1e2822", text: "#e8ece4", muted: "#9fac9b", border: "#2a362f", positive: "#6fcb88", warning: "#d4b65e", danger: "#e28a85" },
  },
  modern: {
    light: { accent: "#3157c8", bg: "#f6f7fb", surface: "#ffffff", soft: "#eef1f6", text: "#172033", muted: "#566176", border: "#d9dee8", positive: "#1f8a54", warning: "#a96700", danger: "#c83737" },
    dark: { accent: "#7ea1ff", on: "#0f1218", bg: "#0f1218", surface: "#171c25", soft: "#222936", text: "#f3f6fb", muted: "#b3bdcc", border: "#303949", positive: "#5fcb89", warning: "#e6a15a", danger: "#f07a7a" },
  },
};
// Earlier builds saved other scheme names.
const SCHEME_ALIASES = { teal: "housekeeper", amber: "housekeeper", sage: "housekeeper", zeitarchiv: "housekeeper", indigo: "modern" };

const USAGE_RELATIONS = ["TRIGGERS_ON", "USES_AS_CONDITION", "TARGETS", "REFERENCES", "SHOWS", "INCLUDES"];

// Pause after the last key stroke in a search field before the list is rebuilt.
const SEARCH_DEBOUNCE_MS = 150;

// What can carry a label: everything with an entry in the entity registry.
// Objects whose page keeps reading on the overview and puts everything that changes something under the tab "Actions".
const ACTION_TYPES = ["entity", "device", "config_entry", "automation", "script", "scene"];
// Objects whose overview sums up what is known in groups ("Known about …"); scenes keep the facts card.
const KNOWN_TYPES = ["entity", "device", "config_entry", "automation", "script"];
// The ring of the status: points off for each urgent topic, and the most that can come off.
const HEALTH_PENALTY_URGENT = 10;
const HEALTH_PENALTY_MAX = 30;
const LABEL_TYPES = ["entity", "automation", "script", "scene"];

const NAV = [
  ["overview", "mdi:view-dashboard-outline"],
  ["findingsNav", "mdi:alert-outline"],
  ["changes", "mdi:compare-horizontal"],
  ["inventory", "mdi:database-outline"],
  ["graph", "mdi:source-fork"],
  ["cleanup", "mdi:broom"],
  ["repair", "mdi:tools"],
  ["journal", "mdi:clipboard-text-clock-outline"],
  ["maintenance", "mdi:wrench-clock"],
  ["exposure", "mdi:shield-search"],
  ["policies", "mdi:clipboard-check-outline"],
  ["reliability", "mdi:chart-timeline-variant"],
  ["runs", "mdi:robot-outline"],
  ["recorder", "mdi:database-clock-outline"],
  ["batteries", "mdi:battery-alert-variant-outline"],
  ["reminders", "mdi:calendar-clock-outline"],
  ["settings", "mdi:cog-outline"],
];

// The sidebar groups every view but "settings", which stands alone at the foot.
const NAV_GROUPS = [
  ["navGroupActions", ["overview", "findingsNav", "cleanup", "repair"]],
  ["navGroupMaintain", ["maintenance", "batteries", "reminders", "policies", "exposure"]],
  ["navGroupOperation", ["reliability", "runs", "recorder"]],
  ["navGroupExplore", ["inventory", "graph", "changes", "journal"]],
];
const BUSY_RETRIES = 12, BUSY_WAIT_MS = 8000; // another recorder query holds the lock: ask again by itself
const NAV_ICONS = { ...Object.fromEntries(NAV), unreferenced: "mdi:link-variant-off" };

// Cleanup removes what is no longer needed; everything else a plan can do repairs something that stays.
const CLEANUP_KINDS = ["disable_entity", "remove_entity", "disable_device", "remove_device", "forget_device"];
const REPAIR_TASKS = [
  ["repair_counter", "mdi:chart-line", "repairTaskCounter", "repairTaskCounterHint"],
  ["migrate_meter", "mdi:gauge", "repairTaskMeter", "repairTaskMeterHint"],
  ["replace_references", "mdi:swap-horizontal", "repairTaskReplace", "repairTaskReplaceHint"],
  ["exchange_device", "mdi:devices", "repairTaskExchange", "repairTaskExchangeHint"],
];
// The view in which the person finishes a plan of this kind.
const viewForKind = kind => (["repair_counter", "repair_range", "migrate_meter", "replace_references", "exchange_device", "refactor_automation"].includes(kind) ? "repair" : "cleanup");

// IBM Plex, shipped with the integration. A shadow root cannot declare fonts, so the rules go into the document once.
const FONT_BASE = "/ha_housekeeper/fonts/";
const FONT_CSS = `@font-face{font-family:"IBM Plex Sans";font-weight:400 700;font-display:swap;src:url(${FONT_BASE}ibm-plex-sans-latin.woff2) format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}@font-face{font-family:"IBM Plex Sans";font-weight:400 700;font-display:swap;src:url(${FONT_BASE}ibm-plex-sans-latin-ext.woff2) format("woff2");unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}@font-face{font-family:"IBM Plex Mono";font-weight:400;font-display:swap;src:url(${FONT_BASE}ibm-plex-mono-400-latin.woff2) format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}@font-face{font-family:"IBM Plex Mono";font-weight:500;font-display:swap;src:url(${FONT_BASE}ibm-plex-mono-500-latin.woff2) format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}`;

const STATUS_TONE = {
  active: "ok", orphaned: "warn", unavailable: "red", problem: "red", broken_reference: "red",
  disabled: "mute", empty: "mute", unknown: "violet", ignored: "mute", possible_duplicate: "violet", unused: "mute", stale: "warn",
};

// Finding classes that call for action when they are new.
const CRITICAL_CLASSES = ["broken_reference", "unavailable", "problem"];

// Object types the housekeeping status is calculated from.
const HEALTH_TYPES = ["entity", "automation", "script", "scene"];

// One CSV cell, quoted. Text a spreadsheet would run as a formula (leading =, +, -, @) gets a leading
// apostrophe; numbers, also negative ones as text such as "-3.5", stay numbers.
const csvCell = v => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t) && !/^[+-]?\d+([.,]\d+)?([eE][+-]?\d+)?$/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
};
