import { useState } from 'react';
import { setPersonaSectionOrder } from '@/controllers/navLayout';
import { addSeqStep, replaceSeq, setSeqEnabled } from '@/controllers/navSequence';
import { generateSeq, membershipDiff, syncOrderToSeq } from '@/domain/nav/sequence';
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';
import { syncPersonaMenu } from './assign';
import { SeqStep } from './SeqStep';

/**
 * The guided-sequence editor (legacy "Guided sequence (wizard)"): enable, steps with a label and sections, generate from groups, sync order / menu.
 * It works on the persona's menu structure: the section picker is grouped by that structure's groups and "Generate from groups" follows them.
 * `persona` fixes the persona (the Section assignment tab owns the picker); without it the editor shows its own picker.
 */
export function SeqEditor({ personas, lists, persona }: { personas: Persona[]; lists: Record<string, string[]>; persona?: string }) {
  const { order, view, structureOfPersona } = useNavModel(), editable = personasByOrder(personas).filter((p) => !p.protected);
  const [sel, setSel] = useState(''), [status, setStatus] = useState(''), [ask, setAsk] = useState<'generate' | 'menu' | null>(null);
  const p = editable.find((x) => x.id === (persona ?? sel)) ?? (persona ? undefined : editable[0]), seq = p?.seq ?? { on: false, steps: [] };
  const { sections, groups, label: structureLabel } = view(structureOfPersona(p?.id ?? '')), name = (id: string) => sections.find((s) => s.id === id)?.label ?? id;
  if (!p) return <p className="ac-muted">{persona ? 'This persona has no guided sequence of its own (protected).' : 'No assignable persona.'}</p>;
  const diff = membershipDiff(seq, lists[p.id] ?? [], sections), say = (t: string) => { setAsk(null); setStatus(t); };
  const generate = () => {
    const next = generateSeq(p.id, sections, groups, lists, order);
    if (!next) return say('No reachable sections to build a sequence from.');
    replaceSeq(p.id, next); say(`Generated ${next.steps.length} step(s) (${next.steps.reduce((n, s) => n + s.sections.length, 0)} sections) from the groups — sequence enabled.`);
  };
  const syncOrder = () => {
    const r = syncOrderToSeq(p.id, seq, sections, order);
    setPersonaSectionOrder(`Sync the section order of ${p.id} to its sequence`, p.id, r.entries); say(`Section order synced for ${p.label} — ${r.ids} sections reordered across ${r.groups} group(s). Other personas unaffected.`);
  };
  return (
    <>
      {!persona && <label className="ac-field"><span className="ac-field-l">Persona</span>
        <select value={p.id} onChange={(e) => { setSel(e.target.value); setAsk(null); setStatus(''); }}>{editable.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>}
      <p className="ac-muted">Menu structure: <strong>{structureLabel}</strong> — the section picker and “Generate from groups” follow its groups.</p>
      <label><input type="checkbox" checked={seq.on} onChange={(e) => setSeqEnabled(p.id, e.target.checked)} /> Sequence enabled for this persona</label>
      <div className="ac-form-row">
        <button type="button" className="ac-btn" onClick={() => addSeqStep(p.id)}>+ Add step</button>
        {ask === 'generate'
          ? <><span>Replace the current {seq.steps.length} step(s)?</span><button type="button" className="ac-btn" onClick={generate}>✓ Confirm</button><button type="button" className="ac-btn" onClick={() => setAsk(null)}>Cancel</button></>
          : <button type="button" className="ac-btn" onClick={() => (seq.steps.length ? setAsk('generate') : generate())}>⚙️ Generate from groups</button>}
        <button type="button" className="ac-btn" disabled={!seq.steps.length} onClick={syncOrder}>🧭 Sync section order to sequence</button>
        <button type="button" className="ac-btn" disabled={!seq.steps.length} onClick={() => setAsk('menu')}>🗂️ Sync menu to sequence</button>
        <span role="status" className="ac-ok-text ac-small">{status}</span>
      </div>
      {ask === 'menu' && (
        <div role="alertdialog" aria-label="Sync menu to sequence" className="ac-callout">
          <strong>This will change the menu of {p.label} — review before confirming.</strong>
          <p>+ Add ({diff.toAdd.length}): {diff.toAdd.map(name).join(', ') || 'None'}</p>
          <p>− Remove ({diff.toRemove.length}): {diff.toRemove.map(name).join(', ') || 'None'}</p>
          <button type="button" className="ac-btn" onClick={() => { syncPersonaMenu(p.id, diff.finalList); say(`Menu membership synced — +${diff.toAdd.length} added, −${diff.toRemove.length} removed. ${diff.finalList.length} sections total.`); }}>✓ Confirm</button>
          <button type="button" className="ac-btn" onClick={() => setAsk(null)}>Cancel</button>
        </div>
      )}
      {seq.steps.map((st, si) => <SeqStep key={si} persona={p.id} si={si} count={seq.steps.length} step={st} sections={sections} groups={groups} />)}
    </>
  );
}
