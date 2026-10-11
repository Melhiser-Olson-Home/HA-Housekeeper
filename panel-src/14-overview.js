// OverviewMixin: methods of the panel element, mixed into the class in 99-register.js.
class OverviewMixin {
  // Hours since the last scan when it is clearly overdue for the configured interval, else null.
  staleScan() {
    const m = this.data?.meta;
    if (!m?.scanned_at) return null;
    const hours = (Date.now() - new Date(m.scanned_at).getTime()) / 3.6e6;
    const interval = Number(m.scan_interval_hours) || 0;
    if (!Number.isFinite(hours)) return null;
    if (interval > 0 ? hours > interval * 1.5 + 1 : hours > 24 * 7) return { hours: Math.round(hours), interval };
    return null;
  }

  // Shown while the backend treats scans as preliminary because Home Assistant is still starting.
  warmupBanner() {
    if (!this.data?.meta?.preliminary) return "";
    return `<div class="panel u-mb14"><div class="row"><span class="tile warn"><ha-icon icon="mdi:timer-sand"></ha-icon></span><span class="row-text"><strong>${this.esc(this.t("warmupBanner"))}</strong></span></div></div>`;
  }

  // What to do now, most urgent first: broken integrations and new critical findings, then an
  // overdue scan and the backup, then removals that are ready. Rows without data are left out.
  todoItems() {
    const items = [], m = this.data.meta;
    const broken = this.data.objects.filter(o => o.object_type === "config_entry" && o.status === "problem").length;
    if (broken) items.push({ key: "integrations", tone: "red", icon: "mdi:puzzle-remove-outline", label: "actIntegrations", hint: "actIntegrationsHint", count: broken, view: "inventory", type: "config_entry", status: "problem" });
    const causes = this.causeList().length;
    if (causes) items.push({ key: "causes", tone: "red", icon: "mdi:source-branch", label: "actCauses", hint: "actCausesHint", count: causes, view: "findingsNav", filter: "" });
    const regressions = (this.data.regressions || []).length;
    if (regressions) items.push({ key: "followup", tone: "red", icon: "mdi:history", label: "actFollowup", hint: "actFollowupHint", count: regressions, view: "journal" });
    const due = (this.data.reminders || []).filter(r => r.state === "due").length;
    if (due) items.push({ key: "reminders", tone: "warn", icon: "mdi:wrench-clock", label: "actReminders", hint: "actRemindersHint", count: due, view: "reminders" });
    const missed = (this.data.criteria_alerts || []).length;
    if (missed) items.push({ key: "criteria", tone: "warn", icon: "mdi:target", label: "actCriteria", hint: "actCriteriaHint", count: missed, view: "runs" });
    const fresh = (this.trend?.new_findings?.items || []).filter(f => !f.ignored && CRITICAL_CLASSES.includes(f.classification)).length;
    if (fresh) items.push({ key: "critical", tone: "red", icon: "mdi:alert-circle-outline", label: "actNewCritical", hint: "actNewCriticalHint", count: fresh, view: "findingsNav", filter: "" });
    const stale = this.staleScan();
    if (stale) {
      const age = stale.hours >= 48 ? this.t("daysValue", { n: Math.round(stale.hours / 24) }) : `${stale.hours} h`;
      items.push({ key: "stale", tone: "warn", icon: "mdi:clock-alert-outline", text: stale.interval > 0 ? this.t("staleScan", { age, hours: stale.interval }) : this.t("staleScanManual", { age }), scan: true });
    }
    // Only real problems are listed; notes such as "emergency kit not confirmed" stay on the Maintenance card.
    const problems = this.backup?.available && this.backup.overall === "problem" ? this.backup.checks.filter(c => c.level === "problem") : [];
    const dbProblems = this.dbHealth?.available ? this.dbHealth.findings.filter(f => f.level === "problem") : [];
    if (dbProblems.length) items.push({ key: "db", tone: "red", icon: "mdi:database-alert-outline", label: "todoDbProblem", hintText: dbProblems.map(f => this.t(`dbKind_${f.kind}`)).join(", "), view: "recorder" });
    if (problems.length) items.push({ key: "backup", tone: "red", icon: "mdi:backup-restore", label: "todoBackupProblem", count: problems.length, hintText: problems.map(c => this.t(`bh_${c.id}`)).join(", "), view: "maintenance" });
    const limit = m.quarantine_days ?? 14;
    const ready = (this.data.quarantine || []).filter(q => this.daysSince(q.since) >= limit).length;
    if (ready) items.push({ key: "quarantine", tone: "warn", icon: "mdi:archive-clock-outline", label: "actQuarantine", hint: "actQuarantineHint", count: ready, view: "cleanup" });
    this.ensureGoals();
    for (const g of (this.goals?.goals || []).filter(x => x.state === "missed")) {
      items.push({ key: `goal_${g.id}`, tone: "warn", icon: "mdi:target", text: this.t("goalMissedTitle", { goal: this.t(`goal_${g.id}`) }), hintText: `${this.goalNow(g)} · ${this.t("goalLimit", { limit: this.goalAmount(g, g.limit) })}`, view: GOAL_VIEWS[g.id] });
    }
    return items;
  }

