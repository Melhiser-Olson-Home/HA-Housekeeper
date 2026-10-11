// SettingsMixin: methods of the panel element, mixed into the class in 99-register.js.
class SettingsMixin {
  infoText() {
    const m = this.data?.meta || {};
    return [`HA Housekeeper ${m.version || "?"}`, `Home Assistant ${m.ha_version || "?"}`, `${this.t("lastScan")}: ${m.scanned_at || "-"}`,
      `${this.t("objects")}: ${m.object_count ?? "-"}`, `${this.t("findings")}: ${this.data ? this.data.findings.filter(f => !f.ignored).length : "-"}`].join("\n");
  }

  segment(pref, options) {
    return `<div class="seg">${options.map(([value, label, dot]) => `<button class="chip ${String(this.prefs[pref]) === String(value) ? "active" : ""}" data-pref="${pref}|${value}">${dot ? `<span class="swatch" style="background:${dot}"></span>` : ""}${label}</button>`).join("")}</div>`;
  }

  // The tab ids of the settings page, in display order.
  // Each group has a tile with its state; the tile opens only that group's settings.
  settingsTabs() {
    const hidden = (this.data?.findings || []).filter(f => f.ignored).length;
    const m = this.data?.meta || {}, missed = (this.goals?.goals || []).filter(g => g.state === "missed").length;
    return [
      ["look", "mdi:palette-outline", "setTabLook", "setHintLook", ""],
      ["protection", "mdi:shield-lock-outline", "setTabProtection", "setHintProtection", this.t(`safeMode_${m.protection || "full"}`), (m.protection || "full") === "full" ? "ok" : "warn"],
      ["scan", "mdi:radar", "setTabScan", "setHintScan", m.scan_interval_hours ? this.t("setEveryHours", { n: m.scan_interval_hours }) : this.t("setManual"), "mute"],
      ["nodered", "mdi:sitemap-outline", "setTabNodeRed", "setHintNodeRed", ...this.noderedPill()],
      ["notify", "mdi:bell-outline", "setTabNotify", "setHintNotify", this.t(m.notify ? "setOn" : "setOff"), m.notify ? "ok" : "mute"],
      ["goals", "mdi:target", "setTabGoals", "setHintGoals", missed ? this.t("tilesMissed", { count: missed }) : "", "red"],
      ["hidden", "mdi:eye-off-outline", "setTabHidden", "setHintHidden", hidden ? this.formatNumber(hidden) : "", "mute"],
      ["info", "mdi:information-outline", "setTabInfo", "setHintInfo", ""],
    ];
  }

  // One line with what runs and how fresh the data is, plus the one button for support questions.
  settingsBand() {
    const m = this.data?.meta || {};
    const bit = (label, value) => `<span class="bandbit"><small>${label}</small><b>${value}</b></span>`;
    return `<div class="panel setband">${bit("Housekeeper", this.esc(m.version || "–"))}${bit("Home Assistant", this.esc(m.ha_version || "–"))}${bit(this.t("objects"), this.formatNumber(m.object_count ?? 0))}
      <span class="grow"></span><button class="btn" data-copy-info><ha-icon icon="mdi:content-copy"></ha-icon>${this.t(this.copied ? "copied" : "copyInfo")}</button></div>`;
  }

