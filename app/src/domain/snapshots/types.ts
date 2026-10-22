/** @calc-zone exports */
/** One entry of the named snapshot library (`namedSnapshots` of the document); same shape as the legacy SNAPSHOTS entries. */
export interface NamedSnapshot {
  id: string;
  name: string;
  savedAt: string;
  isBaseline: boolean;
  /** the golden case is protected: it cannot be deleted */
  protected?: boolean;
  isGolden?: boolean;
  isAmeRef?: boolean;
  wasGolden?: boolean;
  /** the case as a snapshot object (the library itself is left out, so captures never nest) */
  state: Record<string, unknown>;
  /**
   * Multi-product captures only: the whole portfolio (`agentcase.portfolio.v1` without view state and without the library). `state` is then the case of the
   * product that was active, which keeps the compare view and older readers working. Absent for a plain single case.
   */
  portfolio?: Record<string, unknown>;
}