  // Quarantined objects whose waiting time is over.
  readyQuarantine() {
    const limit = this.data?.meta?.quarantine_days ?? 14;
    return (this.data?.quarantine || []).filter(q => this.daysSince(q.since) >= limit).length;
  }

  // A line under the to-do list instead of a card of its own: how many goals are met, and where the limits are set.
  goalsLine() {
    const r = this.goals;
    if (!r?.goals?.length) return "";
    return `<div class="pad"><small>${this.t("goalsLine", { met: r.met, total: r.met + r.missed })} · <button class="link" data-goals-settings>${this.t("goalsAdjust")}</button></small></div>`;
  }

  // "1 topic urgent, 4 more open": what the headline counts are topics (rows of the list), not objects.
  statusHeadline(health) {
    const urgent = health.red === 1 ? this.t("statusUrgentOne") : this.t("statusUrgent", { n: this.formatNumber(health.red) });
    if (health.red && health.later) return `${urgent}, ${this.t("statusMoreOpen", { n: this.formatNumber(health.later) })}`;
    if (health.red) return urgent;
    return health.later === 1 ? this.t("statusOpenOne") : this.t("statusOpen", { n: this.formatNumber(health.later) });
  }

  statusSubline(health) {
    const topics = health.penalty ? this.t("statusTopicsCost", { n: health.penalty }) : this.t("statusTopicsFree");
    return `${this.t("statusObjects", { share: health.share, affected: this.formatNumber(health.affected), base: this.formatNumber(health.base) })} · ${topics} · <button type="button" class="link" data-health-why>${this.t("healthWhy")}</button>`;
  }

  // The calculation behind the ring: the share without a finding, minus the urgent topics.
  healthWhyCard(health) {
    const row = (label, value, cls = "") => `<div class="row ${cls}"><span>${label}</span><span>${value}</span></div>`;
    const lines = [row(this.t("whyShare"), `${health.share} %`)];
    if (health.red) lines.push(row(this.t(health.red === 1 ? "whyUrgentOne" : "whyUrgent", { n: this.formatNumber(health.red), points: HEALTH_PENALTY_URGENT }), `− ${health.penalty}`, "minus"));
    lines.push(row(this.t("whyTotal"), `${health.percent} %`, "total"));
    return `<div class="healthwhy" role="region" aria-label="${this.esc(this.t("healthWhy"))}">${lines.join("")}<small>${this.t("whyNote", { max: HEALTH_PENALTY_MAX })}</small></div>`;
  }

  // A number with its noun, so that the rows count what they say: "8 integrations".
  todoCount(it) {
    const unit = ({ integrations: "integrations", causes: "causes", followup: "followup", reminders: "reminders", criteria: "criteria", critical: "critical", backup: "backup", quarantine: "quarantine" })[it.key];
    return unit ? `${this.formatNumber(it.count)} ${this.t(`unit_${unit}_${it.count === 1 ? "1" : "n"}`)}` : this.formatNumber(it.count);
  }

