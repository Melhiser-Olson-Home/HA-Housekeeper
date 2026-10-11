// DiagnosisMixin: methods of the panel element, mixed into the class in 99-register.js.
class DiagnosisMixin {
  relTime(value) {
    if (!value) return "";
    const diff = (Date.now() - new Date(value).getTime()) / 1000;
    if (!(diff >= 0)) return "";
    const rtf = new Intl.RelativeTimeFormat(this.lang, { numeric: "auto" });
    for (const [unit, secs] of [["day", 86400], ["hour", 3600], ["minute", 60]]) {
      if (diff >= secs) return rtf.format(-Math.floor(diff / secs), unit);
    }
    return rtf.format(0, "second");
  }

  integrationCheck(entryId) {
    const entry = this.findObject(`config_entry:${entryId}`), label = this.t("integration");
    if (!entry) return { row: this.check(label, "red", entryId, this.t("missing")), entry };
    if (entry.disabled_by) return { row: this.check(label, "mute", entry.name, this.t("disabled")), entry };
    const state = entry.state || "not_loaded";
    const tone = state === "loaded" ? "ok" : ["setup_error", "migration_error", "failed_unload"].includes(state) ? "red" : "warn";
    return { row: this.check(label, tone, entry.name, this.t(`cs_${state}`)), entry, broken: state !== "loaded", state };
  }

