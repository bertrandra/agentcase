import { useState } from 'react';
import { setPersonaMenuStructure } from '@/controllers/menuStructures';
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { useNavModel } from '@/ui/zones/navModel';
import { Assignment } from './Assignment';
import { SeqEditor } from './SeqEditor';

const SUBS = [{ id: 'sections', label: '🧩 Section assignment' }, { id: 'wizard', label: '🧭 Guided sequence (wizard)' }];

/**
 * The legacy "🧩 Section assignment" tab: one persona picker on top, then two pill sub-tabs — its sections (Assigned / Available) and its guided
 * sequence. The persona's menu structure is picked here too: its sidebar, Welcome cards and guided-sequence picker follow that structure.
 */
export function AssignTab({ personas, lists }: { personas: Persona[]; lists: Record<string, string[]> }) {
  const m = useNavModel(), [pid, setPid] = useState(''), [sub, setSub] = useState('sections'), base = useStripBase();
  const p = personas.find((x) => x.id === pid);
  return (
    <>
      <div className="ac-form-row">
        <label className="ac-field"><span className="ac-field-l">Persona</span>
          <select value={pid} onChange={(e) => setPid(e.target.value)}><option value="">— Pick a persona —</option>{personasByOrder(personas).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        {p && (
          <label className="ac-field"><span className="ac-field-l">Menu structure of {p.label}</span>
            <select value={m.structureOfPersona(p.id)} onChange={(e) => setPersonaMenuStructure(p.id, e.target.value)}>{m.structures.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        )}
      </div>
      <TabStrip className="ac-pills" base={base} label="Section assignment views" value={sub} onChange={setSub} tabs={SUBS} />
      <TabPanel base={base} current={sub}>
        {!p ? <p className="ac-muted"><em>Pick a persona above to manage its {sub === 'sections' ? 'sections' : 'guided sequence'}.</em></p>
          : sub === 'sections' ? <Assignment persona={p} lists={lists} /> : <SeqEditor personas={personas} lists={lists} persona={p.id} />}
      </TabPanel>
    </>
  );
}
