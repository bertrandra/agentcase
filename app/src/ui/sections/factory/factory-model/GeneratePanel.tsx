import { useState } from 'react';
import { generateFactoryData, resetGeneratorParams, setGeneratorParam } from '@/controllers/factoryActions';
import { fgPreflight } from '@/domain/factory/preflight';
import type { FgProvenance } from '@/domain/factory/types';
import { useCtx } from '@/store/hooks';
import { NumField } from '@/ui/widgets/CommitField';
import { Callout, Panel } from '@/ui/widgets/cards';
import { useKpiData, useRecs } from '../data';

const n = (v: number) => v.toLocaleString('en-US');

/** "🧬 Generate factory data": what the current case would produce, the three tunable parameters, and the guarded generate action. */
export function GeneratePanel() {
  const c = useCtx(), { params: p } = useKpiData(), pf = fgPreflight(c, p), [pending, setPending] = useState(false);
  const portfolios = useRecs('PORTFOLIO_ITEMS').length, epics = useRecs('EPICS').length, existing = {
    stories: useRecs('STORIES').length, releases: useRecs('RELEASES').length, commits: useRecs('COMMITS').length, deployments: useRecs('DEPLOYMENTS').length,
    other: useRecs('BUILDS').length + useRecs('QUALITY_GATES').length + useRecs('MONITORING_EVENTS').length,
  };
  const pv = (c.s as unknown as { FG_PROVENANCE?: FgProvenance | null }).FG_PROVENANCE;
  const total = existing.stories + existing.releases + existing.commits + existing.deployments + existing.other;
  const go = () => { setPending(false); generateFactoryData(); };
  if (!pf.ok) return <Callout kind="warn"><strong>🧬 Generate factory data</strong> — No artefact in scope — select a scope in 🎯 Scope before generating.</Callout>;
  const over = pf.est > pf.cap;
  return (
    <Panel title="🧬 Generate factory data">
      <p>From the current case · <strong>weekly</strong> · {pf.from} → {pf.to} ({pf.weeks} weeks)<br />
        {pf.phases} phase(s) · {pf.arts} artefact(s) in scope<br />
        → {portfolios} portfolios · {epics} epics · {pf.phases} features · {pf.stories} stories · {pf.arts} tasks · ~{pf.releases} releases<br />
        Estimated records: <strong data-ink={over ? 'amber' : 'blue'}>{n(pf.est)}</strong> / {n(pf.cap)} cap{over && ' — will be down-sampled (commits first, time span never truncated)'}</p>
      <div className="ac-form-row">
        <NumField label="Density" value={p.density} min={0.25} max={2} step={0.25} width={64} onCommit={(v) => setGeneratorParam('density', v)} />
        <NumField label="Seed" value={p.seed} step={1} width={96} onCommit={(v) => setGeneratorParam('seed', v)} />
        <NumField label="Release every (weeks)" value={p.releaseEveryWeeks} min={1} step={1} width={56} onCommit={(v) => setGeneratorParam('releaseEveryWeeks', v)} />
        <button type="button" onClick={resetGeneratorParams}>Reset parameters</button>
      </div>
      {pending
        ? <Callout kind="warn"><strong>⚠ This will clear the existing factory data</strong><br />{existing.stories} stories · {existing.releases} releases · {n(existing.commits)} commits · {existing.deployments} deployments will be deleted and replaced. Manual edits cannot be recovered.<br />
            <button type="button" onClick={() => setPending(false)}>Cancel</button> <button type="button" data-tone="danger" onClick={go}>Clear and generate</button></Callout>
        : <button type="button" data-tone="primary" onClick={() => (total > 0 ? setPending(true) : go())}>🧬 Generate data</button>}
      {pv && (
        <p className="ac-muted">Generated {String(pv.at).slice(0, 10)} · seed {pv.seed} · weekly · {pv.weeks} weeks from {pv.from} · {pv.phases} phases · ramp {pv.ramps.join('/')}% · eff. automation {pv.eff}% · ceiling {pv.ceiling}% · {n(pv.records)} records in {pv.ms}ms<br />
          {pv.curveMeans && <>Adoption follows a <strong>monthly progressive curve</strong> from 0 through the annual breakpoints
            ({pv.ramps.join('/')}% at months 12/24/36), not the annual step. Its yearly averages are {pv.curveMeans.join('/')}% — lower than the
            model&apos;s annual figures by construction, because the model states the year&apos;s representative level while the curve states the
            path. No euro figure is affected.<br /></>}
          <strong className="ac-warn-ink">Simulated from this case&apos;s assumptions — not measured data.</strong></p>
      )}
    </Panel>
  );
}