  // Builds the check list and the plain-language cause for one object. Returns null when nothing is worth explaining.
  diagnose(item) {
    const t = (k, v) => this.t(k, v);
    const rows = [];
    let cause = "", hint = "", tone = this.tone(item.status);
    if (tone === "blue") tone = "ok";

    if (item.object_type === "entity") {
      const integ = item.config_entry_id ? this.integrationCheck(item.config_entry_id) : null;
      if (integ) rows.push(integ.row);
      const device = item.device_id ? this.findObject(`device:${item.device_id}`) : null;
      if (item.device_id) {
        rows.push(!device ? this.check(t("device"), "red", item.device_id, t("missing"))
          : device.status === "disabled" ? this.check(t("device"), "mute", device.name, t("disabled"))
          : this.check(t("device"), "ok", device.name, t("active")));
      }
      if (item.disabled_by) rows.push(this.check(t("entity"), "mute", t("entity_disabled"), t("disabled")));
      const state = item.state;
      if (state === null || state === undefined) {
        rows.push(this.check(t("runtimeState"), item.disabled_by ? "mute" : "red", t("noState"), item.disabled_by ? t("notExpected") : t("missing")));
      } else if (state === "unavailable") rows.push(this.check(t("runtimeState"), "red", state, t("unavailable")));
      else if (state === "unknown") rows.push(this.check(t("runtimeState"), "violet", state, t("unknown")));
      else rows.push(this.check(t("runtimeState"), "ok", item.unit ? `${state} ${item.unit}` : state, t("available")));

      const stable = this.stabilityOf(item);
      if (stable?.info) {
        const flap = stable.info.level === "flapping";
        rows.push(this.check(t("stability"), flap ? "red" : "warn", this.unstableLines(stable.info, stable.r.window_days)[0], t(flap ? "relFlapping" : "relUnstable")));
      }
      const broken = integ?.broken ? { state: t(`cs_${integ.state}`) } : null;
      switch (item.reason) {
        case "state_available": cause = t("cause_ok"); break;
        case "entity_disabled": case "device_disabled": case "integration_disabled": case "device_missing": case "config_entry_missing":
          cause = t(`cause_${item.reason}`); break;
        case "state_missing": cause = broken ? t("cause_state_missing_integration", broken) : t("cause_state_missing"); break;
        case "state_unavailable": cause = broken ? t("cause_state_unavailable_integration", broken) : t("cause_state_unavailable"); break;
        case "state_unknown": cause = t("cause_state_unknown"); break;
        default: cause = item.reason ? t(item.reason) : "";
      }
      const brokenMembers = this.data.findings.filter(f => f.rule_id === "entity.missing_member" && f.object_id === item.object_id);
      brokenMembers.forEach(f => rows.push(this.check(t("missing_member"), "red", f.affected_object, t("missing"))));
      if (item.duplicate_of) {
        rows.push(this.check(t("duplicateTwin"), "violet", item.duplicate_of, t("possible_duplicate")));
        cause = `${t("cause_duplicate", { twin: item.duplicate_of })} ${cause}`;
      }
      if (item.reason === "state_unavailable") hint = broken ? t("hint_integration") : t("hint_state_unavailable");
      else if (item.reason === "state_unknown") hint = t("hint_state_unknown");
      else if (item.reason === "state_missing" && broken) hint = t("hint_integration");
      else if (["state_missing", "device_missing", "config_entry_missing"].includes(item.reason)) hint = t("hint_orphan");
      if (item.duplicate_of) hint = t("hint_duplicate");
      if (stable?.info) {
        cause = `${t("cause_unstable", { level: t(stable.info.level === "flapping" ? "relFlapping" : "relUnstable") })} ${cause}`;
        if (tone === "ok") tone = stable.info.level === "flapping" ? "red" : "warn";
        if (!hint) hint = t("hint_unstable");
      }
      if (brokenMembers.length) {
        cause = `${t("cause_group_broken", { count: brokenMembers.length })} ${cause}`;
        hint = t("hint_group_broken");
        tone = "red";
      }
    } else if (item.object_type === "device") {
      const ids = item.config_entry_ids || [];
      ids.forEach(id => rows.push(this.integrationCheck(id).row));
      rows.push(this.check(t("entities"), item.entity_count ? "ok" : "warn", this.formatNumber(item.entity_count), item.entity_count ? t("present") : t("empty")));
      cause = item.status === "disabled" ? t("cause_device_off") : item.status === "empty" ? t("cause_device_empty") : t("cause_device_active");
    } else if (item.object_type === "config_entry") {
      const state = item.state || "not_loaded";
      if (item.disabled_by) { rows.push(this.check(t("status"), "mute", item.name, t("disabled"))); cause = t("cause_entry_off"); }
      else if (item.source === "ignore") { rows.push(this.check(t("status"), "mute", item.name, t("ignored"))); cause = t("cause_entry_ignored"); hint = t("hint_entry_ignored"); tone = "ok"; }
      else if (state === "loaded") { rows.push(this.check(t("status"), "ok", item.name, t("cs_loaded"))); cause = t("cause_entry_ok"); }
      else {
        rows.push(this.check(t("status"), tone, item.name, t(`cs_${state}`)));
        if (item.error) rows.push(this.check(t("entryError"), tone, item.error, ""));
        cause = t(item.error ? "cause_entry_problem_error" : "cause_entry_problem", { state: t(`cs_${state}`), error: item.error || "" }); hint = t("hint_integration");
      }
      const helperBroken = this.data.findings.filter(f => f.rule_id === "config_entry.missing_entity" && f.object_id === item.object_id);
      helperBroken.forEach(f => rows.push(this.check(t("missing_entity"), "red", `${f.affected_object}${f.evidence?.[0]?.location ? ` · ${f.evidence[0].location}` : ""}`, t("missing"))));
      if (helperBroken.length) { cause = t("cause_helper_broken", { count: helperBroken.length }); hint = t("hint_helper_broken"); tone = "red"; }
    } else if (["automation", "script", "scene", "dashboard", "nodered_flow"].includes(item.object_type)) {
      const key = this.objectKey(item);
      const broken = this.data.findings.filter(f => this.findingKey(f) === key && f.rule_id.includes(".missing_"));
      broken.forEach(f => rows.push(this.check(t(f.rule_id.split(".")[1]), "red", `${f.affected_object}${f.evidence?.[0]?.location ? ` · ${f.evidence[0].location}` : ""}`, t("missing"))));
      if (item.object_type === "automation" && item.status === "disabled") rows.push(this.check(t("status"), "mute", t("automationOff"), t("disabled")));
      if (!broken.length) rows.push(this.check(t("dependencies"), "ok", t("refsResolved"), t("present")));
      const unused = item.object_type === "automation" ? this.data.findings.find(f => this.findingKey(f) === key && f.classification === "unused") : null;
      if (item.object_type === "automation") {
        rows.push(this.check(t("lastTriggered"), unused ? "warn" : "ok", item.last_triggered ? this.formatDate(item.last_triggered) : t("never"), unused ? t("unused") : t("available")));
      }
      const runRow = this.runsRow(item), runWarn = (runRow?.findings || []).filter(f => f.level !== "info");
      runWarn.forEach(f => rows.push(this.check(t("knownRuns"), f.level, this.runFindingText(f).replace(/<[^>]+>/g, ""), t((RUN_FINDINGS[f.kind] || ["rfLabelFailing"])[0]))));
      cause = broken.length ? t("cause_automation_broken", { count: broken.length }) : unused ? t(`cause_${unused.rule_id.split(".")[1]}`, { days: unused.evidence?.[0]?.days ?? "" }) : runWarn.length ? this.runFindingText(runWarn[0]).replace(/<[^>]+>/g, "") : t("cause_automation_ok");
      if (runWarn.length && !broken.length && !unused) { hint = t(`rfHint_${runWarn[0].kind}`); tone = "warn"; }
      if (unused && !broken.length) { hint = t("hint_unused"); tone = "warn"; }
      if (broken.length) { hint = t("hint_automation_broken"); tone = "red"; }
    } else return null;
    return { rows, cause, hint, tone };
  }

