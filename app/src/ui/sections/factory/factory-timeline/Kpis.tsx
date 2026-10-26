import { KPIS, KPI_GROUPS, kpiCard } from '@/domain/factory/kpi';
import { Panel } from '@/ui/widgets/cards';
import { useKpiData } from '../data';

/** The 14 DORA + agentic KPIs, computed live. A rate over fewer events than the minimum sample shows a dash and the sample size instead. */
export function Kpis() {
  const { data, params } = useKpiData();
  return (
    <Panel title="📊 Factory KPIs"
      aside={<small className="ac-muted">DORA + agentic metrics, computed live from the Release Pipeline / Engineering / Factory Model data — also bindable as
      Board variables</small>}>
      {KPI_GROUPS.map((title, g) => (
        <section key={title} aria-label={title}>
          <h3>{title}</h3>
          <div className="ac-stat-row">
            {KPIS.filter((k) => k.group === g).map((k) => {
              const c = kpiCard(k, data, params);
              return (
                <div key={k.id} className="ac-stat" data-tone={c.thin ? 'grey' : 'blue'} data-kpi={k.id}>
                  <span className={c.thin ? 'ac-stat-v is-thin' : 'ac-stat-v'}>{c.display}</span>
                  <span className="ac-stat-l">{c.label}
                    {c.thin && <span className="ac-kpi-thin" title="A rate over this few events is quantised, not measured">insufficient sample
                    (n={c.n})</span>}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="ac-muted">All 14 metrics compute live from 🚀 Release Pipeline / ⚙️ Engineering / 🏭 Factory Model data (0 when there is nothing to measure
        yet). They are also bindable as Board card variables — the source section decides which appear.</p>
    </Panel>
  );
}