  // Scheme and mode as tiles: the scheme tile shows its own colors in the mode that is on screen.
  lookCard() {
    const p = this.prefs, dark = this.isDark();
    const tile = (pref, value, label, inner) => `<button class="tilebtn" data-pref="${pref}|${value}" aria-pressed="${String(p[pref]) === String(value)}">${inner}<span>${label}</span></button>`;
    const mini = scheme => {
      const c = SCHEMES[scheme][dark ? "dark" : "light"], bar = (w, col) => `<i style="width:${w}%;background:${col}"></i>`;
      return `<span class="schemeprev" aria-hidden="true" style="background:${c.bg};border-color:${c.border}"><span class="sp-card" style="background:${c.surface};border-color:${c.border}"><b style="background:${c.accent}"></b>${bar(60, c.text)}${bar(35, c.muted)}</span><span class="sp-row"><em style="background:${c.positive}"></em><em style="background:${c.warning}"></em><em style="background:${c.danger}"></em><u style="background:${c.accent}"></u></span></span>`;
    };
    const schemes = [["standard", "schemeStandard"], ["housekeeper", "schemeHousekeeper"], ["modern", "schemeModern"]].map(([id, key]) => tile("scheme", id, this.t(key), mini(id))).join("");
    const modes = [["auto", "modeAuto", "mdi:theme-light-dark"], ["light", "modeLight", "mdi:white-balance-sunny"], ["dark", "modeDark", "mdi:weather-night"]].map(([id, key, icon]) => tile("mode", id, this.t(key), `<ha-icon icon="${icon}"></ha-icon>`)).join("");
    const row = (label, hint, control) => `<div class="setrow"><div>${label}${hint ? `<small>${hint}</small>` : ""}</div>${control}</div>`;
    return `<section class="panel"><div class="panelhead"><div><h2>${this.t("setLanguage")}</h2><p>${this.t("setLanguageHint")}</p></div></div>
      ${row(this.t("setLanguage"), "", this.segment("language", [["auto", this.t("langAuto")], ["de", "Deutsch"], ["en", "English"]]))}
      <div class="panelhead"><h2>${this.t("colorScheme")}</h2></div><div class="tiles schemetiles">${schemes}</div>
      <div class="panelhead"><div><h2>${this.t("colorMode")}</h2><p>${this.t("modeHint")}</p></div></div><div class="tiles">${modes}</div>
      <div class="panelhead"><h2>${this.t("setReadability")}</h2></div>
      ${row(this.t("fontSize"), "", this.segment("size", [["small", this.t("fontSmall")], ["normal", this.t("fontNormal")], ["large", this.t("fontLarge")]]))}
      ${row(this.t("density"), "", this.segment("density", [["normal", this.t("densityNormal")], ["compact", this.t("densityCompact")]]))}
      ${row(this.t("motion"), this.t("motionHint"), this.segment("motion", [["auto", this.t("motionAuto")], ["reduced", this.t("motionReduced")]]))}</section>`;
  }

