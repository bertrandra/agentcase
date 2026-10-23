import { addCurvePoint, removeCurvePoint, setCurveFamily } from '@/controllers/scopeTools';
import { MAX_POINTS, MIN_POINTS } from '@/domain/scope/scurve';
import { scurveView } from '@/domain/scope/scurveView';
import { useCtx } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { CurveSvg } from './CurveSvg';
import { LEVEL_COLOR } from './geometry';

const EXPLAIN: Record<string, string> = { L1: 'Assisted — first agents in the loop', L2: 'Accelerating — agents across the team', L3: 'Scaling — agentic delivery is the norm', L4: 'Cruise — near-full agentic factory' };
const FAMILIES = [['logistic', 'Logistic — symmetric'], ['gompertz', 'Gompertz — late inflection'], ['spline', 'Free-form spline — through every point']];
const FAMILY_OPTIONS = FAMILIES.map(([value, label]) => ({ value: value!, label: label! }));

/** Adoption curve & maturity levels: family, add/remove point, the draggable curve, horizon-end readout and the L1–L4 crossings. */
export function Editor() {
  const c = useCtx(), view = scurveView(c, (parseInt(c.inp.v('horizon'), 10) || 3) * 12);
  return (
    <Panel title="📈 Adoption curve & maturity levels">
      <p className="ac-muted">The live adoption S-curve, with the four maturity levels marked where the curve crosses each threshold. Maturity is defined by the adoption reached: L1 0–25%, L2 25–55%, L3 55–80%, L4 80–100%.</p>
      <div className="ac-form-row">
        <FieldChoice label="Curve shape" value={view.family} options={FAMILY_OPTIONS} onChange={setCurveFamily}>
          <label className="ac-field"><span className="ac-field-l">Curve shape</span>
            <select value={view.family} onChange={(e) => setCurveFamily(e.target.value)}>{FAMILIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </FieldChoice>
        <button type="button" disabled={view.pts.length >= MAX_POINTS} onClick={addCurvePoint}>＋ point</button>
        <button type="button" disabled={view.pts.length <= MIN_POINTS} onClick={removeCurvePoint}>－ point</button>
        <OverrideBadge refKey="scurve" label="S-curve" />
      </div>
      <p className="ac-field-h">Drag any dot anywhere — its month &amp; adoption update live and the case follows on release.</p>
      <CurveSvg view={view} />
      <div className="ac-readout">
        <div><span className="ac-field-h">Adoption at horizon end (Y{view.endYear})</span><br /><span className="ac-stat-v" style={{ color: 'var(--ac-blue)' }}>{view.endAdoption}%</span></div>
        <div><span className="ac-field-h">Maturity at horizon end</span><br /><span className="ac-stat-v" style={{ color: 'var(--ac-teal)' }}>{view.endMaturity}</span></div>
        <div className="ac-field-h" style={{ maxWidth: 420 }}>Drag the dots to draw the adoption you expect; the curve is sampled at Y1/Y2/Y3 to drive the whole case.</div>
      </div>
      <div className="ac-levels">
        {view.levels.map((l) => (
          <div key={l.lvl} className="ac-level" style={{ borderLeftColor: LEVEL_COLOR[l.lvl] }}>
            <strong style={{ color: LEVEL_COLOR[l.lvl] }}>{l.lvl} · adoption {l.range}</strong>
            <div>{EXPLAIN[l.lvl]}</div><small>Reached: {l.when}</small>
          </div>
        ))}
      </div>
    </Panel>
  );
}
