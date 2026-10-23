import { setRegInclude, toggleNorm } from '@/controllers/frame';
import { normKey, normsOf, regGlassCeiling } from '@/domain/frame';
import { useCtx, useDoc } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';

/** Norm checkboxes of one industry (or cross-cutting category). */
export function NormList({ code, dense }: { code: string; dense?: boolean }) {
  const ticked = useDoc((d) => d.selectedNorms);
  const norms = normsOf(code);
  if (!norms.length) return <em className="ac-muted">No norms configured for this industry.</em>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(${dense ? 160 : 190}px,1fr))`, gap: dense ? 3 : 6 }}>
      {norms.map((n) => (
        <label key={n.name} className="ac-check" style={{ border: '1px solid var(--ac-line)', borderRadius: 'var(--ac-radius-sm-plus)', padding: dense ? '4px 8px' : '6px 9px' }}>
          <input type="checkbox" checked={ticked.includes(normKey(code, n.name))} onChange={(e) => toggleNorm(code, n.name, e.target.checked)} />
          {' '}<strong>{n.name}</strong> <span className="ac-muted">({n.count})</span>
        </label>
      ))}
    </div>
  );
}

/** The regulatory catalogue panel: norms of the chosen industry, what is in scope and the glass ceiling it implies. */
export function NormsPanel() {
  const code = useDoc((d) => d.dom.values.industry ?? 'NONE'), count = useDoc((d) => d.selectedRegArtefacts.length), include = useDoc((d) => d.regInclude);
  const ceiling = regGlassCeiling(useCtx()), none = !code || code === 'NONE';
  return (
    <div>
      <p className="ac-muted">Norms for <strong>{none ? '—' : code}</strong> — tick to add the regulatory artifacts to the scope</p>
      {none ? <em style={{ color: 'var(--ac-brick)' }}>Pick an industry above to see its applicable norms.</em> : <NormList code={code} />}
      <OverrideBadge refKey="selectedNorms" label="Selected norms" />
      <p>In scope: <strong>{none ? 0 : count}</strong> regulatory artifacts</p>
      {!none && count > 0 && <p style={{ color: 'var(--ac-teal)' }}>Weighted glass ceiling from selection: <strong>{Math.round(ceiling)}%</strong> (mean human sup. on {count} artifacts)</p>}
      <label className="ac-check"><input type="checkbox" checked={!!include} onChange={(e) => setRegInclude(e.target.checked)} /> Include reg. artifacts in effort &amp; runs (else glass ceiling only)</label>
      <OverrideBadge refKey="regInclude" label="Regulatory inclusion" />
      <p><button type="button" disabled title="The standalone report export is not migrated yet (Phase 6) — use the legacy app">📄 Export Critical &amp; Regulated report</button></p>
    </div>
  );
}