  diagnosisCard(item) {
    const d = this.diagnose(item);
    if (!d) return "";
    const icon = { ok: "mdi:check-circle", warn: "mdi:alert-circle", red: "mdi:close-circle", mute: "mdi:minus-circle", violet: "mdi:help-circle" };
    const rows = d.rows.map(r => `<div class="check ${r.tone}"><ha-icon icon="${icon[r.tone] || icon.ok}"></ha-icon><b>${this.esc(r.label)}</b><span class="val">${this.esc(r.value)}</span><i class="pill ${r.tone}">${this.esc(r.badge)}</i></div>`).join("");
    return `<section class="panel"><div class="panelhead"><div><h2>${this.t("diagnosis")}</h2></div></div>
      <div class="diagcard"><div class="checks">${rows}</div>
      ${d.cause ? `<div class="cause ${d.tone}"><ha-icon icon="mdi:text-search"></ha-icon><div><strong>${this.t("causeLabel")}</strong><p>${this.esc(d.cause)}</p></div></div>` : ""}
      ${d.hint ? `<div class="hintbox"><ha-icon icon="mdi:lightbulb-on-outline"></ha-icon><div><strong>${this.t("hintLabel")}</strong><p>${this.esc(d.hint)}</p></div></div>` : ""}</div></section>`;
  }

  // Read-only what-if: which automations would lose a reference if this object (and what it owns) were removed.
  impact(item, key) {
    if (["automation", "script", "scene", "dashboard", "nodered_flow"].includes(item.object_type)) return null;
    const OWNED = ["PROVIDES", "OWNS"], USAGE = USAGE_RELATIONS;
    const scope = new Set([key]);
    for (const member of scope) { // grows while iterating: what the object owns, and what that owns
      for (const e of this.edgesFrom(member)) if (OWNED.includes(e.relation)) scope.add(e.target);
    }
    const { order } = this.edgeIndex();
    const byAutomation = new Map();
    const used = [];
    for (const member of scope) used.push(...this.edgesTo(member));
    used.sort((a, b) => order.get(a) - order.get(b)); // the order of the edges as scanned
    for (const e of used) {
      if (!USAGE.includes(e.relation) || !scope.has(e.target) || scope.has(e.source) || !(/^(automation|script|scene|dashboard|config_entry|nodered_flow):/.test(e.source) || e.relation === "INCLUDES")) continue;
      const hit = byAutomation.get(e.source) || { key: e.source, certain: false, places: [] };
      if (e.confidence === "certain") hit.certain = true;
      if (e.location && e.location !== "runtime_extraction") hit.places.push(e.location);
      byAutomation.set(e.source, hit);
    }
    const hits = [...byAutomation.values()].sort((a, b) => Number(b.certain) - Number(a.certain));
    const certain = hits.filter(h => h.certain).length;
    const tone = certain ? "red" : hits.length ? "warn" : "ok";
    return { hits, certain, probable: hits.length - certain, tone, related: scope.size - 1 };
  }

