// Mix the grouped methods into the panel element and register it.
for (const mixin of [ThemeMixin, StylesMixin, ListsMixin, OverviewMixin, FindingsMixin, ChangesMixin, SettingsMixin, NodeRedSettingsMixin, CleanupMixin, InventoryMixin, GraphMixin, UnusedMixin, DiagnosisMixin, PropertiesMixin, MaintenanceMixin, BackupMixin, ReliabilityMixin, RunsMixin, StormsMixin, DbHealthMixin, ExposureMixin, PoliciesMixin, SearchMixin, LayoutMixin, FlowMixin, CorrelationMixin, LifecycleMixin, WindowMixin, BlueprintsMixin, MarksMixin, CausesMixin, GoalsMixin, ExchangeMixin, DiagnosticsMixin, TraceDiagMixin, DryRunMixin, RefactorMixin, SafetyMixin, BatteryCareMixin, BatteryTypeMixin, BatteryKindMixin, BatteryTableMixin, PolicyRowMixin, HistoryTabMixin, ConfirmMixin, CriteriaHistoryMixin, BackupCleanupMixin, AreaAssignMixin, DetailEditMixin, FindingStatusMixin, DetailActionsMixin, CounterMixin, PickerMixin, StaleMixin, EntityRecorderMixin, EntityTrimMixin, ExcludeMixin, PlanWizardMixin, ExportMixin, NotesMixin, KnownMixin, ScanPointsMixin, SparklineMixin]) {
  for (const name of Object.getOwnPropertyNames(mixin.prototype)) {
    if (name !== "constructor") Object.defineProperty(HAHousekeeperPanel.prototype, name, Object.getOwnPropertyDescriptor(mixin.prototype, name));
  }
}

if (!customElements.get("ha-housekeeper-panel")) customElements.define("ha-housekeeper-panel", HAHousekeeperPanel);
