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
}