  impactCard(item, key) {
    const m = this.impact(item, key);
    if (!m) return "";
    const title = m.certain ? "impactCertain" : m.hits.length ? "impactProbable" : "impactNone";
    const text = m.certain ? this.t("impactCertainText", { count: m.certain }) : m.hits.length ? this.t("impactProbableText", { count: m.probable }) : this.t("impactNoneText");
    const icon = { ok: "mdi:check-circle", warn: "mdi:alert-circle", red: "mdi:alert-octagon" }[m.tone];
    const hitRows = m.hits.map(h => {
      const obj = this.findObject(h.key);
      const note = `${this.t(h.certain ? "certain" : "probable")}${h.places.length ? ` · ${h.places.slice(0, 2).join(", ")}` : ""}`;
      return `<button class="row rel" data-object="${this.esc(h.key)}">${this.tile(h.key.split(":")[0], h.certain ? "red" : "warn")}<span class="row-text"><strong>${this.esc(obj?.name || h.key.split(":").slice(1).join(":"))}</strong><small>${this.esc(note)}</small></span>${obj ? this.pill(obj.status) : ""}</button>`;
    });
    const hitPage = this.paginate(`impact-${key}`, hitRows), rows = hitPage.rows.join("") + hitPage.footer;
    return `<section class="panel"><div class="panelhead"><div><h2>${this.t("impactTitle")}</h2><p>${this.t("impactSubtitle")}</p></div></div>
      <div class="diagcard"><div class="cause ${m.tone}"><ha-icon icon="${icon}"></ha-icon><div><strong>${this.t(title)}</strong><p>${this.esc(text)}</p></div></div></div>${rows}
      ${item.object_type === "entity" && item.has_statistics ? `<p class="factnote">${this.t("statsNote")}</p>` : ""}
      <p class="factnote">${m.related ? this.t("impactScope", { count: m.related }) : this.t("impactScopeOne")} ${this.t("impactLimits")}</p></section>`;
  }

  // The newest long-term row of an entity, asked once per entity when its details open.
  ensureStatLast(id) {
    const asked = (this._statLastAsked ||= new Set());
    if (asked.has(id)) return;
    asked.add(id);
    setTimeout(async () => {
      try {
        const r = await this._hass.callWS({ type: "ha_housekeeper/statistics_last", ids: [id] });
        if (r?.busy) { asked.delete(id); return; }
        (this.statLast ||= {})[id] = r?.last?.[id] ?? 0; (this.statSpan ||= {})[id] = { first: r?.first?.[id] ?? 0, rows: r?.rows?.[id] ?? 0 };
      } catch (_) { return; }
      if (this.selected?.object_id === id) this.render();
    }, 0);
  }

  factsCard(item, key) {
    const finding = this.data.findings.find(f => this.findingKey(f) === key);
    const min = this.data.meta.min_unavailable_days || 0;
    const facts = [];
    if (item.status_since) facts.push([this.t("since"), `${this.formatDate(item.status_since)}<small>${this.esc(this.relTime(item.status_since))} · ${this.t("firstSeenNote")}</small>`]);
    if (["entity", "automation", "script", "scene", "dashboard", "nodered_flow"].includes(item.object_type)) {
      facts.push([this.t("finding"), finding ? `${this.pill(finding.classification)}<small>${this.t("certainty")}: ${Math.round(finding.confidence * 100)} %</small>` : this.t("noFinding")]);
    }
    const quarantined = ["entity", "device"].includes(item.object_type) ? this.quarantineOf(item.object_id) : null;
    if (quarantined) facts.push([this.t("quarantine"), `${this.t("quarantineFact", { date: this.formatDate(quarantined.since), days: this.daysSince(quarantined.since) })}<span class="factaction">${this.releaseControl(quarantined)}</span>`]);
    const note = item.status === "unavailable" && !finding && min > 0 ? `<p class="factnote">${this.t("belowThreshold", { days: min })}</p>` : "";
    return `<section class="panel"><div class="panelhead"><h2>${this.t("facts")}</h2></div><div class="facts">${facts.map(([k, v]) => `<div class="fact"><span>${k}</span><b>${v}</b></div>`).join("")}</div>${note}</section>`;
  }

