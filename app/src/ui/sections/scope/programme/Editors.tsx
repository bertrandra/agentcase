import { setInput } from '@/controllers/inputs';
import { activityType, costProfileKey, costProfileLabel, COST_PROFILES, LINE_PROFILES, type ActivityEnabled } from '@/domain/programme';
import { useCtx, useDoc } from '@/store/hooks';
import { DraftText } from '@/ui/widgets/DraftText';

/**
 * The editors of a programme activity shared by the 📋 Programme table and the Process parameter panel (docs/SPEC_BPMN.md § 19.7, § 19.11): two
 * views of one activity, one key and one undoable command (`input.set`) per value: the opt-in switch, the type of its cost line, its description.
 */
export function EnabledBox({ name, e }: { name: string; e: ActivityEnabled }) {
  return (
    <label className="ac-check" title={e.note}>
      <input type="checkbox" checked={e.on} disabled={!e.key} aria-label={`${name} enabled`}
        onChange={(ev) => { if (e.key) setInput(e.key, ev.target.checked ? 'on' : ''); }} />
      <span className="ac-sr">{e.note}</span>
    </label>
  );
}

const TEXT = new Map(COST_PROFILES.map((p) => [p.id, p.text]));
/** The type of an activity's cost line (one-off, spread, adoption, recurring); read-only when its cost is not a programme line. */
export function TypeSelect({ kind, name }: { kind: string; name: string }) {
  const t = activityType(useCtx(), kind), line = t.line;
  if (!t.editable || !line) return <span title={TEXT.get(t.profile)}>{costProfileLabel(t.profile)}</span>;
  return (
    <select aria-label={`Type of ${name}`} value={t.profile} title={TEXT.get(t.profile)} onChange={(e) => setInput(costProfileKey(line), e.target.value)}>
      {LINE_PROFILES.map((p) => <option key={p} value={p}>{costProfileLabel(p)}</option>)}
    </select>
  );
}

/** The activity's description: its own text, or the catalogue's when left blank (Reset). */
export function DescriptionField({ name, value, keyId }: { name: string; value: string; keyId: string }) {
  const own = useDoc((d) => !!(d.dom.values[keyId] ?? '').trim());
  return (
    <div className="ac-form-row">
      <DraftText label={`Description of ${name}`} value={value} onCommit={(v) => setInput(keyId, v.trim())} />
      {own && <button type="button" onClick={() => setInput(keyId, '')}>Reset to the catalogue text</button>}
    </div>
  );
}