  todoCard() {
    const items = this.todoItems();
    const row = it => {
      const inner = `<span class="tile ${it.tone}"><ha-icon icon="${it.icon}"></ha-icon></span><span class="row-text"><strong>${this.esc(it.text || this.t(it.label))}</strong>${it.hint || it.hintText ? `<small>${this.esc(it.hintText || this.t(it.hint))}</small>` : ""}</span>`;
      if (it.scan) return `<div class="row todo" data-todo="${it.key}">${inner}<button class="btn" data-action="scan">${this.t("scan")}</button></div>`;
      const target = `data-jump="${it.view}"${it.filter !== undefined ? ` data-filter="${it.filter}"` : ""}${it.type ? ` data-type="${it.type}"` : ""}${it.status ? ` data-status="${it.status}"` : ""}`;
      return `<button class="row todo" data-todo="${it.key}" ${target}>${inner}${it.count !== undefined ? `<span class="pill ${it.tone}">${this.todoCount(it)}</span>` : ""}</button>`;
    };
    // Red items first and open; the rest is a fold of its own once both kinds exist.
    const urgent = items.filter(i => i.tone === "red"), later = items.filter(i => i.tone !== "red");
    const grouped = urgent.length && later.length;
    const body = items.length ? (grouped
      ? `<h3 class="foldhd">${this.t("actNow")}</h3>${urgent.map(row).join("")}${this.fold("todo_later", { tone: "warn", title: this.t("actSoon"), sub: this.t("actSoonSub"), pill: this.t(later.length === 1 ? "topicsOne" : "topicsN", { n: this.formatNumber(later.length) }) }, later.map(row).join(""), false)}`
      : items.map(row).join(""))
      : `<div class="emptymsg"><ha-icon icon="mdi:check-circle-outline"></ha-icon>${this.esc(this.t("actNone", { date: this.formatDate(this.data.meta.scanned_at) }))}</div>`;
    return `<section class="panel u-mb14" aria-labelledby="hk-todo" id="hk-todo-card" tabindex="-1"><div class="panelhead"><div><h2 id="hk-todo">${this.t("actTitle")}</h2><p>${this.t("actSub")}</p></div></div>${body}${this.goalsLine()}</section>`;
  }

  // The comparison with the previous scan is fetched once per data set; the overview shows it when it is there.
  ensureTrend() {
    if (this._trendFor === this.data || !this._hass?.callWS) return;
    this._trendFor = this.data;
    this.loadTrend(this.data);
  }

  async loadTrend(data) {
    try {
      const result = await this._hass.callWS({ type: "ha_housekeeper/compare", baseline: "previous" });
      if (this.data !== data) return;
      this.trend = result?.available === true ? result : null;
      this.render(); // the status number counts new critical findings, in every view
    } catch (_) { if (this.data === data) this.trend = null; }
  }

  trendCard() {
    const c = this.trend;
    if (!c?.available) return "";
    const date = this.formatDate(c.baseline_at);
    const rows = [
      ["trendNewFindings", c.new_findings?.total, "mdi:arrow-up-bold", "red", "+"],
      ["trendResolved", c.resolved_findings?.total, "mdi:arrow-down-bold", "ok", "−"],
      ["trendChanged", c.status_changes?.total, "mdi:swap-horizontal", "warn", ""],
      ["trendNewObjects", c.new_objects?.total, "mdi:plus-circle-outline", "mute", "+"],
    ].filter(([, n]) => n);
    const body = rows.length
      ? rows.map(([label, n, icon, tone, sign]) => `<button class="row" data-jump="changes"><span class="tile ${tone}"><ha-icon icon="${icon}"></ha-icon></span><span class="row-text"><strong>${this.t(label)}</strong></span><span class="pill ${tone}">${sign}${this.formatNumber(n)}</span></button>`).join("")
      : `<div class="emptymsg">${this.esc(this.t("trendNone", { date }))}</div>`;
    return `<div class="panel"><div class="panelhead"><div><h2>${this.t("trendTitle")}</h2><p>${this.esc(this.t("trendSince", { date }))}</p></div></div>${body}</div>`;
  }