  relationsCard(key) {
    const USAGE = USAGE_RELATIONS;
    const incoming = this.edgesTo(key), outgoing = this.edgesFrom(key);
    const groups = [
      [this.t("origin"), incoming.filter(e => !USAGE.includes(e.relation)).map(e => ({ other: e.source, label: this.t(e.relation), edge: e }))],
      [this.t("usage"), [
        ...incoming.filter(e => USAGE.includes(e.relation)).map(e => ({ other: e.source, label: `${this.t("usedBy")} · ${this.t(e.relation)}`, edge: e })),
        ...outgoing.map(e => ({ other: e.target, label: this.t(e.relation), edge: e })),
      ]],
    ].filter(([, list]) => list.length);
    const LIMIT = 25;
    const row = ({ other, label, edge }) => {
      const obj = this.findObject(other), [type, ...rest] = other.split(":");
      const note = `${label}${edge.location && edge.location !== "runtime_extraction" ? ` · ${edge.location}` : ""}`;
      const text = `${this.tile(obj?.object_type || type, obj ? (this.tone(obj.status) === "ok" ? "" : this.tone(obj.status)) : "red")}<span class="row-text"><strong>${this.esc(obj?.name || rest.join(":"))}</strong><small>${this.esc(note)}</small></span>${obj ? this.pill(obj.status) : `<span class="pill red">${this.t("missing")}</span>`}`;
      return obj ? `<button class="row rel" data-object="${this.esc(other)}">${text}</button>` : `<div class="row rel">${text}</div>`;
    };
    // From 26 entries on a group gets a search box; the entries come in pages.
    const body = groups.map(([title, list], i) => {
      const found = this.searchList(`rel-${i}`, list, x => `${this.findObject(x.other)?.name || ""} ${x.other} ${x.label}`, LIMIT + 1);
      const page = this.paginate(`relp-${key}-${i}`, found.rows);
      return `<div class="sectionlabel">${title} (${list.length})</div>${found.bar}${found.none}${page.rows.map(row).join("")}${page.footer}`
    }).join("");
    return `<section class="panel"><div class="panelhead"><h2>${this.t("relations")} (${incoming.length + outgoing.length})</h2></div>${body || `<p class="factnote">${this.t("noRelations")}</p>`}</section>`;
  }

  entrySourceLabel(source) {
    const known = ["user", "import", "ignore", "system", "reauth", "reconfigure"];
    return known.includes(source) ? this.t(`src_${source}`) : this.t("src_discovery", { source });
  }

  // Everything that says which integration an entry belongs to and where it comes from.
  integrationCard(item) {
    if (item.object_type !== "config_entry") return "";
    const state = item.state || "not_loaded";
    const path = this.haPath(item);
    const origin = item.custom ? this.t("originCustom", { path: item.integration_dir || item.domain, version: item.integration_version ? ` · v${item.integration_version}` : "" }) : this.t("originBuiltIn");
    const link = (href, text) => `<a href="${this.esc(href)}" target="_blank" rel="noopener noreferrer">${this.esc(text)}</a>`;
    const rows = [
      [this.t("integrationName"), `${this.esc(item.integration_name || item.domain)} <small>(${this.esc(item.domain)})</small>`],
      [this.t("origin"), this.esc(origin)],
      [this.t("entrySource"), `${this.esc(this.entrySourceLabel(item.source))} <small>(${this.esc(item.source)})</small>`],
      [this.t("status"), `${this.esc(item.disabled_by ? this.t("disabled") : this.t(`cs_${state}`))}${item.disabled_by ? ` <small>(${this.esc(item.disabled_by)})</small>` : ""}`],
      item.error ? [this.t("entryError"), this.esc(item.error)] : null,
      [this.t("entryEntities"), this.formatNumber(item.entity_count ?? 0)],
      [this.t("entryDevices"), this.formatNumber(item.device_count ?? 0)],
      [this.t("entryId"), `<code>${this.esc(item.object_id)}</code>`],
      item.unique_id ? [this.t("entryUniqueId"), `<code>${this.esc(item.unique_id)}</code>`] : null,
      item.created_at ? [this.t("entryCreated"), this.esc(this.formatDate(item.created_at))] : null,
      item.modified_at ? [this.t("entryModified"), this.esc(this.formatDate(item.modified_at))] : null,
      path ? [this.t("entryHaPath"), `<code>${this.esc(path)}</code>`] : null,
      item.documentation ? [this.t("entryDocs"), link(item.documentation, item.documentation)] : null,
    ].filter(Boolean);
    return `<section class="panel"><div class="panelhead"><h2>${this.t("integrationCard")}</h2></div><div class="pad"><dl class="kv">${rows.map(([k, v]) => `<dt>${this.esc(k)}</dt><dd>${v}</dd>`).join("")}</dl></div></section>`;
  }