  behaviorCard() {
    const p = this.prefs;
    const row = (label, control) => `<div class="setrow"><div>${label}</div>${control}</div>`;
    const select = (key, options) => `<select data-pref-select="${key}" aria-label="${this.esc(this.t(key === "startView" ? "startView" : "pageSizeSetting"))}">${options.map(([v, l]) => `<option value="${v}" ${String(p[key]) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
    return `<section class="panel"><div class="panelhead"><h2>${this.t("behavior")}</h2></div>
      ${row(this.t("startView"), select("startView", START_VIEWS.map(v => [v, this.t(v)])))}
      ${row(this.t("pageSizeSetting"), select("pageSize", [20, 50, 100].map(n => [n, n])))}
      <div class="setrow quietreset"><small>${this.t("prefsNote")}</small><button class="btn quiet" data-pref-reset>${this.t("resetPrefs")}</button></div></section>`;
  }

  // The five thresholds as cards with their unit and default; saving stays off until a value differs.
  scanCard() {
    const m = this.data?.meta || {};
    if (!this.data) return `${this.skeleton("loading")}`;
    const cards = OPTION_FIELDS.map(([key, title, hint, unit, standard]) => {
      const [min, max] = OPTION_LIMITS[key];
      return `<div class="optcard"><label for="opt-${key}"><strong>${this.t(title)}</strong></label><small>${this.t(hint)}</small>
        <div class="unitrow"><input id="opt-${key}" type="number" data-opt="${key}" data-saved="${this.esc(m[key] ?? "")}" min="${min}" max="${max}" step="1" value="${this.esc(m[key] ?? "")}"><span>${this.t(unit)}</span></div>
        <small>${this.t("optDefault", { n: standard, unit: this.t(unit) })} · ${min}–${max}</small></div>`;
    }).join("");
    return `<section class="panel"><div class="panelhead"><div><h2>${this.t("scanSettings")}</h2><p>${this.t("scanSettingsHint")}</p></div></div><div class="optgrid">${cards}</div>
      <div class="toolbar savebar"><span class="date" role="status">${this.esc(this.optionsMessage || "")}</span><span class="toolgap"></span><button class="btn quiet" data-ha-path="/config/integrations/integration/ha_housekeeper"><ha-icon icon="mdi:cog-outline"></ha-icon>${this.t("openOptions")}</button><button class="btn primary" data-opts-save disabled>${this.t("saveOptions")}</button></div></section>`;
  }

  hiddenCard() {
    const hidden = (this.data?.findings || []).filter(f => f.ignored);
    const pg = this.paginate("hidden", hidden);
    const hiddenRow = f => {
      const object = this.findObject(this.findingKey(f));
      const action = f.ignored_by === "label" || f.ignored_by === "mark" ? `<span class="pill mute">${this.t(f.ignored_by === "mark" ? "mark_" + f.mark.kind : "ignoredByLabel")}</span>` : `<button class="btn" data-ignore="${this.esc(f.key)}" data-ignore-value="0">${this.t("showFinding")}</button>`;
      return `<div class="row"><span class="tile mute"><ha-icon icon="mdi:eye-off-outline"></ha-icon></span><span class="row-text"><strong>${this.esc(object?.name || f.object_id)}</strong><small>${this.esc(f.object_id)} · ${this.esc(this.findingTitle(f))}${f.ignore_info ? ` · ${this.esc(this.decisionLabel(f))}` : ""}${f.mark ? ` · ${this.esc(this.markLine(f.mark))}` : ""}</small></span>${action}</div>`;
    };
    return `<section class="panel"><div class="panelhead"><div><h2>${this.t("hiddenFindings")} (${hidden.length})</h2><p>${this.t("hiddenHint")}</p></div></div>${hidden.length ? pg.rows.map(hiddenRow).join("") : `<div class="emptymsg"><ha-icon icon="mdi:eye-check-outline"></ha-icon>${this.t("hiddenNone")}</div>`}${pg.footer}</section>`;
  }

  // Numbers only, no names, ids or attributes: safe to attach to an issue on GitHub.
  diagnosticsData() {
    const m = this.data?.meta || {}, count = (list, pick) => list.reduce((acc, x) => { const k = pick(x); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const { storage, database } = m;
    return {
      housekeeper: m.version, home_assistant: m.ha_version, scanned_at: m.scanned_at, preliminary: Boolean(m.preliminary),
      scan_interval_hours: m.scan_interval_hours, history_days: m.history_days, recorder_available: m.recorder_available,
      object_count: m.object_count, type_counts: m.type_counts, status_counts: m.status_counts, edge_count: (this.data?.edges || []).length,
      findings_by_rule: count(this.data?.findings || [], f => f.rule_id), findings_by_classification: count(this.data?.findings || [], f => f.classification),
      policies_on: this.policies ? this.policies.rules.filter(r => r.enabled).map(r => r.id) : null,
      storage: storage || null, database: database || null,
      panel: { language: this.lang, size: this.prefs?.size, mode: this.prefs?.mode, scheme: this.prefs?.scheme, page_size: this.pageSize },
      browser: globalThis.navigator?.userAgent || null, recent_errors: this._recentErrors || [],
    };
  }

  // The few lines an issue needs, ready to paste: versions, browser or app, language and the last errors.
  issueText() {
    const d = this.diagnosticsData();
    const errors = d.recent_errors.length ? d.recent_errors.map(e => `- ${e.at} ${e.where}: ${e.message}`).join("\n") : "- none";
    return `**HA-Housekeeper:** ${d.housekeeper || "?"}\n**Home Assistant:** ${d.home_assistant || "?"}\n**Browser / app:** ${d.browser || "?"}\n**Language:** ${d.panel.language}\n**Recent panel errors:**\n${errors}\n`;
  }

  async copyIssueText() {
    try { await globalThis.navigator?.clipboard?.writeText(this.issueText()); this.toast(this.t("diagCopied")); } catch (err) { this.failed(err); }
  }

  infoCard() {
    const m = this.data?.meta || {};
    const fact = (k, v) => `<div class="fact"><span>${k}</span><b>${v}</b></div>`;
    const facts = [fact(this.t("version"), this.esc(m.version || "–")), fact(this.t("haVersion"), this.esc(m.ha_version || "–")), fact(this.t("mode"), this.t("readOnlyValue")),
      fact(this.t("lastScan"), m.scanned_at ? this.formatDate(m.scanned_at) : "–"), fact(this.t("objects"), this.formatNumber(m.object_count ?? 0))].join("");
    const link = (icon, href, label, hint) => `<a class="row" href="${href}" target="_blank" rel="noopener noreferrer"><span class="tile mute"><ha-icon icon="${icon}"></ha-icon></span><span class="row-text"><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ""}</span><ha-icon icon="mdi:open-in-new"></ha-icon></a>`;
    const kept = [["setKeptObservations", "setKeptObservationsText", "observations"], ["setKeptHistory", "setKeptHistoryText", "history"], ["setKeptJournal", "setKeptJournalText", "journal"], ["setKeptEvents", "setKeptEventsText", "events"], ["setKeptRuns", "setKeptRunsText", "runs"]]
      .map(([title, text, store]) => `<div class="row"><span class="tile mute"><ha-icon icon="mdi:database-outline"></ha-icon></span><span class="row-text"><strong>${this.t(title)}</strong><small>${this.t(text, { days: m.history_days ?? 30 })}</small></span>${m.storage?.[store] !== undefined ? `<span class="pill mute">${this.formatBytes(m.storage[store])}</span>` : ""}</div>`).join("");
    return `<div class="stack"><section class="panel"><div class="panelhead"><h2>${this.t("about")}</h2></div><div class="facts">${facts}</div></section>
      <section class="panel"><div class="panelhead"><div><h2>${this.t("setKeptTitle")}</h2><p>${this.t("setKeptHint")}</p></div></div>${kept}<p class="factnote">${this.t("setPrivacy")}</p></section>
      <section class="panel"><div class="panelhead"><h2>${this.t("setLinks")}</h2></div>${link("mdi:github", REPO_URL, this.t("repository"), "")}${link("mdi:bug-outline", `${REPO_URL}/issues`, this.t("reportIssue"), "")}${link("mdi:history", `${REPO_URL}/blob/main/CHANGELOG.md`, this.t("changelog"), "")}
        <button class="row" data-diagnostics><span class="tile mute"><ha-icon icon="mdi:stethoscope"></ha-icon></span><span class="row-text"><strong>${this.t("diagDownload")}</strong><small>${this.t("diagHint")}</small></span><ha-icon icon="mdi:download"></ha-icon></button>
        <button class="row" data-diag-copy><span class="tile mute"><ha-icon icon="mdi:content-copy"></ha-icon></span><span class="row-text"><strong>${this.t("diagCopy")}</strong><small>${this.t("diagCopyHint")}</small></span></button></section></div>`;
  }

  // The one thing Housekeeper does on its own: tell about a new broken reference. Off until switched on.
  notifyCard() {
    const on = Boolean(this.data?.meta?.notify);
    return `<section class="panel"><div class="panelhead"><div><h2>${this.t("notifyTitle")}</h2><p>${this.t("notifyHint")}</p></div></div><div class="row"><span class="tile ${on ? "ok" : "mute"}"><ha-icon icon="mdi:bell-outline"></ha-icon></span><span class="row-text"><strong>${this.t("notifyLabel")}</strong><small>${this.t("notifyDetail")}</small></span><input class="policyswitch" type="checkbox" role="switch" aria-label="${this.esc(this.t("notifyLabel"))}" data-notify ${on ? "checked" : ""}></div></section>`;
  }

  settingsView() {
    const tabs = this.settingsTabs();
    const tab = tabs.some(([id]) => id === this.settingsTab) ? this.settingsTab : "look";
    const tiles = tabs.map(([id, icon, label, hint, pill, tone]) => `<button class="taskcard t-${pill ? tone || "mute" : "ac"}${id === tab ? " on" : ""}" id="hk-set-${id}" aria-pressed="${id === tab}" aria-controls="hk-setpanel" data-set-tab="${id}"><ha-icon icon="${icon}"></ha-icon><strong>${this.t(label)}</strong><span class="setpill">${pill ? `<span class="pill ${tone || "mute"}">${this.esc(pill)}</span>` : ""}</span><small>${this.t(hint)}</small></button>`).join("");
    const body = { look: () => `<div class="grid2">${this.lookCard()}${this.behaviorCard()}</div>`, protection: () => this.protectionCard(), scan: () => `${this.scanCard()}${this.eventsCard()}`, nodered: () => this.noderedCard(), notify: () => this.notifyCard(), goals: () => this.goalsCard(), hidden: () => this.hiddenCard(), info: () => this.infoCard() }[tab]();
    return `${this.settingsBand()}<div class="taskgrid compactgrid setgrid" role="group" aria-label="${this.esc(this.t("settings"))}">${tiles}</div><div id="hk-setpanel">${body}</div>`;
  }

  async saveOptions() {
    const changes = {};
    for (const input of this.shadowRoot.querySelectorAll("[data-opt]")) {
      const [min, max] = OPTION_LIMITS[input.dataset.opt], value = Number(input.value);
      if (input.value === "" || !Number.isInteger(value) || value < min || value > max) { this.optionsMessage = this.t("optionsInvalid"); this.render(); return; }
      changes[input.dataset.opt] = value;
    }
    try {
      await this._hass.callWS({ type: "ha_housekeeper/set_options", ...changes });
      this.optionsMessage = this.t("optionsSaved");
      this.data = null; // the integration reloads; fetch again once it is back
      this.render();
      setTimeout(() => { this.optionsMessage = ""; this.busy = false; this.load(false); }, 4000);
    } catch (err) { this.optionsMessage = err?.code === "busy" ? this.t("optionsBusy") : err?.message || String(err); this.render(); }
  }
}