  // What changed since the last visit of this browser: new and gone findings against the state kept then.
  sinceVisit() {
    if (this._visit !== undefined) return this._visit;
    this._visit = null;
    const keys = this.data.findings.filter(f => !f.ignored).map(f => this.findingKey(f));
    let saved = null;
    try { saved = JSON.parse(globalThis.localStorage?.getItem("ha_housekeeper.visit") || "null"); } catch (_) { saved = null; }
    const now = Date.now();
    if (saved && Array.isArray(saved.keys) && now - saved.at >= 30 * 60000) {
      const before = new Set(saved.keys), nowSet = new Set(keys);
      this._visit = { at: saved.at, added: keys.filter(k => !before.has(k)).length, gone: saved.keys.filter(k => !nowSet.has(k)).length };
    }
    if (!saved || now - saved.at >= 30 * 60000) { try { globalThis.localStorage?.setItem("ha_housekeeper.visit", JSON.stringify({ at: now, keys })); } catch (_) { /* no storage */ } }
    return this._visit;
  }

  sinceVisitLine() {
    const v = this.sinceVisit();
    if (!v || (!v.added && !v.gone)) return "";
    const parts = [v.added ? this.t("visitAdded", { n: this.formatNumber(v.added) }) : "", v.gone ? this.t("visitGone", { n: this.formatNumber(v.gone) }) : ""].filter(Boolean).join(", ");
    return `<p class="factnote visitline"><ha-icon icon="mdi:history"></ha-icon>${this.t("visitSince", { ago: this.agoText(new Date(v.at).toISOString()) })}: ${parts}</p>`;
  }

  overview() {
    const m = this.data.meta, counts = m.status_counts || {}, types = m.type_counts || {}, health = this.health();
    const findings = this.sortedFindings();
    this.ensureTrend();
    this.ensureSeries();
    this.ensureBackup();
    const kpi = ([label, value, tone, view, status, key, rising]) => `<button class="kpi ${tone}" data-jump="${view}" data-status="${status || ""}"><small>${this.t(label)}</small><strong>${this.formatNumber(value)}</strong>${this.series ? `<span class="spark-row">${this.sparkline(key, rising)}</span>` : ""}</button>`;
    const headline = health.tasks ? `<button type="button" class="headlink" data-todo-jump title="${this.esc(this.t("statusTasksJump"))}">${this.esc(this.statusHeadline(health))}</button>` : this.t("statusAllGood");
    const why = this.healthWhy ? this.healthWhyCard(health) : "";
    return `<section class="statushead" title="${this.esc(this.t("healthTip", { affected: health.affected, base: health.base }))}"><button type="button" class="ring ${health.tone}" style="--p:${health.percent}" data-health-why aria-expanded="${Boolean(this.healthWhy)}" aria-label="${this.esc(this.t("healthWhy"))}"><b>${health.percent}<small>%</small></b></button>
      <div class="statustext"><h2>${headline}</h2><p>${this.statusSubline(health)}</p></div>
      <div class="kpis">${[["objects", m.object_count, "", "inventory", "", "objects"], ["openFindings", findings.length, findings.length ? "warn" : "", "findingsNav", "", "findings", "bad"], ["unavailable", counts.unavailable || 0, counts.unavailable ? "red" : "", "inventory", "unavailable", "unavailable", "bad"]].map(kpi).join("")}</div></section>${why}
      ${this.sinceVisitLine()}${this.todoCard()}<div class="grid2"><div class="stack">${this.inventoryStatusCard()}<div class="panel"><div class="panelhead"><div><h2>${this.t("needsAttention")}</h2><p>${this.t("sortedBySure")}</p></div><button class="link" data-jump="findingsNav">${this.t("allFindings")} (${findings.length}) <ha-icon icon="mdi:chevron-right"></ha-icon></button></div>
      ${findings.length ? findings.filter(f => !f.cause_id).slice(0, 8).map(f => this.findingRow(f)).join("") : `<div class="emptymsg"><ha-icon icon="mdi:check-circle-outline"></ha-icon>${this.t("noFindings")}</div>`}</div>${this.noderedProblem()}${this.integrationProblems()}</div>
      <div class="stack">${this.databaseCard()}${this.trendCard()}${this.cleanupCard()}
      <div class="panel"><div class="panelhead"><h2>${this.t("byType")}</h2></div><div class="types">${["entity", "device", "config_entry", "automation", "script", "scene", "dashboard", "nodered_flow", "area", "floor", "label"].filter(t => types[t]).map(type => `<button class="type" data-type-jump="${type}">${this.tile(type)}<span>${this.t(type)}</span><b>${this.formatNumber(types[type])}</b></button>`).join("")}</div></div></div></div>`;
  }

