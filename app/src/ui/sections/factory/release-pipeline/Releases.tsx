import { Fragment, useState } from 'react';
import { addRecord, removeRecord, setField } from '@/controllers/factory';
import { addReleaseItem, removeReleaseItem } from '@/controllers/factoryActions';
import type { ReleaseItem, ReleaseItemType } from '@/domain/factory/types';
import { ConfirmButton } from '@/ui/widgets/CommitField';
import { LazySelect } from '@/ui/widgets/LazySelect';
import { Badge, Panel } from '@/ui/widgets/cards';
import { nameOptions, useList, useRecs } from '../data';

const TYPES: { value: ReleaseItemType; label: string }[] = [{ value: 'Story', label: 'Story' }, { value: 'Feature', label: 'Feature' }, { value: 'Fix', label: 'Fix' }, { value: 'TechnicalChange', label: 'Technical Change' }];

/** The editor adding one item to a release: a Story / Feature picked from the model, or a Fix / Technical Change described in words. */
function NewItem({ releaseId }: { releaseId: string }) {
  const stories = useRecs('STORIES'), features = useRecs('FEATURES');
  const [type, setType] = useState<ReleaseItemType>('Story'), [pick, setPick] = useState(''), [text, setText] = useState('');
  const linked = type === 'Story' || type === 'Feature';
  const add = () => {
    if (linked ? !pick : !text.trim()) return;
    addReleaseItem(releaseId, type, linked ? pick : null, linked ? null : text.trim());
    setPick(''); setText('');
  };
  return (
    <div className="ac-form-row">
      <select aria-label="New item type" value={type} onChange={(e) => { setType(e.target.value as ReleaseItemType); setPick(''); }}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
      {linked
        ? <LazySelect ariaLabel="Item to add" emptyLabel={`(pick a ${type.toLowerCase()})`} value={pick} onChange={setPick} options={nameOptions(type === 'Story' ? stories : features)} />
        : <input type="text" aria-label="Item description" placeholder={`Describe the ${type.toLowerCase()}…`} value={text} onChange={(e) => setText(e.target.value)} />}
      <button type="button" onClick={add}>+ Add item</button>
    </div>
  );
}

/**
 * Releases — polymorphic: a release ships any mix of Stories, Features, Fixes and Technical Changes. Deleting a release deletes its join rows,
 * orphans its candidates.
 */
export function Releases() {
  const releases = useRecs('RELEASES'), items = useList<ReleaseItem>('RELEASE_ITEMS'), stories = useRecs('STORIES'), features = useRecs('FEATURES');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const nameOf = (it: ReleaseItem) => String(it.itemType === 'Story' ? stories.find((s) => s.id === it.itemId)?.name ?? '(deleted story)' : it.itemType === 'Feature' ? features.find((f) => f.id === it.itemId)?.name ?? '(deleted feature)' : it.label ?? '');
  return (
    <Panel title="📦 Releases" aside={<small className="ac-muted">polymorphic — includes Stories, Features, Fixes, Technical Changes</small>}>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr><th>Name</th><th>Items</th><th scope="col"><span className="ac-sr">Actions</span></th></tr></thead>
          <tbody>
            {releases.length ? releases.map((r) => {
              const mine = items.filter((x) => x.releaseId === r.id), name = String(r.name ?? r.id);
              return (
                <Fragment key={r.id}>
                  <tr>
                    <td><input type="text" aria-label={`Name of ${name}`} style={{ width: '100%' }} value={name} onChange={(e) => setField('RELEASES', r.id, 'name', e.target.value)} /></td>
                    <td><button type="button" aria-expanded={!!open[r.id]} onClick={() => setOpen({ ...open, [r.id]: !open[r.id] })}>{open[r.id] ? '▼' : '▶'} {mine.length} item(s)</button></td>
                    <td><ConfirmButton label="🗑" onConfirm={() => removeRecord('RELEASES', r.id)} /></td>
                  </tr>
                  {open[r.id] && (
                    <tr><td colSpan={3}>
                      {mine.length ? mine.map((it) => (
                        <div key={it.id} className="ac-form-row"><Badge tone="blue">{it.itemType}</Badge><span className="ac-grow">{nameOf(it)}</span>
                          <button type="button" aria-label={`Remove ${nameOf(it)}`} onClick={() => removeReleaseItem(it.id)}>✕</button></div>
                      )) : <p className="ac-muted">No items yet.</p>}
                      <NewItem releaseId={r.id} />
                    </td></tr>
                  )}
                </Fragment>
              );
            }) : <tr><td colSpan={3} className="ac-muted">No releases yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => addRecord('RELEASES')}>+ Add release</button>
    </Panel>
  );
}
