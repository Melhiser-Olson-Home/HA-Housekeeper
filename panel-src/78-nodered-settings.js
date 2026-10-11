// NodeRedSettingsMixin: the Node-RED connection on the settings page (the integration's configuration page).
// Password and token never come back from the server; the form only knows whether one is saved.
class NodeRedSettingsMixin {
  noderedPill() {
    const nr = this.data?.meta?.nodered;
    if (!nr?.configured) return [this.t("nrNotSet"), "mute"];
    if (nr.error) return [this.t(nr.cached ? "nrCachedPill" : "nrErrorPill"), "warn"];
    return [this.t("nrConnected"), "ok"];
  }

  async loadNodeRed() {
    if (this._nrLoading) return;
    this._nrLoading = true;
    try { this.nrConfig = await this._hass.callWS({ type: "ha_housekeeper/nodered_get" }); } catch (err) { this.failed(err); this.nrConfig = { url: "" }; }
    this._nrLoading = false;
    this.render();
  }

  noderedCard() {
    if (!this.nrConfig) { this.loadNodeRed(); return this.skeleton("loading"); }
    const c = this.nrConfig, nr = this.data?.meta?.nodered || {}, esc = v => this.esc(v ?? "");
    const fact = (k, v) => `<div class="fact"><span>${k}</span><b>${v}</b></div>`;
    const state = !nr.configured ? this.t("nrNotSet") : nr.error ? `${this.t(`nodered_${nr.error}`)}${nr.cached ? ` ${this.t("noderedCached", { date: this.formatDate(nr.read_at) })}` : ""}` : this.t("nrConnected");
    const facts = c.url ? `<div class="facts">${fact(this.t("nrState"), esc(state))}${nr.read_at ? fact(this.t("nrRead"), this.formatDate(nr.read_at)) : ""}${nr.flow_count !== undefined ? fact(this.t("nrFlows"), this.formatNumber(nr.flow_count)) : ""}</div>` : "";
    const field = (key, label, hint, type, value, placeholder) => `<div class="optcard"><label for="nr-${key}"><strong>${label}</strong></label><small>${hint}</small><input id="nr-${key}" class="nrinput" type="${type}" data-nr="${key}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false"></div>`;
    const kept = this.t("nrKept");
    const fields = [
      field("url", this.t("nrUrl"), this.t("nrUrlHint"), "url", c.url, "http://192.168.1.10:1880"),
      field("username", this.t("nrUser"), this.t("nrUserHint"), "text", c.username, ""),
      field("password", this.t("nrPassword"), this.t("nrPasswordHint"), "password", "", c.has_password ? kept : ""),
      field("token", this.t("nrToken"), this.t("nrTokenHint"), "password", "", c.has_token ? kept : ""),
    ].join("");
    const steps = ["nrStepStandalone", "nrStepAddon", "nrStepSave"].map(k => `<li>${this.t(k)}</li>`).join("");
    return `<section class="panel"><div class="panelhead"><div><h2>Node-RED</h2><p>${this.t("nrIntro")}</p></div></div>${facts}
      <div class="nrhelp"><strong>${this.t("nrHowTitle")}</strong><ol>${steps}</ol></div>
      <div class="optgrid">${fields}</div>
      <div class="toolbar savebar"><span class="date" role="status">${esc(this.nrMessage)}</span><span class="toolgap"></span>${c.url ? `<button class="btn quiet" data-nr-disconnect>${this.t("nrDisconnect")}</button>` : ""}<button class="btn primary" data-nr-save>${this.t("nrSave")}</button></div></section>`;
  }

  async saveNodeRed(disconnect = false) {
    const msg = { type: "ha_housekeeper/nodered_set", disconnect };
    if (!disconnect) {
      for (const input of this.shadowRoot.querySelectorAll("[data-nr]")) {
        const key = input.dataset.nr, value = input.value;
        if ((key === "password" || key === "token") && value === "") continue; // empty keeps the saved one
        msg[key] = value;
      }
    }
    this.nrMessage = this.t(disconnect ? "nrDisconnecting" : "nrTesting");
    this.render();
    try {
      const result = await this._hass.callWS(msg);
      this.nrConfig = result;
      this.nrMessage = disconnect ? this.t("nrDisconnected") : this.t("nrSaved", { n: result.tabs });
      this.data = null; // the integration reloads and scans with the new connection
      this.render();
      setTimeout(() => { this.busy = false; this.load(false); }, 4000);
    } catch (err) {
      this.nrMessage = err?.code?.startsWith?.("nodered_") ? this.t(err.code) : err?.code === "busy" ? this.t("optionsBusy") : err?.message || String(err);
      this.render();
    }
  }
}