  // Three groups instead of seven raw statuses: what is fine, what to look at, what is broken.
  inventoryStatusCard() {
    const m = this.data.meta, counts = m.status_counts || {}, total = Math.max(1, m.object_count);
    const groups = [
      ["invOk", "ok", ["active"]],
      ["invCheck", "warn", ["unknown", "disabled", "empty"]],
      ["invProblem", "red", ["unavailable", "orphaned", "problem"]],
    ].map(([label, tone, statuses]) => ({ label, tone, statuses, n: statuses.reduce((sum, s) => sum + (counts[s] || 0), 0) }));
    const known = groups.reduce((sum, g) => sum + g.n, 0);
    const percent = n => `${new Intl.NumberFormat(this.lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(100 * n / total)} %`;
    const detail = g => g.statuses.filter(s => counts[s]).map(s => `${this.formatNumber(counts[s])} ${this.t(s)}`).join(" · ");
    const rows = groups.map(g => `<div title="${this.esc(detail(g))}"><span><i class="dot ${g.tone}"></i>${this.t(g.label)}</span><span class="nums"><b>${this.formatNumber(g.n)}</b><em class="pct">${percent(g.n)}</em></span></div>`).join("");
    const bar = groups.filter(g => g.n).map(g => `<i class="${g.tone}" style="width:${(100 * g.n / Math.max(1, known)).toFixed(2)}%"></i>`).join("");
    return `<div class="panel"><div class="panelhead"><div><h2>${this.t("inventoryStatus")}</h2><p>${this.t("invHint")}</p></div></div><div class="legend invlegend">${rows}</div><div class="bar">${bar}</div></div>`;
  }

  // The start of the oldest recorder data, read once (the backend keeps it for an hour); the card shows it when it arrives.
  ensureDbFirst() {
    if (this._dbFirstAsked) return;
    this._dbFirstAsked = true;
    setTimeout(async () => {
      try {
        const r = await this._hass.callWS({ type: "ha_housekeeper/database_first" });
        if (r?.busy) { this._dbFirstAsked = false; return; }
        this.dbFirst = r?.first || 0;
      } catch (_) { return; }
      if (this.dbFirst && this.view === "overview") this.render();
    }, 0);
  }

  // Size of the recorder database from two file stats taken during the scan; the table queries stay in the Recorder view.
  databaseCard() {
    const d = this.data.meta.database;
    if (!d) return "";
    this.ensureDbFirst();
    const measured = d.db_bytes !== null && d.db_bytes !== undefined;
    const rows = measured ? [
      [this.t("dbOvSize"), this.formatBytes(d.db_bytes)],
      [this.t("dbOvWal"), this.formatBytes(d.wal_bytes || 0)],
      ...(d.keep_days ? [[this.t("dbOvKeep"), this.t("dbOvKeepDays", { n: this.formatNumber(d.keep_days) })]] : []),
      ...(this.dbFirst ? [[this.t("dbOvFirst"), `${this.esc(this.formatDate(new Date(this.dbFirst * 1000).toISOString()))}<small>${this.esc(this.relTime(new Date(this.dbFirst * 1000).toISOString()))}</small>`]] : []),
      [this.t("dbOvGrowth"), d.per_day !== null && d.per_day !== undefined ? this.t("dbOvPerDay", { size: this.formatBytes(Math.max(0, d.per_day)) }) : this.t("dbOvObserving")],
    ] : [[this.t("dbOvSize"), this.t("dbOvNoSize", { dialect: this.esc(d.dialect || "?") })]];
    const purgeOff = d.auto_purge === false ? `<p class="factnote">${this.t("dbOvPurgeOff")}</p>` : "";
    return `<div class="panel"><div class="panelhead"><div><h2>${this.t("dbOvTitle")}</h2><p>${this.t("dbOvHint")}</p></div><button class="link" data-jump="recorder">${this.t("dbOvDetails")} <ha-icon icon="mdi:chevron-right"></ha-icon></button></div><div class="facts">${rows.map(([k, v]) => `<div class="fact"><span>${k}</span><b>${v}</b></div>`).join("")}</div>${purgeOff}</div>`;
  }

