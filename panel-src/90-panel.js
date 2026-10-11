class HAHousekeeperPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this.data = null;
    this.view = "overview";
    this.query = "";
    this.typeFilter = "";
    this.statusFilter = "";
    this.findingFilter = ""; this.findingAfter = false; this.findingDue = false; this.showFollowers = false; this.goals = null; this.goalsLoading = false; this.goalForm = null; this.decide = null; this.markForm = null;
    this.findingStatus = ""; this.bulk = null;
    this.batteryFilter = "all";

    this._urlApplied = false;
    this.sort = "name";
    this.selected = null;
    this.detailTab = "overview";
    this.settingsTab = "look";
    this.trail = [];
    this.compare = null;
    this.compareBaseline = "previous";
    this.compareLoading = false;
    this.graphSelected = null;
    this.graphTrail = []; this.graphOrigin = null; this.viewTrail = []; this._tabOf = new Map(); this.viewTab = {};
    this.details = new Map();
    this.detailLoading = false;
    this.graphQuery = "";
    this.graphDepth = 1; this.graphRel = ""; this.graphConf = "all"; this.graphImpact = false; this.graphLimit = GRAPH_NODE_STEP; this.graphOpen = new Set();
    this.pages = {};
    this.lv = {};
    this.unrefTab = "entities";
    this.cleanupSel = new Set();
    this.findSel = new Set();
    this.excludeSel = new Set(); this.purgeSel = new Set(); this.purgeOpen = false; this.purgeStates = true; this.purgeWord = ""; this.purgeBusy = false; this.purgeResult = null;
    this.cleanupKind = "disable_entity";
    this.replOld = ""; this.replNew = "";
    this.meterOld = ""; this.meterNew = ""; this.meterMode = "both";
    this.ex = null; this.report = null; this.reportClear = true; this.reportMessage = "";
    this.runs = null; this.runsLoading = false; this.runsError = ""; this.exposure = null; this.exposureLoading = false; this.exposureError = ""; this._exposureRequested = false; this.policies = null; this.policiesLoading = false; this.policiesError = ""; this._policiesRequested = false; this.policyShowHidden = false; this.orphanLast = null; this.orphanLastLoading = false; this._orphanLastRequested = false; this.dbHealth = null; this.dbLoading = false; this.dbError = ""; this._dbRequested = false; this.storms = null; this.stormsLoading = false; this.stormsError = ""; this.stormsWindow = 1; this._stormsRequested = null; this.reliability = null; this.relLoading = false; this.relError = ""; this.relWindow = 7; this.relCompare = false; this.quickQuery = ""; this.quickOpen = false; this.quickIndex = 0; this.backup = null; this.backupLoading = false; this.backupError = ""; this.preflight = null; this.costs = null; this.costSort = "recent"; this.costsLoading = false; this.preflightLoading = false;
    this.ack = new Set();
    this.confirmation = null;
    this.confirmWord = "";
    this.plan = null;
    this.journal = null;
    this.prefs = this.loadPrefs();
    this.pageSize = this.prefs.pageSize;
    this.sortDir = "asc";
    this.pages = {};
    this.busy = false;
    this.scanStatus = null;
    this.error = null;
    this.trend = null;
    this._rev = 0; // bumped when data is changed in place (ignore flags), so cached lists are rebuilt
    this._debug = this.debugEnabled();
  }

  set hass(value) {
    const first = !this._hass, wasDark = this._hass?.themes?.darkMode;
    this._hass = value;
    if (first) { this.load(false); this.loadUserPrefs(); }
    else if (this.prefs.mode === "auto" && wasDark !== value?.themes?.darkMode) this.render();
  }

  get hass() { return this._hass; }

  connectedCallback() {
    this._gone = false;
    this._basePath = typeof window === "undefined" ? null : window.location.pathname;
    this._onPop = () => this.onPopState();
    window.addEventListener?.("popstate", this._onPop);
    this.installFonts();
    this.render();
  }

  // Timers and late answers must not touch a panel that HA has taken out of the page.
  disconnectedCallback() {
    this._gone = true;
    window.removeEventListener?.("popstate", this._onPop);
    for (const name of ["_warmupTimer", "_searchTimer", "_tipTimer"]) {
      if (this[name]) globalThis.clearTimeout?.(this[name]);
      this[name] = null;
    }
  }

  // The browser's back button steps back inside the panel. One history entry is kept in front of
  // the panel's own back steps while there is somewhere to go back to.
  canGoBack() {
    return Boolean(this.view === "graph" ? this.graphTrail?.length || this.graphOrigin : this.selected || this.viewTrail?.length);
  }

  onPopState() {
    if (this._ignorePop) { this._ignorePop = false; return; }
    this._guard = false;
    if (this._gone || window.location.pathname !== this._basePath || !this.canGoBack()) return;
    if (this.view === "graph") this.graphBack();
    else if (this.selected) this.goBack();
    else this.viewBack();
  }

  syncGuard() {
    if (typeof window === "undefined" || !window.history || window.location.pathname !== this._basePath) return;
    try {
      if (this.canGoBack() && !this._guard) { window.history.pushState(window.history.state, "", window.location.href); this._guard = true; }
      else if (!this.canGoBack() && this._guard) { this._guard = false; this._ignorePop = true; window.history.back(); }
    } catch (_) { /* no history access: the panel's own back buttons still work */ }
  }

  installFonts() {
    const head = globalThis.document?.head;
    if (!head || globalThis.document.getElementById("hk-fonts")) return;
    const style = globalThis.document.createElement("style");
    style.id = "hk-fonts"; style.textContent = FONT_CSS;
    head.appendChild(style);
  }

  get lang() {
    const chosen = this.prefs?.language;
    if (chosen === "de" || chosen === "en") return chosen;
    return String(this._hass?.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  }

  t(key, vars) {
    const text = TEXT[this.lang][key] || TEXT.en[key] || key;
    return vars ? text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "") : text;
  }

  esc(value) {
    return String(value ?? "—").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  formatDate(value) {
    if (!value) return "—";
    try { return new Intl.DateTimeFormat(this.lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
    catch (_) { return value; }
  }

  formatNumber(value) { return new Intl.NumberFormat(this.lang).format(value ?? 0); }

  async load(fresh = false) {
    if (!this._hass || this.busy) return;
    if (this._warmupTimer) window.clearTimeout(this._warmupTimer);
    this.busy = true; this.error = null; this.render();
    let progressTimer = null;
    if (fresh) progressTimer = window.setInterval(() => this.updateScanStatus(), 250);
    try {
      this.data = await this._hass.callWS({ type: fresh ? "ha_housekeeper/scan" : "ha_housekeeper/inventory" });
      this.details = new Map();
      this.compare = null;
      this.applyUrl();
    } catch (err) {
      this.error = this.errText(err);
      // A plan that is running or a Home Assistant that is still starting only delays the first picture: ask again.
      if (["cleanup_busy", "warming_up"].includes(err?.code)) this.retryWarmup(10000);
    } finally {
      if (progressTimer) window.clearInterval(progressTimer);
      this.scanStatus = null;
      this.busy = false; this.render();
    }
    if (this.view === "changes" && this.data) this.loadCompare();
    if (this.data) this.ensureSafetyData();
    // Preliminary data: fetch the final scan once the backend's warm-up is over.
    if (this.data?.meta?.preliminary) {
      const wait = ((Number(this.data.meta.warmup_seconds_left) || 0) + 20) * 1000;
      this.retryWarmup(wait);
    }
  }

  // Asks again until the final scan has replaced the preliminary one; a busy panel or a failed request tries again later.
  retryWarmup(wait) {
    if (this._warmupTimer) window.clearTimeout(this._warmupTimer);
    this._warmupTimer = window.setTimeout(() => {
      if (!this._hass || this.busy) { this.retryWarmup(15000); return; }
      this.load().then(() => { if (this.data?.meta?.preliminary || this.error) this.retryWarmup(20000); });
    }, wait);
  }

  async updateScanStatus() {
    try {
      this.scanStatus = await this._hass.callWS({ type: "ha_housekeeper/status" });
      this.renderProgress();
    } catch (_) { /* The main scan request reports actionable errors. */ }
  }

  // The scrolling element: HA's page scrolls the document or one of the panel's ancestors.
  scroller() {
    for (let node = this; node; node = node.parentNode || node.host) {
      if (node.scrollTop > 0) return node;
    }
    return globalThis.document?.scrollingElement || null;
  }

  // Where the page was scrolled when it is left, so "back" can land at the same spot.
  rememberScroll() { return this.scroller?.()?.scrollTop || 0; }

  restoreScroll(top) {
    if (!top) return;
    const run = () => { const el = this.scroller?.() || globalThis.document?.scrollingElement; if (el) el.scrollTop = top; };
    if (globalThis.requestAnimationFrame) globalThis.requestAnimationFrame(run); else run();
  }

  async openObject(obj) {
    if (this.selected && this.selected !== obj) { this.trail.push(this.selected); this._tabOf.set(this.objectKey(this.selected), this.detailTab); }
    else if (!this.selected) this._listScroll = this.rememberScroll();
    if (this.selected !== obj) { this.detailTab = this._pendingTab || "overview"; this._pendingTab = null; }
    this.selected = obj;
    const key = this.objectKey(obj);
    if (this.details.has(key)) { this.render(); this.scrollIntoView?.({ block: "start" }); return; }
    this.detailLoading = true;
    this.render();
    this.scrollIntoView?.({ block: "start" });
    try {
      this.details.set(key, await this._hass.callWS({
        type: "ha_housekeeper/detail", object_type: obj.object_type, object_id: obj.object_id,
      }));
    } catch (_) { this.details.set(key, {}); }
    this.detailLoading = false;
    if (this.selected === obj) this.render();
  }

  goBack() {
    this.selected = this.trail.pop() || null;
    this.detailTab = (this.selected && this._tabOf.get(this.objectKey(this.selected))) || "overview";
    this.render();
    if (!this.selected) this.restoreScroll(this._listScroll);
  }

  // The graph opened from a detail page or a list: it remembers where, so "back" returns there.
  openGraph(obj) {
    if (!obj) return;
    if (this.selected) this._tabOf.set(this.objectKey(this.selected), this.detailTab);
    this.graphOrigin = { view: this.view, selected: this.selected, trail: this.trail, tab: this.detailTab, scroll: this.rememberScroll() };
    this.graphTrail = [];
    this.graphSelected = obj; this.graphQuery = ""; this.graphLimit = GRAPH_NODE_STEP;
    this.view = "graph"; this.selected = null; this.trail = [];
    this.render();
  }

  // Going to another node of the graph keeps the one left behind for "back".
  noteGraphStep(obj) {
    if (this.graphSelected && this.graphSelected !== obj) this.graphTrail.push(this.graphSelected);
  }

  // Leaving a page through a link (not the menu) keeps it for "back".
  noteJump(view) {
    if (view !== this.view) this.viewTrail.push({ view: this.view, scroll: this.rememberScroll() });
  }

  // Back from the graph: one node at a time, then to where the graph was opened from.
  graphBack() {
    const previous = this.graphTrail.pop();
    if (previous) { this.graphSelected = previous; this.graphLimit = GRAPH_NODE_STEP; this.render(); return; }
    const from = this.graphOrigin;
    this.graphOrigin = null;
    if (!from) return;
    this.view = from.view; this.selected = from.selected; this.trail = from.trail;
    this.detailTab = from.tab || "overview";
    this.render();
    this.restoreScroll(from.scroll);
  }

  // What the graph's back button names: the node before, or the page the graph was opened from.
  graphBackLabel() {
    const node = this.graphTrail[this.graphTrail.length - 1];
    if (node) return node.name;
    const from = this.graphOrigin;
    return from ? (from.selected ? from.selected.name : this.t(from.view)) : "";
  }

  // Back after a jump from one page to another (overview card to a list and the like).
  viewBack() {
    const from = this.viewTrail.pop();
    if (!from) return;
    this.view = from.view; this.pages = {};
    this.render();
    this.restoreScroll(from.scroll);
  }

  statusLabel(status) { return this.t(status); }

  objectKey(item) { return `${item.object_type}:${item.object_id}`; }

  findObject(key) {
    if (!this.data) return undefined;
    if (!this._index || this._indexSource !== this.data) {
      this._index = new Map(this.data.objects.map(item => [this.objectKey(item), item]));
      this._indexSource = this.data;
    }
    return this._index.get(key);
  }

  findingKey(finding) { return `${finding.rule_id.split(".")[0]}:${finding.object_id}`; }

  haPath(item) {
    switch (item.object_type) {
      case "entity": return `/config/entities?search=${encodeURIComponent(item.object_id)}`;
      case "device": return `/config/devices/device/${encodeURIComponent(item.object_id)}`;
      case "area": return `/config/areas/area/${encodeURIComponent(item.object_id)}`;
      case "automation": return item.automation_id
        ? `/config/automation/edit/${encodeURIComponent(item.automation_id)}`
        : `/config/entities?search=${encodeURIComponent(item.object_id)}`;
      case "script": return `/config/script/edit/${encodeURIComponent(item.object_id.replace(/^script\./, ""))}`;
      case "scene": return item.scene_id
        ? `/config/scene/edit/${encodeURIComponent(item.scene_id)}`
        : `/config/entities?search=${encodeURIComponent(item.object_id)}`;
      case "dashboard": return `/${encodeURIComponent(item.url_path || "lovelace")}`;
      case "config_entry": return `/config/integrations/integration/${encodeURIComponent(item.domain)}`;
      case "floor": return "/config/areas/dashboard";
      case "label": return "/config/labels";
      default: return null;
    }
  }

  navigateHA(path) {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  // What a screen reader announces: scan, backup and plan progress, nothing while idle.
  liveStatus() {
    if (this.busy) return `${this.t("scanning")}${this.scanStatus?.running ? ` ${this.scanStatus.progress}%` : ""}`;
    const plan = this.plan;
    if (plan && (plan.status === "backup" || plan.status === "running")) {
      if (plan.status === "backup" || this.planProgress?.phase === "backup") return this.t("backupRunning");
      return `${this.t("running")} ${this.planProgress ? this.t("progressOf", { done: this.planProgress.done, total: this.planProgress.total }) : ""}`.trim();
    }
    return "";
  }

  // The sidebar is rebuilt with the page: keep its scroll position, and bring the current entry into
  // view when the view changed (on a small screen the navigation scrolls sideways).
  scanButtonInner() {
    const progress = this.scanStatus?.running ? ` ${this.scanStatus.progress}%` : "";
    return `<ha-icon icon="mdi:refresh"></ha-icon>${this.busy ? this.t("scanning") + progress : this.t("scan")}`;
  }

  // The scan status arrives every few hundred milliseconds: only the scan button and the status
  // line for screen readers change, so the page is not rebuilt for it.
  renderProgress() {
    const root = this.shadowRoot, button = root?.querySelector?.("[data-action='scan']");
    const live = root?.querySelector?.("[role='status']");
    if (!button || !live) { this.render(); return; }
    button.innerHTML = this.scanButtonInner();
    button.disabled = Boolean(this.busy || this.cleanupRunning());
    live.textContent = this.liveStatus();
  }

  // Search fields change their state at once but re-render after a short pause.
  scheduleRender() {
    if (this._searchTimer) globalThis.clearTimeout?.(this._searchTimer);
    this._searchTimer = this.defer(() => { this._searchTimer = null; this.render(); }, SEARCH_DEBOUNCE_MS);
  }

  defer(fn, ms) { return setTimeout(fn, ms); }

  debugEnabled() {
    try { return globalThis.localStorage?.getItem("hk_debug") === "1"; } catch (_) { return false; }
  }

  // A re-render replaces the page, so the focused control is found again by id or data attribute.
  captureFocus() {
    const el = this.shadowRoot?.activeElement;
    if (!el?.getAttribute) return null;
    let selector = null;
    if (el.id) selector = `#${el.id}`;
    else {
      for (const attr of el.attributes || []) {
        if (attr.name.startsWith("data-")) { selector = `${el.localName}[${attr.name}="${String(attr.value).replace(/["\\]/g, "\\$&")}"]`; break; }
      }
    }
    return selector ? { selector, start: el.selectionStart ?? null, end: el.selectionEnd ?? null } : null;
  }

  restoreFocus(saved) {
    if (!saved) return;
    let next = null;
    try { next = this.shadowRoot.querySelector(saved.selector); } catch (_) { return; }
    if (!next || next.disabled) return;
    next.focus({ preventScroll: true });
    if (saved.start !== null && next.setSelectionRange) {
      try { next.setSelectionRange(saved.start, saved.end); } catch (_) { /* not a text field */ }
    }
  }

  // Derived data is kept per data set; it is rebuilt when the data, a change in place or one of the
  // given values changes.
  memo(name, deps, build) {
    const cache = this._memo ||= new Map(), hit = cache.get(name);
    if (hit && hit.data === this.data && hit.rev === this._rev && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.value;
    const value = build();
    cache.set(name, { data: this.data, rev: this._rev, deps, value });
    return value;
  }

  // Collators are created once per language; creating one per comparison is slow.
  collators() {
    if (this._collators?.lang !== this.lang) {
      this._collators = { lang: this.lang, natural: new Intl.Collator(this.lang, { numeric: true, sensitivity: "base" }), ids: new Intl.Collator(this.lang, { numeric: true }), plain: new Intl.Collator() };
    }
    return this._collators;
  }

  // Edges by source and by target, plus every target that something uses (in edge order).
  edgeIndex() {
    return this.memo("edges", [], () => {
      const bySource = new Map(), byTarget = new Map(), used = new Set(), order = new Map();
      (this.data.edges || []).forEach((edge, i) => {
        order.set(edge, i);
        (bySource.get(edge.source) || bySource.set(edge.source, []).get(edge.source)).push(edge);
        (byTarget.get(edge.target) || byTarget.set(edge.target, []).get(edge.target)).push(edge);
        if (USAGE_RELATIONS.includes(edge.relation)) used.add(edge.target);
      });
      return { bySource, byTarget, used, order };
    });
  }

  edgesFrom(key) { return this.edgeIndex().bySource.get(key) || []; }

  edgesTo(key) { return this.edgeIndex().byTarget.get(key) || []; }

  // One tooltip for name and id: the name in bold, the id below. The browser's own tooltip cannot style the two lines.
  showTip(el) {
    const root = this.shadowRoot;
    let tip = this._tip;
    if (!tip || tip.parentNode !== root) { tip = this._tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "tooltip"); root.appendChild(tip); }
    tip.innerHTML = `<strong>${this.esc(el.dataset.tip)}</strong><span>${this.esc(el.dataset.tipSub || "")}</span>`;
    const box = el.getBoundingClientRect();
    tip.style.left = `${Math.max(8, Math.min(box.left, globalThis.innerWidth - 320))}px`;
    tip.style.top = `${box.bottom + 6}px`;
    tip.hidden = false;
  }

  hideTip() { if (this._tip) this._tip.hidden = true; }

  render() {
    if (!this.shadowRoot) return;
    if (this._searchTimer) { globalThis.clearTimeout?.(this._searchTimer); this._searchTimer = null; }
    const started = this._debug ? globalThis.performance?.now?.() : null;
    const focus = this.captureFocus();
    // A view that throws shows a message under the top bar instead of freezing the panel on the last page.
    let page;
    try { page = this.selected && this.data ? this.detail() : `${this.heading()}${this.content()}`; } catch (err) { page = this.renderFailed(err); }
    const shell = `<div class="shell${this.dense ? " dense" : ""}"><div class="stickyhead">${this.topbar()}${this.safetyBar()}</div><main class="main">${page}</main>${this.noteDialog()}${this.pinDialog()}${this.remDialog()}${this.confirmDialog()}<div class="sr-only" role="status" aria-live="polite">${this.esc(this.liveStatus())}</div></div>`;
    // The style sheet is only parsed again when the theme changed; otherwise just the page is replaced.
    const root = this.shadowRoot, css = this.themeCss(), current = root.querySelector?.(".shell");
    let swapped = false;
    if (current && this._styleKey === css && root.querySelector("style[data-hk]")) {
      // WebKit refuses outerHTML on a child of the shadow root, so the new page goes in through a template.
      // Should a browser refuse that too, the whole root is rebuilt below rather than keeping the old page.
      try { const tpl = document.createElement("template"); tpl.innerHTML = shell; current.replaceWith(tpl.content); swapped = true; } catch (err) { this.logRenderError(err); }
    }
    if (!swapped) { root.innerHTML = `${this.styles()}${shell}`; this._styleKey = css; }
    this.restoreFocus(focus);
    this.bind();
    if (this._scrollPlan) { this._scrollPlan = false; setTimeout(() => root.querySelector("[data-plan-card]")?.scrollIntoView?.({ block: "start", behavior: "smooth" }), 30); }
    if (started !== null) console.debug(`[ha_housekeeper] render ${this.selected ? "detail" : this.view}: ${(globalThis.performance.now() - started).toFixed(1)} ms`);
    if (this.data) { this.syncGuard(); this.syncUrl(); }
  }

  renderFailed(err) {
    this.logRenderError(err);
    return `<div class="error" role="alert"><strong>${this.t("renderError")}</strong><br>${this.esc(err?.message || String(err))}<br><button class="btn" data-view="overview">${this.t("overview")}</button></div>`;
  }

  // Once per message, so a view that fails on every render does not flood the log.
  logRenderError(err) {
    const text = err?.message || String(err);
    if ((this._renderErrors ||= new Set()).has(text)) return;
    this._renderErrors.add(text);
    this.noteError?.("render", err);
    console.error("[ha_housekeeper] render failed:", err);
  }

  // Deep links: /ha-housekeeper?view=findingsNav&filter=orphaned or ?object=entity:sensor.x
  applyUrl() {
    if (this._urlApplied || typeof window === "undefined" || !this.data) return;
    this._urlApplied = true;
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view") === "storms" ? "recorder" : params.get("view"); // the load view moved into "Recorder"
    if (view && (view === "unreferenced" || NAV.some(([name]) => name === view))) this.view = view;
    else if (!params.get("object") && this.prefs.startView !== "overview") this.view = this.prefs.startView;
    if (params.get("filter")) this.findingFilter = params.get("filter");
    this._pendingTab = params.get("tab");
    if (view && params.get("tab") && !params.get("object")) (this.viewTab ||= {})[this.view] = params.get("tab");
    const obj = this.findObject(params.get("object") || "");
    if (obj) this.openObject(obj);
    else if (this.view === "changes" && !this.compare) this.loadCompare();
  }

  syncUrl() {
    if (typeof window === "undefined" || !this.isConnected || !window.history?.replaceState) return;
    if (window.location.pathname !== this._basePath) return; // HA already navigated elsewhere
    const params = new URLSearchParams();
    if (this.selected) {
      params.set("object", this.objectKey(this.selected));
      if (this.detailTab !== "overview") params.set("tab", this.detailTab);
    }
    else {
      if (this.view !== "overview") params.set("view", this.view);
      if (this.viewTab?.[this.view]) params.set("tab", this.viewTab[this.view]);
      if (this.view === "findingsNav" && this.findingFilter) params.set("filter", this.findingFilter);
    }
    const query = params.toString();
    try { window.history.replaceState(window.history.state, "", window.location.pathname + (query ? `?${query}` : "")); } catch (_) { /* ignore */ }
  }

  topbar() {
    const counts = this.data ? { inventory: this.formatNumber(this.data.meta.object_count), findingsNav: this.data.findings.filter(f => !f.ignored).length, batteries: this.lowBatteries().length || undefined, reminders: (this.data.reminders || []).filter(r => r.state === "due").length || undefined, cleanup: this.readyQuarantine() || undefined, repair: this.counterScan?.items?.length || undefined } : {};
    const item = view => `<button class="nav ${this.view === view ? "active" : ""}" data-view="${view}" ${this.view === view ? 'aria-current="page"' : ""}><ha-icon icon="${NAV_ICONS[view]}"></ha-icon><span>${this.t(view)}</span>${counts[view] !== undefined ? `<em>${counts[view]}</em>` : ""}</button>`;
    const [direct, ...menus] = NAV_GROUPS;
    const menu = ([label, views]) => {
      const open = this.menuOpen === label;
      const sum = views.reduce((n, v) => n + (typeof counts[v] === "number" && v !== "inventory" ? counts[v] : 0), 0);
      return `<div class="navmenu${open ? " open" : ""}"><button class="nav menubtn ${views.includes(this.view) ? "group-active" : ""}" data-menu="${label}" aria-expanded="${open}" aria-controls="menu-${label}"><span>${this.t(label)}</span>${sum ? `<em aria-label="${this.esc(this.t("groupOpen", { count: sum }))}">${sum}</em>` : ""}<ha-icon class="caret" icon="mdi:chevron-down"></ha-icon></button><div class="navpop" id="menu-${label}" role="group" aria-label="${this.esc(this.t(label))}"><p class="navhead" aria-hidden="true">${this.t(label)}</p>${views.map(item).join("")}</div></div>`;
    };
    return `<header class="top${this.navOpen ? " open" : ""}"><div class="brand"><span class="brandmark"><img src="/ha_housekeeper/logo.png" alt="" onerror="this.parentNode.classList.add('nologo');this.remove()"><ha-icon icon="mdi:broom"></ha-icon></span><strong>${this.t("title")}</strong></div>
      <button class="navtoggle" data-navtoggle aria-expanded="${Boolean(this.navOpen)}" aria-controls="topnav"><ha-icon icon="mdi:menu"></ha-icon><span>${this.t("navMenu")}</span></button>
      <nav class="topnav" id="topnav" aria-label="${this.esc(this.t("navMain"))}">${direct[1].map(item).join("")}${menus.map(menu).join("")}<div class="navend">${this.quickSearchBox()}${item("settings")}</div></nav></header>`;
  }

  // The small line above the title names the menu group the view belongs to.
  // Placeholder lines while a card loads; the text stays for screen readers.
  skeleton(key) {
    return `<div class="skeleton" role="status" aria-live="polite"><span class="sr-only">${this.t(key)}</span><i></i><i></i><i></i></div>`;
  }

  // "Not counted: 2 hidden, 1 disabled": what a view left out, so a short list is not mistaken for a clean bill.
  excludedText(excluded) {
    const e = excluded || {}, parts = [];
    if (e.ignored) parts.push(this.t("exclIgnored", { n: this.formatNumber(e.ignored) }));
    if (e.disabled) parts.push(this.t("exclDisabled", { n: this.formatNumber(e.disabled) }));
    if (e.permanent) parts.push(this.t("exclPermanent", { n: this.formatNumber(e.permanent) }));
    return parts.length ? this.t("exclLine", { list: parts.join(", ") }) : "";
  }

  // One line that says how complete the numbers are, so a precise figure does not pretend more.
  coverageNote(text) {
    return `<p class="factnote coverage"><ha-icon icon="mdi:information-outline"></ha-icon><span>${text}</span></p>`;
  }

  eyebrowFor(view) {
    if (view === "settings") return this.t("title");
    if (view === "overview") return this.t("navGroupOverview");
    const group = NAV_GROUPS.find(([, views]) => views.includes(view));
    return group ? this.t(group[0]) : this.t("navGroupOverview");
  }

  // "just now", "3 min ago", "5 h ago", "2 days ago" for the scan time shown next to the scan button.
  agoText(iso) {
    const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!Number.isFinite(seconds)) return "";
    if (seconds < 90) return this.t("agoNow");
    if (seconds < 5400) return this.t("agoMinutes", { n: Math.round(seconds / 60) });
    if (seconds < 129600) return this.t("agoHours", { n: Math.round(seconds / 3600) });
    return this.t("agoDays", { n: Math.round(seconds / 86400) });
  }

  heading() {
    const titles = {
      overview: [this.t("health"), this.t("subtitle")],
      inventory: [this.t("inventory"), this.t("inventorySubtitle")],
      findingsNav: [this.t("findings"), this.t("findingsSubtitle")],
      changes: [this.t("changes"), this.t("changesSubtitle")],
      batteries: [this.t("batteries"), this.t("batteriesSubtitle")],
      reminders: [this.t("reminders"), this.t("remindersSubtitle")],
      unreferenced: [this.t("unreferenced"), this.t("unreferencedSubtitle")],
      graph: [this.t("pathTitle"), this.t("pathSubtitle")],
      settings: [this.t("settings"), this.t("settingsSubtitle")],
      cleanup: [this.t("cleanup"), this.t("cleanupSubtitle")],
      repair: [this.t("repair"), this.t("repairSubtitle")],
      journal: [this.t("journal"), this.t("journalSubtitle")],
      maintenance: [this.t("maintenance"), this.t("maintenanceSubtitle")],
      reliability: [this.t("reliability"), this.t("reliabilitySubtitle")],
      runs: [this.t("runsHeading"), this.t("runsSubtitle")],
      recorder: [this.t("recorder"), this.t("recorderSubtitle")],
      exposure: [this.t("exposure"), this.t("exposureSubtitle")],
      policies: [this.t("policies"), this.t("policiesSubtitle")],
    };
    const [title, sub] = titles[this.view] || titles.overview;
    const writes = ["cleanup", "repair", "maintenance", "policies"].includes(this.view);
    const modePill = this.view === "overview" || this.view === "settings" ? "" : `<span class="pill ${writes ? "warn" : "mute"} modepill" title="${this.esc(this.t(writes ? "canChangeHint" : "readOnlyHint"))}"><ha-icon icon="${writes ? "mdi:pencil-outline" : "mdi:eye-outline"}"></ha-icon>${this.t(writes ? "canChange" : "readOnly")}</span>`;
    const scanned = this.data?.meta?.scanned_at;
    const ago = scanned ? `<span class="scanago" title="${this.esc(this.formatDate(scanned))}">${this.t("lastScan")}: ${this.agoText(scanned)}</span>` : "";
    const from = this.viewTrail[this.viewTrail.length - 1];
    // Every back button sits in this row at the top of the page, like the one of the detail page.
    const graphBack = this.view === "graph" && this.graphSelected && this.graphBackLabel() ? `<button class="btn" data-action="graph-back"><ha-icon icon="mdi:arrow-left"></ha-icon>${this.t("backTo")} ${this.esc(this.graphBackLabel())}</button>` : "";
    const viewBack = from ? `<button class="btn" data-action="view-back"><ha-icon icon="mdi:arrow-left"></ha-icon>${this.t("backTo")} ${this.t(from.view)}</button>` : "";
    const back = graphBack || viewBack ? `<div class="crumbs">${viewBack}${graphBack}</div>` : "";
    return `${back}<div class="heading"><div><p class="eyebrow">${this.eyebrowFor(this.view)}</p><h1>${title}</h1><span class="sub">${sub}</span></div>
      <div class="head-actions">${modePill}${ago}<button class="btn primary" data-action="scan" ${this.busy || this.cleanupRunning() ? "disabled" : ""}>${this.scanButtonInner()}</button></div></div>${this.warmupBanner()}`;
  }

  content() {
    if (this.view === "settings") return this.settingsView();
    if (this.error) return `<div class="error"><strong>${this.t("loadError")}</strong><br>${this.esc(this.error)}</div>`;
    if (!this.data) { const pct = this.scanStatus?.running ? Math.max(0, Math.min(100, Number(this.scanStatus.progress) || 0)) : null; return `${this.skeleton("loading")}${pct === null ? "" : `<div class="panel"><p class="factnote">${this.t("firstScan", { percent: pct })}</p><div class="bar"><i style="width:${pct}%"></i></div></div>`}`; }
    if (this.view === "inventory") return this.inventory();
    if (this.view === "findingsNav") return this.findingsView();
    if (this.view === "changes") return this.changesView();
    if (this.view === "batteries") return this.batteriesView();
    if (this.view === "reminders") return this.remindersView();
    if (this.view === "unreferenced") return this.unreferencedView();
    if (this.view === "cleanup") return this.cleanupView();
    if (this.view === "repair") return this.repairView();
    if (this.view === "journal") return this.journalView();
    if (this.view === "maintenance") return this.maintenanceView();
    if (this.view === "reliability") return this.reliabilityView();
    if (this.view === "recorder") return this.recorderView();
    if (this.view === "exposure") return this.exposureView();
    if (this.view === "policies") return this.policiesView();
    if (this.view === "runs") return this.runsView();
    if (this.view === "graph") return this.graph();
    return this.overview();
  }

  tone(status) { return STATUS_TONE[status] || "blue"; }

  pill(status) { return `<span class="pill ${this.tone(status)}">${this.esc(this.statusLabel(status))}</span>`; }

  tile(type, tone = "") { return `<span class="tile ${tone}"><ha-icon icon="${ICONS[type] || "mdi:help-circle-outline"}"></ha-icon></span>`; }

  findingType(f) { return this.findObject(this.findingKey(f))?.object_type || f.rule_id.split(".")[0]; }

  check(label, tone, value, badge) { return { label, tone, value, badge }; }

  bind() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-view]").forEach(el => el.onclick = () => { this.menuOpen = null; this.navOpen = false; this.view = el.dataset.view; this.pages = {}; this.selected = null; this.trail = []; this.viewTrail = []; this.graphTrail = []; this.graphOrigin = null; this.render(); if (this.view === "changes" && !this.compare) this.loadCompare(); });
    root.querySelectorAll("[data-menu]").forEach(el => el.onclick = () => { this.menuOpen = this.menuOpen === el.dataset.menu ? null : el.dataset.menu; this.render(); });
    this.bindQuick(root);
    root.querySelector("[data-navtoggle]")?.addEventListener("click", () => { this.navOpen = !this.navOpen; this.render(); });
    if (!this._menuBound && root.addEventListener) {
      this._menuBound = true;
      root.addEventListener("click", ev => {
        if (!this.menuOpen || (ev.composedPath?.() || []).some(node => node.classList?.contains?.("navmenu"))) return;
        this.menuOpen = null; this.render();
      });
      root.addEventListener("click", ev => { this._shift = ev.shiftKey; }, true);
      // Arrow keys move between the rows of a list: to the first control of the next or previous row.
      root.addEventListener("keydown", ev => {
        if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
        const from = ev.composedPath?.()[0];
        if (!from?.closest || from.matches("input[type=search],input[type=text],select,textarea")) return;
        const row = from.closest("tr, .row");
        if (!row || row.classList.contains("foldhead")) return;
        let next = ev.key === "ArrowDown" ? row.nextElementSibling : row.previousElementSibling;
        while (next && !next.matches("tr, .row")) next = ev.key === "ArrowDown" ? next.nextElementSibling : next.previousElementSibling;
        const target = next?.matches("tr[tabindex]") ? next : next?.querySelector("input[type=checkbox], button, [tabindex]");
        if (target) { ev.preventDefault(); target.focus(); }
      });
      root.addEventListener("keydown", ev => {
        const typing = (ev.composedPath?.()[0]?.matches?.("input,select,textarea")) || ev.metaKey || ev.ctrlKey || ev.altKey;
        if (ev.key === "/" && !typing) {
          const box = root.querySelector("[data-lq]") || root.querySelector("[data-quick]");
          if (box) { ev.preventDefault(); box.focus(); box.select?.(); }
        } else if (ev.key === "Escape" && !this.menuOpen && !this.navOpen && !(ev.composedPath?.()[0]?.matches?.("input,select,textarea"))) {
          if (this.selected) { ev.preventDefault(); this.goBack(); }
          else if (this.plan && this.plan.status === "dry_run") { ev.preventDefault(); root.querySelector("[data-plan-close]")?.click(); }
        }
      });
      root.addEventListener("keydown", ev => {
        if (ev.key !== "Escape" || !(this.menuOpen || this.navOpen)) return;
        const label = this.menuOpen;
        this.menuOpen = null; this.navOpen = false; this.render();
        root.querySelector(label ? `[data-menu="${label}"]` : "[data-navtoggle]")?.focus?.();
      });
    }
    root.querySelectorAll("[data-scan-point]").forEach(el => el.addEventListener("click", () => this.load(true)));
    root.querySelectorAll("[data-action='scan']").forEach(el => el.addEventListener("click", () => this.load(true)));
    root.querySelector("[data-action='back']")?.addEventListener("click", () => this.goBack());
    root.querySelectorAll("[data-view-tab]").forEach(el => {
      el.onclick = () => this.pickViewTab(el.dataset.viewTab);
      el.onkeydown = ev => {
        const tabs = [...el.parentElement.querySelectorAll("[data-view-tab]")].map(b => b.dataset.viewTab), at = tabs.indexOf(el.dataset.viewTab);
        const next = { ArrowRight: tabs[(at + 1) % tabs.length], ArrowLeft: tabs[(at - 1 + tabs.length) % tabs.length], Home: tabs[0], End: tabs[tabs.length - 1] }[ev.key];
        if (!next) return;
        ev.preventDefault();
        this.pickViewTab(next);
        const target = this.shadowRoot.querySelector(`[data-view-tab="${next}"]`);
        target?.focus();
        target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      };
    });
    root.querySelector("[data-action='graph-back']")?.addEventListener("click", () => this.graphBack());
    root.querySelector("[data-action='view-back']")?.addEventListener("click", () => this.viewBack());
    root.querySelectorAll("[data-detail-tab]").forEach(el => {
      el.onclick = () => { this.detailTab = el.dataset.detailTab; this.render(); };
      el.onkeydown = ev => {
        const ids = [...root.querySelectorAll("[data-detail-tab]")].map(b => b.dataset.detailTab), at = ids.indexOf(el.dataset.detailTab);
        const next = { ArrowRight: ids[(at + 1) % ids.length], ArrowLeft: ids[(at - 1 + ids.length) % ids.length], Home: ids[0], End: ids[ids.length - 1] }[ev.key];
        if (!next) return;
        ev.preventDefault();
        this.detailTab = next;
        this.render();
        this.shadowRoot.querySelector(`[data-detail-tab="${next}"]`)?.focus();
      };
    });
    root.querySelectorAll("[data-goto-tab]").forEach(el => el.onclick = () => { this.detailTab = el.dataset.gotoTab; this.render(); });
    root.querySelectorAll("[data-graph-open]").forEach(el => el.onclick = () => this.openGraph(this.findObject(el.dataset.graphOpen)));
    root.querySelectorAll("[data-safe]").forEach(el => el.onclick = () => {
      if (el.dataset.safeKey === "mode") this.settingsTab = "protection";
      this.noteJump(el.dataset.safe); this.view = el.dataset.safe; this.pages = {}; this.selected = null;
      this.render();
    });
    root.querySelectorAll("[data-jump]").forEach(el => el.onclick = () => {
      this.noteJump(el.dataset.jump);
      this.view = el.dataset.jump; this.pages = {};
      if (el.dataset.jumpTab) (this.viewTab ||= {})[this.view] = el.dataset.jumpTab;
      if (el.dataset.filter !== undefined) this.findingFilter = el.dataset.filter;
      if (el.dataset.jump === "inventory") { this.statusFilter = el.dataset.status || ""; this.typeFilter = el.dataset.type || ""; this.pages = {}; }
      this.render();
    });
    root.querySelectorAll("[data-tip]").forEach(el => { el.onmouseenter = () => this.showTip(el); el.onmouseleave = () => this.hideTip();
      const holder = el.closest?.("tr") || (el.hasAttribute?.("tabindex") ? el : null);
      if (holder) { holder.onfocus = () => this.showTip(el); holder.onblur = () => this.hideTip(); }
      // Touch: a long press shows the tooltip for a few seconds and does not open the object.
      el.ontouchstart = () => { globalThis.clearTimeout?.(this._tipTimer); this._tipTimer = globalThis.setTimeout?.(() => { this._tipShownAt = Date.now(); this.showTip(el); globalThis.clearTimeout?.(this._tipHide); this._tipHide = globalThis.setTimeout?.(() => this.hideTip(), 4000); }, 500); };
      el.ontouchend = el.ontouchmove = el.ontouchcancel = () => globalThis.clearTimeout?.(this._tipTimer);
      el.oncontextmenu = ev => { if (Date.now() - (this._tipShownAt || 0) < 1500) ev.preventDefault(); };
      el.addEventListener?.("click", ev => { if (Date.now() - (this._tipShownAt || 0) < 800) { ev.stopImmediatePropagation(); ev.preventDefault(); } });
    });
    root.querySelectorAll("[data-col-open]").forEach(el => el.onclick = () => { this._colOpen = this._colOpen === el.dataset.colOpen ? "" : el.dataset.colOpen; this.render(); });
    root.querySelectorAll("[data-col]").forEach(el => el.onchange = () => { const [id, key] = el.dataset.col.split("|"); this.toggleCol(id, key); });
    root.querySelectorAll("[data-export-list]").forEach(el => el.onclick = () => this.exportList(el.dataset.exportList));
    root.querySelectorAll("[data-win-act]").forEach(el => el.onclick = () => { const [name, ...rest] = el.dataset.winAct.split(":"); this.winAct(name, rest.join(":")); });
    root.querySelectorAll("[data-inv-filter]").forEach(el => el.onclick = () => { const [type, status] = el.dataset.invFilter.split("|"); this.typeFilter = type; this.statusFilter = status; this.pages = {}; this.render(); });
    root.querySelectorAll("[data-type-jump]").forEach(el => el.onclick = () => { this.noteJump("inventory"); this.typeFilter = el.dataset.typeJump; this.statusFilter = ""; this.pages = {}; this.view = "inventory"; this.render(); });
    root.querySelectorAll("[data-export]").forEach(el => el.onclick = () => this.exportFindings(el.dataset.export));
    this.bindFindingStatus(root);
    this.bindDetailActions(root);
    root.querySelectorAll("[data-battery-filter]").forEach(el => el.onclick = () => { this.batteryFilter = el.dataset.batteryFilter; this.pages = {}; this.render(); });
    root.querySelectorAll("[data-ignore]").forEach(el => el.onclick = async () => {
      const key = el.dataset.ignore, ignored = el.dataset.ignoreValue === "1";
      try {
        await this._hass.callWS({ type: "ha_housekeeper/ignore", finding_key: key, ignored });
        const finding = this.data.findings.find(f => f.key === key);
        if (finding) { finding.ignored = ignored; finding.ignored_by = ignored ? "user" : null; this._rev++; }
      } catch (err) { this.failed(err); }
      this.render();
    });
    root.querySelector("[data-toggle-followers]")?.addEventListener("click", () => { this.showFollowers = !this.showFollowers; this.pages = {}; this.render(); });
    root.querySelector("[data-finding-due]")?.addEventListener("click", () => { this.findingDue = !this.findingDue; this.pages = {}; this.render(); });
    this.bindMarks(root);
    this.bindStale(root);
    this.bindNotes(root);
    this.bindConfirm(root);
    root.querySelectorAll("[data-health-why]").forEach(el => el.onclick = () => { this.healthWhy = !this.healthWhy; this.render(); });
    root.querySelector("[data-todo-jump]")?.addEventListener("click", () => { const card = root.querySelector("#hk-todo-card"); card?.scrollIntoView?.({ block: "start", behavior: "smooth" }); card?.focus?.({ preventScroll: true }); });
    this.bindExport(root);
    this.bindPlanWizard(root);
    this.bindExclude(root);
    this.bindEntityRecorder(root);
    this.bindEntityTrim(root);
    this.bindScanPoints(root);
    this.bindKnown(root);
    this.bindGoals(root);
    this.bindExchange(root);
    this.bindDiagnostics(root);
    this.bindTraceDiag(root);
    this.bindRefactor(root);
    this.bindBatteryCare(root);
    this.bindCriteriaHistory(root);
    this.bindBackupCleanup(root);
    this.bindDetailEdit(root);
    this.bindPolSel(root);
    this.bindPolicyRow(root);
    this.bindCounter(root);
    this.bindPicker(root);
    root.querySelectorAll("[data-decide-open]").forEach(el => el.onclick = () => this.openDecide(el.dataset.decideOpen, el.dataset.decidePreset));
    root.querySelectorAll("[data-decide-form]").forEach(form => {
      form.onsubmit = ev => { ev.preventDefault(); this.commitDecide(); };
      form.querySelector("[data-decide-kind]").onchange = ev => { this.decide.kind = ev.target.value; this.decide.error = ""; if (this.decide.kind === "snooze" && !Number(this.decide.days)) this.decide.days = 30; this.render(); };
      form.querySelector("[data-decide-reason]").oninput = ev => { this.decide.reason = ev.target.value; };
      form.querySelector("[data-decide-days]").onchange = ev => { this.decide.days = Number(ev.target.value); };
      form.onkeydown = ev => { if (ev.key === "Escape") { ev.preventDefault(); this.decide = null; this.render(); } };
    });
    root.querySelectorAll("[data-decide-cancel]").forEach(el => el.onclick = () => { this.decide = null; this.render(); });
    root.querySelectorAll("[data-finding-after]").forEach(el => el.onclick = () => { this.findingAfter = !this.findingAfter; this.pages = {}; this.render(); });
    root.querySelectorAll("[data-finding-filter]").forEach(el => el.onclick = () => { this.findingFilter = el.dataset.findingFilter; this.pages = {}; this.render(); });
    const searchField = (selector, setter) => {
      const input = root.querySelector(selector);
      if (input) input.oninput = () => { setter(input.value); this.scheduleRender(); };
    };
    searchField("#query", v => { this.query = v; this.pages = {}; });
    root.querySelectorAll("[data-baseline]").forEach(b => b.addEventListener("click", () => { this.compareBaseline = b.dataset.baseline; this.pages = {}; this.loadCompare(); }));
    const bl = root.querySelector("#baseline"); if (bl) bl.onchange = () => { this.compareBaseline = bl.value; this.pages = {}; this.loadCompare(); };
    const tf = root.querySelector("#typeFilter"); if (tf) tf.onchange = () => { this.typeFilter = tf.value; this.pages = {}; this.render(); };
    const sf = root.querySelector("#statusFilter"); if (sf) sf.onchange = () => { this.statusFilter = sf.value; this.pages = {}; this.render(); };
    const sk = root.querySelector("#sortKey"); if (sk) sk.onchange = () => { this.sort = sk.value; this.pages = {}; this.render(); };
    const sd = root.querySelector("#sortDir"); if (sd) sd.onclick = () => { this.sortDir = this.sortDir === "asc" ? "desc" : "asc"; this.pages = {}; this.render(); };
    root.querySelectorAll("th[data-sort]").forEach(el => el.onclick = () => {
      if (this.sort === el.dataset.sort) this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      else { this.sort = el.dataset.sort; this.sortDir = "asc"; }
      this.pages = {}; this.render();
    });
    root.querySelectorAll("[data-object]").forEach(el => el.onclick = ev => { const inner = ev?.target?.closest?.("button, select, input, a, label"); if (inner && inner !== el && el.contains(inner)) return; const obj = this.findObject(el.dataset.object); if (obj) this.openObject(obj); });
    // Table rows and graph nodes are not native buttons: Enter and Space open them like a click.
    const openByKey = el => el.onkeydown = ev => {
      if (ev.target !== el || (ev.key !== "Enter" && ev.key !== " ")) return;
      ev.preventDefault();
      if (el.click) el.click(); else el.onclick?.();
    };
    root.querySelectorAll("tr[data-object], g[data-graph]").forEach(openByKey);
    root.querySelectorAll("g[data-graph-group]").forEach(openByKey);
    root.querySelectorAll("[data-graph-depth]").forEach(el => el.onclick = () => { this.graphDepth = Number(el.dataset.graphDepth); this.graphLimit = GRAPH_NODE_STEP; this.render(); });
    root.querySelector("[data-graph-impact]")?.addEventListener("click", () => { this.graphImpact = !this.graphImpact; this.render(); });
    root.querySelector("[data-graph-more]")?.addEventListener("click", () => { this.graphLimit += GRAPH_NODE_STEP; this.render(); });
    const gr = root.querySelector("#graphRel"); if (gr) gr.onchange = () => { this.graphRel = gr.value; this.render(); };
    const gc = root.querySelector("#graphConf"); if (gc) gc.onchange = () => { this.graphConf = gc.value; this.render(); };
    root.querySelectorAll("[data-graph-group]").forEach(el => el.onclick = () => { this.graphOpen.add(el.dataset.graphGroup); this.render(); });
    root.querySelector("[data-graph-regroup]")?.addEventListener("click", () => { this.graphOpen = new Set(); this.render(); });
    root.querySelectorAll("[data-graph]").forEach(el => el.onclick = () => { const obj = this.findObject(el.dataset.graph); if (obj) { this.noteGraphStep(obj); this.graphSelected = obj; this.graphQuery = ""; this.graphLimit = GRAPH_NODE_STEP; this.render(); } });
    root.querySelectorAll("[data-ha-path]").forEach(el => el.onclick = () => this.navigateHA(el.dataset.haPath));
    root.querySelectorAll("[data-pref]").forEach(el => el.onclick = () => { const [key, value] = el.dataset.pref.split("|"); this.setPref(key, value); });
    root.querySelectorAll("[data-pref-select]").forEach(el => el.onchange = () => this.setPref(el.dataset.prefSelect, el.value));
    root.querySelectorAll("[data-unref-tab]").forEach(el => el.onclick = () => { this.unrefTab = el.dataset.unrefTab; if (this.view === "cleanup") (this.viewTab ||= {}).cleanup = this.unrefTab === "statistics" ? "stats" : "unused"; this.retryOrphanLast(); this.pages = {}; this.render(); });
    root.querySelector("[data-diag-copy]")?.addEventListener("click", () => this.copyIssueText());
    root.querySelector("[data-diagnostics]")?.addEventListener("click", () => this.downloadText("diagnostics.json", JSON.stringify(this.diagnosticsData(), null, 2), "application/json"));
    root.querySelectorAll("[data-protection]").forEach(el => el.addEventListener("change", ev => this.setProtection(ev.target.value)));
    root.querySelector("[data-notify]")?.addEventListener("change", async ev => {
      try { await this._hass.callWS({ type: "ha_housekeeper/notify_set", enabled: ev.target.checked }); this.data.meta.notify = ev.target.checked; }
      catch (err) { this.failed(err); }
      this.render();
    });
    root.querySelector("[data-bp-refresh]")?.addEventListener("click", () => { this._blueprintsRequested = false; this.blueprints = null; this.render(); });
    root.querySelector("[data-weekly]")?.addEventListener("click", () => this.weeklyReport());
    root.querySelectorAll("[data-fsel]").forEach(el => el.onchange = () => { this.pickRows("fsel", el.dataset.fsel, el.checked, this.findSel, this._findPage); this.render(); });
    root.querySelectorAll("[data-sel-only]").forEach(el => el.onclick = () => { const id = el.dataset.selOnly; this.selOnly = { ...this.selOnly, [id]: !this.selOnly?.[id] }; this.pages = {}; this.render(); });
    root.querySelectorAll("[data-lreset]").forEach(el => el.onclick = () => { const st = this.lv[el.dataset.lreset]; if (st) { st.q = ""; st.f = {}; this.persistLv(el.dataset.lreset); } this.pages = {}; this.render(); });
    root.querySelectorAll("[data-copy]").forEach(el => el.onclick = async ev => { ev.stopPropagation(); ev.preventDefault(); try { await navigator.clipboard.writeText(el.dataset.copy); el.classList.add("done"); el.title = this.t("copiedShort"); this.toast(this.t("copiedShort")); setTimeout(() => { el.classList.remove("done"); el.title = this.t("copyId"); }, 1500); } catch (_) { /* no clipboard in this context */ } });
    root.querySelector("[data-fsel-page]")?.addEventListener("click", () => { (this._findPage || []).forEach(key => this.findSel.add(key)); this.render(); });
    root.querySelector("[data-fsel-clear]")?.addEventListener("click", () => { this.findSel.clear(); this.render(); });
    root.querySelector("[data-fsel-unhide]")?.addEventListener("click", () => this.unhideSelectedFindings());
    root.querySelector("[data-fsel-hide]")?.addEventListener("click", () => this.hideSelectedFindings());
    root.querySelectorAll("[data-sel]").forEach(el => el.onchange = () => { this.pickRows("sel", el.dataset.sel, el.checked, this.cleanupSel, this._cleanupVisible); this.render(); });
    root.querySelector("[data-sel-page]")?.addEventListener("click", () => { (this._cleanupVisible || []).forEach(id => this.cleanupSel.add(id)); this.render(); });
    root.querySelector("[data-sel-clear]")?.addEventListener("click", () => { this.cleanupSel.clear(); this.render(); });
    root.querySelector("[data-recorder-choice]")?.addEventListener("change", ev => { this.cleanupRecorder = ev.target.value; this.render(); });
    root.querySelectorAll("[data-rec-own]").forEach(el => el.addEventListener("click", () => { const [id, value] = el.dataset.recOwn.split("|"); this.cleanupRecorderOwn = { ...(this.cleanupRecorderOwn || {}), [id]: value }; this.render(); }));
    root.querySelectorAll("[data-qtype]").forEach(el => el.onclick = () => { this.quarantineType = el.dataset.qtype; this.cleanupKind = el.dataset.qtype === "device" ? "remove_device" : "remove_entity"; this.cleanupSel = new Set(); if (this.lv.cleanup) this.lv.cleanup.f = {}; this.pages = {}; this.render(); });
    const kind = root.querySelector("[data-cleanup-kind]"); if (kind) kind.onchange = () => { this.cleanupKind = kind.value; this.cleanupSel = new Set(); if (this.lv.cleanup) this.lv.cleanup.f = {}; this.pages = {}; this.render(); };
    root.querySelectorAll("[data-repair-task]").forEach(el => el.onclick = () => { this.repairTask = el.dataset.repairTask; this.cleanupKind = this.repairTask; this.cleanupSel = new Set(); this.plan = null; this.render(); });
    root.querySelector("[data-repair-back]")?.addEventListener("click", () => { this.repairTask = null; this.render(); });
    root.querySelector("[data-ack-all]")?.addEventListener("change", e => { this.ack = new Set(e.target.checked ? this.plan.actions.filter(x => x.verdict === "review" && x.executable).map(x => x.object_id) : []); this.render(); });
    root.querySelector("[data-plan-confirm]")?.addEventListener("click", () => this.confirmPlan());
    const word = root.querySelector("[data-confirm-word]");
    if (word) word.oninput = () => {
      this.confirmWord = word.value;
      const run = this.shadowRoot.querySelector("[data-plan-execute]");
      if (run) run.disabled = word.value.trim().toUpperCase() !== this.planWord(this.plan);
    };
    root.querySelector("[data-plan-execute]")?.addEventListener("click", () => this.executePlan());
    root.querySelector("[data-plan-cancel]")?.addEventListener("click", () => this.cancelPlan());
    root.querySelector("[data-undo-all]")?.addEventListener("click", () => { this.undoAsk = "all"; this.render(); });
    root.querySelector("[data-undo-all-yes]")?.addEventListener("click", () => this.undoPlan());
    root.querySelectorAll("[data-undo-one]").forEach(el => el.onclick = () => { this.undoAsk = el.dataset.undoOne; this.render(); });
    root.querySelectorAll("[data-undo-one-yes]").forEach(el => el.onclick = () => this.undoPlan([el.dataset.undoOneYes]));
    root.querySelectorAll("[data-undo-no]").forEach(el => el.onclick = () => { this.undoAsk = null; this.render(); });
    root.querySelectorAll("[data-plan-repeat]").forEach(el => el.addEventListener("click", () => this.repeatPlan([this.plan, ...(this.journal || [])].find(x => x?.plan_id === el.dataset.planRepeat))));
    root.querySelectorAll("[data-plan-repeat-full]").forEach(el => el.addEventListener("click", () => this.repeatPlan([this.plan, ...(this.journal || [])].find(x => x?.plan_id === el.dataset.planRepeatFull), true)));
    root.querySelector("[data-plan-create]")?.addEventListener("click", () => this.createPlan());
    root.querySelectorAll("[data-repl-pick]").forEach(el => el.onclick = () => { this.replNew = el.dataset.replPick; this.render(); });
    root.querySelectorAll("[data-meter-pick]").forEach(el => el.onclick = () => { this.meterNew = el.dataset.meterPick; this.render(); });
    root.querySelectorAll("[data-psel]").forEach(el => el.onchange = () => { this.pickRows("psel", el.dataset.psel, el.checked, this.purgeSel, this._purgePage); this.render(); });
    root.querySelectorAll("[data-psel-all]").forEach(el => { el.indeterminate = el.hasAttribute("data-partial"); el.onchange = () => { (this._purgePage || []).forEach(id => el.checked ? this.purgeSel.add(id) : this.purgeSel.delete(id)); this.render(); }; });
    root.querySelector("[data-purge-page]")?.addEventListener("click", () => { (this._purgePage || []).forEach(id => this.purgeSel.add(id)); this.render(); });
    root.querySelector("[data-purge-clear]")?.addEventListener("click", () => { this.purgeSel.clear(); this.purgeOpen = false; this.render(); });
    root.querySelector("[data-purge-open]")?.addEventListener("click", () => { this.purgeOpen = true; this.purgeWord = ""; this.purgeResult = null; this.render(); });
    root.querySelector("[data-purge-close]")?.addEventListener("click", () => { this.purgeOpen = false; this.render(); });
    root.querySelector("[data-purge-states]")?.addEventListener("change", e => { this.purgeStates = e.target.checked; this.render(); });
    root.querySelector("[data-purge-word]")?.addEventListener("input", e => { this.purgeWord = e.target.value; const b = root.querySelector("[data-purge-run]"); if (b) b.disabled = e.target.value.trim() !== this.t("purgeWord") || this.purgeBusy; });
    root.querySelector("[data-purge-run]")?.addEventListener("click", () => this.purgeRun());
    root.querySelectorAll("[data-meter-mode]").forEach(el => el.onclick = () => { this.meterMode = el.dataset.meterMode; this.render(); });
    root.querySelector("[data-repl-meter]")?.addEventListener("click", () => this.startCleanup("migrate_meter", () => { this.meterOld = this.replOld; this.meterNew = this.replNew; }));
    root.querySelector("[data-meter-refs]")?.addEventListener("click", () => this.startCleanup("replace_references", () => { this.replOld = this.meterOld; this.replNew = this.meterNew; }));
    root.querySelector("[data-costs-load]")?.addEventListener("click", ev => this.loadCosts(ev.currentTarget.hasAttribute("data-refresh")));
    root.querySelectorAll("[data-cost-sort]").forEach(el => el.onclick = () => { this.costSort = el.dataset.costSort; this.render(); });
    root.querySelectorAll("[data-release]").forEach(el => el.onclick = () => { this.releaseConfirm = el.dataset.release; this.releaseMessage = ""; this.render(); });
    root.querySelectorAll("[data-release-yes]").forEach(el => el.onclick = () => this.releaseQuarantine(el.dataset.releaseYes));
    root.querySelectorAll("[data-release-no]").forEach(el => el.onclick = () => { this.releaseConfirm = null; this.render(); });
    root.querySelector("[data-runs-refresh]")?.addEventListener("click", () => this.loadRuns());
    root.querySelector("[data-rel-compare]")?.addEventListener("click", () => { this.relCompare = !this.relCompare; this.reliability = null; this.loadReliability(); });
    root.querySelectorAll("[data-rel-window]").forEach(el => el.onclick = () => { this.relWindow = Number(el.dataset.relWindow); this.reliability = null; this.pages.relentries = 1; this.pages.relunstable = 1; this.loadReliability(); });
    root.querySelectorAll("[data-storm-find]").forEach(el => el.onclick = () => { this.stormFind = el.dataset.stormFind; this.pages.stormfind = 1; this.render(); });
    root.querySelectorAll("[data-storm-entry]").forEach(el => el.onclick = () => { this.stormEntry = el.dataset.stormEntry; this.pages.stormentities = 1; (this.viewTab ||= {}).recload = "entities"; this.render(); });
    root.querySelector("[data-storm-entry-clear]")?.addEventListener("click", () => { this.stormEntry = ""; this.pages.stormentities = 1; this.render(); });
    root.querySelectorAll("[data-storm-mark]").forEach(el => el.onclick = () => { this.excludeSel.add(el.dataset.stormMark); (this.viewTab ||= {}).recload = "entities"; this.render(); });
    root.querySelectorAll("[data-storm-window]").forEach(el => el.onclick = () => { this.stormsWindow = Number(el.dataset.stormWindow); this.storms = null; this.pages.stormfind = 1; this.pages.stormentities = 1; this.loadStorms(); });
    root.querySelector("[data-storm-refresh]")?.addEventListener("click", () => this.loadStorms(true));
    root.querySelector("[data-rel-refresh]")?.addEventListener("click", () => this.loadReliability(true));
    root.querySelector("[data-expo-refresh]")?.addEventListener("click", () => this.loadExposure());
    root.querySelector("[data-policy-refresh]")?.addEventListener("click", () => this.loadPolicies());
    root.querySelectorAll("[data-pol-rule]").forEach(el => el.onclick = () => { this.polRule = el.dataset.polRule; this.pages = {}; this.render(); });
    root.querySelector("[data-policy-hidden]")?.addEventListener("click", () => { this.policyShowHidden = !this.policyShowHidden; this.render(); });
    root.querySelectorAll("[data-policy-toggle]").forEach(el => el.onchange = () => this.changePolicy({ type: "ha_housekeeper/set_policy", rule: el.dataset.policyToggle, enabled: el.checked }));
    root.querySelector("[data-policy-limit-save]")?.addEventListener("click", () => this.setPolicyLimit(root.querySelector("#polLimit")?.value));
    root.querySelector("[data-policy-prefix-add]")?.addEventListener("click", () => this.addPolicyPrefix(root.querySelector("#polDomain")?.value, root.querySelector("#polPrefix")?.value));
    root.querySelectorAll("[data-policy-prefix-remove]").forEach(el => el.onclick = () => this.removePolicyPrefix(el.dataset.policyPrefixRemove));
    root.querySelectorAll("[data-policy-ignore]").forEach(el => el.onclick = () => this.changePolicy({ type: "ha_housekeeper/ignore", finding_key: el.dataset.policyIgnore, ignored: el.dataset.policyValue === "1" }));
    root.querySelector("[data-db-refresh]")?.addEventListener("click", () => this.loadDbHealth(true));
    root.querySelector("[data-bh-refresh]")?.addEventListener("click", () => this.loadBackup());
    root.querySelectorAll("[data-bh-open]").forEach(el => el.onclick = () => { this.bhForm = this.bhForm === el.dataset.bhOpen ? null : el.dataset.bhOpen; this.render(); });
    root.querySelector("[data-bh-cancel]")?.addEventListener("click", () => { this.bhForm = null; this.render(); });
    root.querySelectorAll("[data-bh-save]").forEach(el => el.onclick = () => {
      const kind = el.dataset.bhSave, date = root.querySelector(`[data-bh-date="${kind}"]`)?.value;
      this.loadBackup({ type: "ha_housekeeper/backup_attest", kind, ...(date ? { date } : {}) });
    });
    root.querySelectorAll("[data-fold]").forEach(el => el.onclick = () => { this.folds = { ...this.folds, [el.dataset.fold]: el.getAttribute("aria-expanded") !== "true" }; this.render(); });
    root.querySelectorAll("[data-expo-all]").forEach(el => el.onclick = () => { this.expoAll = { ...this.expoAll, [el.dataset.expoAll]: true }; this.render(); });
    root.querySelectorAll("[data-bh-clear]").forEach(el => el.onclick = () => this.loadBackup({ type: "ha_housekeeper/backup_attest", kind: el.dataset.bhClear, clear: true }));
    root.querySelector("[data-pf-refresh]")?.addEventListener("click", () => this.loadPreflight());
    root.querySelector("[data-pf-save]")?.addEventListener("click", () => this.loadPreflight("save"));
    root.querySelector("[data-pf-clear]")?.addEventListener("click", () => this.loadPreflight("clear"));
    root.querySelector("[data-plan-close]")?.addEventListener("click", () => { this.plan = null; this.render(); });
    root.querySelectorAll("[data-plan-open]").forEach(el => el.onclick = () => this.openPlan(el.dataset.planOpen));
    root.querySelectorAll("[data-merge-sel]").forEach(el => el.onchange = () => { this.mergeSel = new Set(this.mergeSel || []); el.checked ? this.mergeSel.add(el.dataset.mergeSel) : this.mergeSel.delete(el.dataset.mergeSel); this.render(); });
    root.querySelector("[data-merge]")?.addEventListener("click", () => this.mergePlans());
    root.querySelectorAll("[data-plan-delete]").forEach(el => el.onclick = () => { const id = el.dataset.planDelete, plan = (this.journal || []).find(p => p.plan_id === id) || this.plan; this.confirmAsk(this.t("confirmPlan", { date: this.formatDate(plan?.created_at) }), () => this.deletePlan(id)); });
    root.querySelector("[data-opts-save]")?.addEventListener("click", () => this.saveOptions());
    root.querySelector("[data-nr-save]")?.addEventListener("click", () => this.saveNodeRed(false));
    root.querySelector("[data-nr-disconnect]")?.addEventListener("click", () => this.confirmAsk(this.t("nrDisconnect") + "?", () => this.saveNodeRed(true)));
    // Saving stays off until a threshold differs from the saved one; typing must not rebuild the page.
    const optInputs = [...root.querySelectorAll("[data-opt]")];
    optInputs.forEach(el => el.oninput = () => {
      const save = root.querySelector("[data-opts-save]");
      if (save) save.disabled = !optInputs.some(input => input.value !== input.dataset.saved);
    });
    root.querySelectorAll("[data-set-tab]").forEach(el => {
      el.onclick = () => { this.settingsTab = el.dataset.setTab; this.optionsMessage = ""; this.nrMessage = ""; this.render(); };
      el.onkeydown = ev => {
        const ids = [...root.querySelectorAll("[data-set-tab]")].map(b => b.dataset.setTab), at = ids.indexOf(el.dataset.setTab);
        const next = { ArrowRight: ids[(at + 1) % ids.length], ArrowLeft: ids[(at - 1 + ids.length) % ids.length], Home: ids[0], End: ids[ids.length - 1] }[ev.key];
        if (!next) return;
        ev.preventDefault();
        this.settingsTab = next;
        this.render();
        this.shadowRoot.querySelector(`[data-set-tab="${next}"]`)?.focus();
      };
    });
    root.querySelector("[data-pref-reset]")?.addEventListener("click", () => { this.prefs = { ...DEFAULT_PREFS }; this.pageSize = DEFAULT_PREFS.pageSize; this.pages = {}; this.savePrefs(); this.render(); });
    root.querySelector("[data-copy-info]")?.addEventListener("click", async () => {
      try { await globalThis.navigator?.clipboard?.writeText(this.infoText()); this.copied = true; } catch (_) { this.copied = false; }
      this.render();
      setTimeout(() => { this.copied = false; this.render(); }, 1500);
    });
    root.querySelectorAll("[data-lq]").forEach(input => input.oninput = () => {
      this.lv[input.dataset.lq].q = input.value; this.pages = {};
      this.scheduleRender();
    });
    root.querySelectorAll("[data-lview]").forEach(el => el.onchange = () => this.applyView(el.dataset.lview, el.value));
    root.querySelectorAll("[data-lview-save]").forEach(el => el.onclick = () => this.saveView(el.dataset.lviewSave));
    root.querySelectorAll("[data-lview-form]").forEach(form => form.onsubmit = ev => {
      ev.preventDefault();
      this.commitView(form.dataset.lviewForm, form.querySelector("[data-lview-name]")?.value);
    });
    root.querySelectorAll("[data-lview-name]").forEach(el => {
      el.oninput = () => { this.viewDraft = el.value; };
      el.onkeydown = ev => { if (ev.key === "Escape") { ev.preventDefault(); this.cancelView(el.dataset.lviewName); } };
    });
    root.querySelectorAll("[data-lview-cancel]").forEach(el => el.onclick = () => this.cancelView(el.dataset.lviewCancel));
    root.querySelectorAll("[data-lview-delete]").forEach(el => el.onclick = () => { const id = el.dataset.lviewDelete; this.confirmAsk(this.t("confirmView", { name: this.lv[id]?.view || "" }), () => this.deleteView(id)); });
    root.querySelectorAll("[data-lf]").forEach(el => el.onchange = () => { const [id, name] = el.dataset.lf.split("|"); this.lv[id].f[name] = el.value; this.persistLv(id); this.pages = {}; this.render(); });
    root.querySelectorAll("[data-ls]").forEach(el => el.onchange = () => { const st = this.lv[el.dataset.ls]; st.sort = el.value; st.dir = this.lvDirs[el.dataset.ls][el.value] || "asc"; this.persistLv(el.dataset.ls); this.pages = {}; this.render(); });
    root.querySelectorAll("[data-lsort]").forEach(el => el.onclick = () => {
      const [id, key, dir] = el.dataset.lsort.split("|"), st = this.lv[id];
      if (st.sort === key) st.dir = st.dir === "desc" ? "asc" : "desc"; else { st.sort = key; st.dir = dir; }
      this.persistLv(id); this.pages = {}; this.render();
    });
    root.querySelectorAll("[data-dense]").forEach(el => el.onclick = () => { this.dense = !this.dense; try { globalThis.localStorage?.setItem("ha_housekeeper.dense", this.dense ? "1" : "0"); } catch (_) { /* kept until the page closes */ } this.render(); });
    root.querySelectorAll("[data-ld]").forEach(el => el.onclick = () => { const st = this.lv[el.dataset.ld]; st.dir = st.dir === "desc" ? "asc" : "desc"; this.persistLv(el.dataset.ld); this.pages = {}; this.render(); });
    root.querySelectorAll("[data-lpage]").forEach(el => el.onclick = () => { const [id, n] = el.dataset.lpage.split("|"); this.pages[id] = Number(n); this.render(); });
    root.querySelectorAll("[data-pagesize]").forEach(el => el.onchange = () => { this.pageSize = Number(el.value); this.pages = {}; this.render(); });
  }
}
