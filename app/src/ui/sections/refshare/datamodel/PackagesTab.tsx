import { useMemo } from 'react';
import { buildCalcPackage, CALC_PACKAGE_SCHEMA } from '@/domain/calcPackage';
import { buildPortfolioPackages, corePortfolio } from '@/domain/portfolio';
import { CALCULATION_VERSION } from '@/domain/time/kernel';
import { useDoc, usePortfolio } from '@/store/hooks';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { packageFields, type PackageField } from './packages';

/** The calculation package a saved case carries, its fields and which of them opening a file compares — all read off the live engine. */
export function PackagesTab() {
  const doc = useDoc((d) => d), pf = usePortfolio(corePortfolio);
  const fields = useMemo(() => packageFields(buildCalcPackage(doc)), [doc]);
  const pfKeys = useMemo(() => { const p = buildPortfolioPackages(pf); return { top: Object.keys(p), per: Object.keys(p.calculationPackages) }; }, [pf]);
  const compared = fields.filter((r) => r.compared).length;
  return (
    <div>
      <h2>Calculation packages <span className="ac-muted">— schema <code>{CALC_PACKAGE_SCHEMA}</code>, engine <code>{CALCULATION_VERSION}</code></span></h2>
      <p className="ac-muted">Every saved case (JSON, HTML snapshot, autosave record) carries the canonical package of the engine: its identity and its key
        figures. It is never read back as input: on open the figures are recomputed from the inputs and compared with it (valid / stale / another engine
        version / no package), and a mismatch shows the staleness banner. A portfolio file carries one package per product (exactly the single-case
        package of its effective case) and one for the consolidated portfolio; both levels are compared, the worst state wins and the products that moved
        are named. A portfolio package saved before the net total (its <code>totalSavings</code> was the gross benefit) is still valid when the
        rest matches.</p>
      <p>Top-level keys of a saved portfolio's packages: {pfKeys.top.map((k) => <code key={k}>{k} </code>)} · per-product packages
        now: {pfKeys.per.map((k) => <Badge key={k}>{k}</Badge>)}</p>
      <DataTable<PackageField> caption={`Fields of the live package — ${compared} of ${fields.length} compared on open`} rows={fields}
        rowKey={(r) => r.path} columns={[
        { key: 'p', header: 'Field', render: (r) => <code>{r.path}</code> }, { key: 't', header: 'Type', render: (r) => r.type },
        { key: 'v', header: 'Live value', align: 'right', render: (r) => r.value },
        { key: 'c', header: 'Compared on open', render: (r) => <Badge tone={r.compared ? 'teal' : 'grey'}>{r.compared ? 'compared' : 'not compared'}</Badge> },
      ]} />
      <p className="ac-muted">“Compared” is measured: each field is moved in a copy of the package and the staleness comparison itself
        (<code>samePackage</code>, figures to 1e-6 relative) is asked whether the two still match. Year rows (<code>annual[]</code>) are probed on year 1.</p>
    </div>
  );
}