  // Quick links to the hint views; counts exclude hidden findings.
  cleanupCard() {
    this.ensureBatteryTrend();
    const open = this.data.findings.filter(f => !f.ignored);
    const items = [
      ["batteries", "mdi:battery-alert-variant-outline", "batteries", this.lowBatteries().length, "batteries"],
      ["possible_duplicate", "mdi:content-duplicate", "findingsNav", open.filter(f => f.classification === "possible_duplicate").length, "possible_duplicate"],
      ["unused", "mdi:sleep", "findingsNav", open.filter(f => f.classification === "unused").length, "unused"],
      ["unreferenced", "mdi:link-variant-off", "cleanup", this.unreferencedRows().length, undefined],
      ["quarantine", "mdi:archive-clock-outline", "cleanup", (this.data.quarantine || []).length, undefined],
    ];
    const rows = items.map(([label, icon, view, count, filter]) => `<button class="row" data-jump="${view}"${label === "unreferenced" ? ' data-jump-tab="unused"' : ""}${filter !== undefined && view === "findingsNav" ? ` data-filter="${filter}"` : ""}><span class="tile ${count ? "warn" : "mute"}"><ha-icon icon="${icon}"></ha-icon></span><span class="row-text"><strong>${this.t(label)}</strong></span><span class="pill ${count ? "warn" : "mute"}">${this.formatNumber(count)}</span></button>`).join("");
    return `<div class="panel"><div class="panelhead"><div><h2>${this.t("hintsTitle")}</h2><p>${this.t("cleanupHint")}</p></div></div>${rows}</div>`;
  }

  // Node-RED was configured but could not be read: its uses are missing or from an older read.
  noderedProblem() {
    const nr = this.data.meta.nodered;
    if (!nr?.configured || !nr.error) return "";
    const text = nr.cached ? this.t("noderedCached", { date: this.formatDate(nr.read_at) }) : this.t("noderedMissing");
    return `<div class="panel"><div class="panelhead"><div><h2>${this.t("noderedUnreachable")}</h2><p>${this.esc(text)} ${this.esc(this.t(`nodered_${nr.error}`))}</p></div></div></div>`;
  }

  integrationProblems() {
    const broken = this.data.objects.filter(o => o.object_type === "config_entry" && o.status === "problem");
    if (!broken.length) return "";
    this.lvState("integrations", "name", "asc");
    const sorts = [{ key: "name", label: "sortName", dir: "asc", get: o => o.name }, { key: "state", label: "sortStatus", dir: "asc", get: o => o.state || "" }];
    const bar = broken.length > 5 ? this.listBar("integrations", { sorts }) : "";
    const shown = broken.length > 5 ? this.refine("integrations", broken, { text: o => [o.name, o.domain, o.state].join(" "), sorts, tie: o => o.object_id }) : broken;
    const pg = this.paginate("integrations", shown);
    const rows = pg.rows.map(o => `<button class="row rel" data-object="${this.esc(this.objectKey(o))}">${this.tile("config_entry", "red")}<span class="row-text"><strong>${this.esc(o.name)}</strong><small>${this.esc(o.domain)} · ${this.t(`cs_${o.state || "not_loaded"}`)}</small></span>${this.pill(o.status)}</button>`).join("");
    return `<div class="panel"><div class="panelhead"><div><h2>${this.t("integrationProblems")} (${broken.length})</h2><p>${this.t("integrationProblemsHint")}</p></div></div>${bar}${rows}${pg.footer}</div>`;
  }
}
