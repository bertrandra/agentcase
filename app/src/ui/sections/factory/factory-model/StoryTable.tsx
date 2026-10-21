import { Fragment, useState } from 'react';
import { addRecord, removeRecord, setField, toggleStoryArtefact } from '@/controllers/factory';
import { REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import type { ArtefactTag } from '@/domain/factory/types';
import { ConfirmButton } from '@/ui/widgets/CommitField';
import { LazySelect } from '@/ui/widgets/LazySelect';
import { Panel } from '@/ui/widgets/cards';
import { nameOptions, useList, useRecs } from '../data';

/** Stories implement a Feature and link to existing artefacts (Tasks); the checklist of the 53 + 370 artefacts opens per story. */
export function StoryTable() {
  const stories = useRecs('STORIES'), features = useRecs('FEATURES');
  const sdlc = useList<ArtefactTag>('fmArtefactTags'), reg = useList<ArtefactTag>('fmRegArtefactTags');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const storyOf = (list: ArtefactTag[], id: string) => list.find((t) => t.id === id)?.storyId ?? null;
  const row = (id: string, name: string, isReg: boolean, sid: string) => {
    const other = storyOf(isReg ? reg : sdlc, id);
    return (
      <label key={id} className="ac-check" style={{ display: 'flex', gap: 6, fontSize: 11 }}>
        <input type="checkbox" aria-label={`${id} in story ${sid}`} checked={other === sid} onChange={(e) => toggleStoryArtefact(sid, id, isReg, e.target.checked)} />
        {isReg ? '⚖️' : '📄'} {id} · {name}{other && other !== sid && <span style={{ color: 'var(--ac-amber)' }}> (linked to another story)</span>}
      </label>
    );
  };
  return (
    <Panel title="📗 Stories" aside={<small className="ac-muted">implement a Feature; link to existing artefacts (Tasks)</small>}>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr><th>Name</th><th>Feature</th><th>Linked artefacts</th><th scope="col"><span className="ac-sr">Actions</span></th></tr></thead>
          <tbody>
            {stories.length ? stories.map((s) => {
              const linked = sdlc.filter((t) => t.storyId === s.id).length + reg.filter((t) => t.storyId === s.id).length, name = String(s.name ?? s.id);
              return (
                <Fragment key={s.id}>
                  <tr>
                    <td><input type="text" aria-label={`Name of ${name}`} style={{ width: '100%' }} value={name} onChange={(e) => setField('STORIES', s.id, 'name', e.target.value)} /></td>
                    <td><LazySelect ariaLabel={`Feature of ${name}`} value={String(s.featureId ?? '')} options={nameOptions(features)} onChange={(v) => setField('STORIES', s.id, 'featureId', v || null)} /></td>
                    <td><button type="button" aria-expanded={!!open[s.id]} onClick={() => setOpen({ ...open, [s.id]: !open[s.id] })}>{open[s.id] ? '▼' : '▶'} {linked} linked</button></td>
                    <td><ConfirmButton label="🗑" onConfirm={() => removeRecord('STORIES', s.id)} /></td>
                  </tr>
                  {open[s.id] && (
                    <tr><td colSpan={4}><div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      <strong className="ac-muted">SDLC artefacts</strong>{SDLC_ARTEFACTS.map((a) => row(a.id, a.name, false, s.id))}
                      <strong className="ac-muted">Regulatory artefacts</strong>{REG_ARTEFACTS.map((a) => row(a.id, a.name, true, s.id))}
                    </div></td></tr>
                  )}
                </Fragment>
              );
            }) : <tr><td colSpan={4} className="ac-muted">No stories yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => addRecord('STORIES')}>+ Add story</button>
    </Panel>
  );
}
