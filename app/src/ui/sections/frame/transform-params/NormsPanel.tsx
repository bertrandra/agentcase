import { setRegInclude, toggleNorm } from '@/controllers/frame';
import { normKey, normsOf, regGlassCeiling } from '@/domain/frame';
import { useCtx, useDoc } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { FieldToggle } from '@/ui/widgets/field/FieldToggle';

const EXPORT_PENDING = 'The standalone report export is not migrated yet (Phase 6) — use the legacy app';

/** Norm checkboxes of one industry (or cross-cutting category). */
export function NormList({ code, dense }: { code: string; dense?: boolean }) {
  const ticked = useDoc((d) => d.selectedNorms);
  const norms = normsOf(code);
  if (!norms.length) return <em className="ac-muted">No norms configured for this industry.</em>;
  return (
    <div className={dense ? 'ac-norms is-dense' : 'ac-norms'}>
      {norms.map((n) => (
        <label key={n.name} className="ac-check ac-norm">
          <input type="checkbox" checked={ticked.includes(normKey(code, n.name))} onChange={(e) => toggleNorm(code, n.name, e.target.checked)} />
          {' '}<strong>{n.name}</strong> <span className="ac-muted">({n.count})</span>
        </label>
      ))}
    </div>
  );
}

/** The regulatory catalogue panel: norms of the chosen industry, what is in scope and the glass ceiling it implies. */
export function NormsPanel() {
  const code = useDoc((d) => d.dom.values.industry ?? 'NONE'), count = useDoc((d) => d.selectedRegArtefacts.length);
  const include = useDoc((d) => d.regInclude);
  const ceiling = regGlassCeiling(useCtx()), none = !code || code === 'NONE';
  return (
    <div>
      <p className="ac-muted">Norms for <strong>{none ? '—' : code}</strong> — tick to add the regulatory artifacts to the scope</p>
      {none ? <em className="ac-tone" data-tone="brick">Pick an industry above to see its applicable norms.</em> : <NormList code={code} />}
      <OverrideBadge refKey="selectedNorms" label="Selected norms" />
      <p>In scope: <strong>{none ? 0 : count}</strong> regulatory artifacts</p>
      {!none && count > 0 && (
        <p className="ac-tone" data-tone="teal">Weighted glass ceiling from selection: <strong>{Math.round(ceiling)}%</strong> (mean human sup.
          on {count} artifacts)</p>
      )}
      <FieldToggle label="Include reg. artifacts in effort & runs (else glass ceiling only)" checked={!!include} onChange={setRegInclude}>
        <label className="ac-check">
          <input type="checkbox" checked={!!include} onChange={(e) => setRegInclude(e.target.checked)} /> Include reg. artifacts in effort &amp; runs (else
          glass ceiling only)
        </label>
      </FieldToggle>
      <OverrideBadge refKey="regInclude" label="Regulatory inclusion" />
      <p><button type="button" disabled title={EXPORT_PENDING}>📄 Export Critical &amp; Regulated report</button></p>
    </div>
  );
}