  // The always-visible summary under the title: status, cause, since when, integration, device, area, risk.
  detailSummary(item, key) {
    const device = item.device_id ? this.findObject(`device:${item.device_id}`) : null;
    const areaId = item.area_id || device?.area_id, area = areaId ? this.findObject(`area:${areaId}`) : null;
    const integration = item.object_type === "entity" ? item.platform : item.object_type === "config_entry" ? (item.integration_name || item.domain) : null;
    const impact = this.impact(item, key);
    const risk = impact ? { tone: impact.tone, text: impact.hits.length ? this.t("riskHits", { n: impact.hits.length, c: impact.certain }) : this.t("riskNone") } : null;
    return [
      item.reason ? [this.t("sumCause"), this.esc(this.t(item.reason))] : null,
      item.status_since ? [this.t("since"), this.esc(this.formatDate(item.status_since))] : null,
      integration ? [this.t("sumIntegration"), this.esc(integration)] : null,
      device ? [this.t("sumDevice"), this.esc(device.name)] : null,
      area ? [this.t("sumArea"), this.esc(area.name)] : null,
      risk ? [this.t("sumRisk"), `<span class="pill ${risk.tone}">${this.esc(risk.text)}</span>`] : null,
    ].filter(Boolean);
  }

  // Tabs offered for one object; "attributes" only when it has some, so an empty tab never shows.
  detailTabs(item, key) {
    const tabs = [["overview", "tabOverview"], ["relations", "tabRelations", this.edgesTo(key).length + this.edgesFrom(key).length], ["technical", "tabTechnical"]];
    if (this.hasActionsTab(item, key)) tabs.splice(1, 0, ["actions", "tabActions", this.fixItems(item, key).items.length]);
    if (item.attributes && Object.keys(item.attributes).length) tabs.push(["attributes", "tabAttributes"]);
    if (["automation", "script"].includes(item.object_type) && (item.actions?.length || item.triggers?.length)) tabs.push(["flow", "flowTab"]);
    if (NOTE_TYPES.includes(item.object_type)) tabs.push(["history", "tabHistory", this.historyCount(item)]);
    if (this.runsRow(item)) tabs.push(["runs", "runsTab"]);
    if (this.reliabilityRow(item)) tabs.push(["reliability", "relTab"]);
    return tabs;
  }

  detail() {
    const base = this.selected;
    const item = { ...base, ...(this.details.get(this.objectKey(base)) || {}) };
    const key = this.objectKey(item);
    if (["automation", "script"].includes(item.object_type)) this.ensureRuns();
    if (item.object_type === "config_entry") this.ensureReliability();
    if (item.object_type === "entity") this.ensureStability();
    if (item.object_type === "device") this.ensureLifecycle(item.object_id);
    if (NOTE_TYPES.includes(item.object_type)) this.ensureJournal();
    this.ensureCorrelations();
    const tabs = this.detailTabs(item, key);
    const tab = tabs.some(([id]) => id === this.detailTab) ? this.detailTab : "overview";
    const path = this.haPath(item), tone = this.tone(item.status) === "ok" ? "" : this.tone(item.status);
    const back = this.trail.length ? this.trail[this.trail.length - 1].name : this.t(this.view);
    const summary = this.detailSummary(item, key).map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join("");
    const tablist = tabs.map(([id, label, count]) => `<button class="tab" role="tab" id="hk-tab-${id}" aria-selected="${id === tab}" aria-controls="hk-tabpanel" tabindex="${id === tab ? 0 : -1}" data-detail-tab="${id}">${this.t(label)}${count ? ` <em>${this.formatNumber(count)}</em>` : ""}</button>`).join("");
    return `<div class="crumbs"><button class="btn" data-action="back"><ha-icon icon="mdi:arrow-left"></ha-icon>${this.t("backTo")} ${this.esc(back)}</button><span class="trail">${this.t(this.view)} › ${this.t(item.object_type)}</span></div>
      <div class="panel detailhead">${this.tile(item.object_type, tone)}<div><div class="headpills">${this.pill(item.status)}<span class="pill mute">${this.t(item.object_type)}</span></div><h1>${this.esc(item.name)}</h1><span class="id">${this.esc(item.object_id)}</span></div>
      <div class="actions">${path ? `<button class="btn" data-ha-path="${this.esc(path)}"><ha-icon icon="mdi:open-in-new"></ha-icon>${this.t("openInHA")}</button>` : ""}${/^https?:\/\//.test(item.editor_url || "") ? `<a class="btn" href="${this.esc(item.editor_url)}" target="_blank" rel="noopener noreferrer"><ha-icon icon="mdi:open-in-new"></ha-icon>${this.t("openInNodeRed")}</a>` : ""}<button class="btn" data-graph-open="${this.esc(key)}"><ha-icon icon="mdi:source-fork"></ha-icon>${this.t("showInGraph")}</button>${["entity", "device", "area", "automation", "script", "scene", "dashboard"].includes(item.object_type) ? `<button class="btn" data-xp-from="${this.esc(key)}"><ha-icon icon="mdi:export-variant"></ha-icon>${this.t("xpButton")}</button>` : ""}</div></div>
      <div class="panel sumline">${summary}</div>
      <div class="tabs" role="tablist" aria-label="${this.esc(this.t("tabsLabel"))}">${tablist}</div>
      <div role="tabpanel" id="hk-tabpanel" aria-labelledby="hk-tab-${tab}" tabindex="0">${this.detailPanel(tab, item, key)}</div>`;
  }

