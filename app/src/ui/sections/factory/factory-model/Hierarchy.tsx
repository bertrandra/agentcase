import { togglePhaseFeature } from '@/controllers/factory';
import { setVision } from '@/controllers/factoryActions';
import { PHASES } from '@/domain/catalog';
import type { PhaseFeatures, Vision } from '@/domain/factory/types';
import { useDoc } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { nameOptions, useList, useRecs } from '../data';
import { RecordTable, type Rec } from '../RecordTable';

const hint = (t: string) => <small className="ac-muted">{t}</small>;
const label = (r: Rec) => String(r.name ?? r.id);

/** Vision → Portfolio → Epic → Feature (each realises the one above; deleting orphans its direct children, never cascades). */
export function Hierarchy() {
  const vision = useDoc((d) => ((d as Record<string, unknown>).VISION as Vision | undefined)?.statement ?? '');
  const portfolios = useRecs('PORTFOLIO_ITEMS'), epics = useRecs('EPICS'), features = useRecs('FEATURES');
  const phases = useList<PhaseFeatures>('fmPhaseFeatures');
  return (
    <>
      <Panel title="🎯 Vision">
        <textarea aria-label="Vision" rows={2} style={{ width: '100%' }} placeholder="The transformation's north star — one line." value={vision} onChange={(e) => setVision(e.target.value)} />
      </Panel>
      <Panel title="📁 Portfolio">
        <RecordTable coll="PORTFOLIO_ITEMS" rows={portfolios} noun="portfolio items" empty="No portfolio items yet." addLabel="+ Add portfolio item" label={label} cols={[{ kind: 'text', header: 'Name', field: 'name' }]} />
      </Panel>
      <Panel title="🧩 Epics" aside={hint('realize the Vision, via a Portfolio')}>
        <RecordTable coll="EPICS" rows={epics} noun="epics" empty="No epics yet." addLabel="+ Add epic" label={label}
          cols={[{ kind: 'text', header: 'Name', field: 'name' }, { kind: 'link', header: 'Portfolio', field: 'portfolioId', options: nameOptions(portfolios) }]} />
      </Panel>
      <Panel title="⭐ Features" aside={hint('implement an Epic; link to the SDLC phases this work runs through')}>
        <RecordTable coll="FEATURES" rows={features} noun="features" empty="No features yet." addLabel="+ Add feature" label={label}
          cols={[{ kind: 'text', header: 'Name', field: 'name' }, { kind: 'link', header: 'Epic', field: 'epicId', options: nameOptions(epics) },
            { kind: 'custom', header: 'SDLC phases', render: (f) => (
              <span>{PHASES.map((p) => (
                <label key={p.id} className="ac-check" style={{ display: 'inline-flex', gap: 2, marginRight: 6, fontSize: 'var(--ac-font-size-xs-plus)' }}>
                  <input type="checkbox" aria-label={`Link ${label(f)} to phase ${p.id}`} checked={(phases.find((x) => x.id === p.id)?.featureIds ?? []).includes(f.id)} onChange={(e) => togglePhaseFeature(f.id, p.id, e.target.checked)} />{p.id}
                </label>))}</span>) }]} />
      </Panel>
    </>
  );
}