  // Only the open tab is built, so large attributes and relations cost nothing until they are asked for.
  detailPanel(tab, item, key) {
    if (tab === "actions") return this.actionsTab(item, key);
    if (tab === "relations") return `<div class="stack">${this.relationsCard(key)}</div>`;
    if (tab === "flow") return this.flowCard(item, key);
    if (tab === "history") return this.historyTab(item);
    if (tab === "runs") return this.runsDetailCard(this.runsRow(item));
    if (tab === "reliability") return this.reliabilityDetailCard(this.reliabilityRow(item));
    if (tab === "attributes") {
      return `<section class="panel"><div class="panelhead"><h2>${this.t("state")}</h2></div><div class="pad"><div class="code">${this.esc(JSON.stringify(item.attributes, null, 2))}</div></div></section>`;
    }
    if (tab === "technical") {
      const skip = new Set(["attributes", "references", "name", "object_id", "object_type", "status", "reason", "state", "status_since", "status_since_source", "triggers", "conditions", "actions"]);
      if (item.object_type === "config_entry") ["domain", "integration_name", "custom", "integration_dir", "integration_version", "documentation", "source", "error", "unique_id", "entity_count", "device_count", "created_at", "modified_at", "disabled_by"].forEach(k => skip.add(k));
      const fields = Object.entries(item).filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && (typeof v !== "object" || Array.isArray(v)));
      const automation = ["automation", "script"].includes(item.object_type) && !this.detailLoading
        ? `<section class="panel"><div class="panelhead"><h2>${this.t("automationStructure")}</h2></div><div class="pad">${(item.object_type === "script" ? ["actions"] : ["triggers", "conditions", "actions"]).map(part => `<h4>${this.t(part)} (${item[part]?.length || 0})</h4><div class="code">${this.esc(JSON.stringify(item[part] || [], null, 2))}</div>`).join("")}</div></section>` : "";
      const cards = this.propertyCards(item);
      return `<div class="stack">${cards ? `<div class="propgrid">${cards}</div>` : `<section class="panel"><div class="panelhead"><h2>${this.t("registry")}</h2></div><div class="pad"><dl class="kv"><dt>${this.t("type")}</dt><dd>${this.t(item.object_type)}</dd>${fields.map(([k, v]) => `<dt>${this.esc(k)}</dt><dd>${this.esc(Array.isArray(v) ? v.join(", ") : v)}</dd>`).join("")}</dl></div></section>`}${automation}${this.detailLoading ? `<p class="sub">${this.t("loading")}</p>` : ""}</div>`;
    }
    if (ACTION_TYPES.includes(item.object_type)) return `<div class="detailgrid"><div class="stack">${this.diagnosisCard(item)}${this.polObjectCard(item)}${this.nextStepBand(item, key)}${this.impactCard(item, key)}</div><div class="stack">${KNOWN_TYPES.includes(item.object_type) ? this.knownCard(item, key) : this.factsCard(item, key)}${this.entityRecorderCard(item)}</div></div>`;
    return `<div class="detailgrid"><div class="stack">${this.diagnosisCard(item)}${this.polObjectCard(item)}${this.actionsCard(item, key)}${this.detailEditCard(item)}${this.impactCard(item, key)}</div><div class="stack">${this.factsCard(item, key)}${this.entityRecorderCard(item)}${this.entityTrimCard(item)}${this.staleCard(item)}</div></div>`;
  }
}
