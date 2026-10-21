import { useState, type ReactNode } from 'react';
import { automationCurve, type AutoBase, type AutomationCurve as Data } from '@/domain/scope/automation';
import { useCtx } from '@/store/hooks';
import { COL } from './chart';
import { CurveSvg, type Toggles } from './CurveSvg';

function Row({ col, name, val, sub, on, onToggle }: { col: string; name: string; val: string; sub?: ReactNode; on?: boolean; onToggle?: (v: boolean) => void }) {
  const head = (
    <>
      <span className="ac-leg-head">
        {onToggle && <input type="checkbox" checked={!!on} aria-label={name} onChange={(e) => onToggle(e.target.checked)} />}
        <span className="ac-leg-sw" style={{ background: col }} /><span className="ac-leg-name">{name}</span><span className="ac-leg-fill" />
        <span className="ac-leg-val" style={{ color: col.includes('gradient') ? '#5a6785' : col }}>{val}</span>
      </span>
      {sub && <div className="ac-leg-sub">{sub}</div>}
    </>
  );
  return onToggle ? <label className="ac-leg-row">{head}</label> : <div className="ac-leg-row">{head}</div>;
}

function Legend({ a, show, set }: { a: Data; show: Toggles; set: (k: keyof Toggles, v: boolean) => void }) {
  const closed = a.adoptGapEnd <= 0.05;
  return (
    <div className="ac-legend">
      <div>
        <h3>Always on the chart</h3>
        <Row col={COL.real} name="Realized automation" val={`${a.realEnd.toFixed(1)}% by ${a.endLabel}`} />
        <Row col={COL.gap} name="Adoption gap" val={closed ? 'closed' : `−${a.adoptGapEnd.toFixed(1)} pts`} sub={closed ? `the ramp reaches ${Math.round(a.rampEnd)}% by ${a.endLabel} — nothing left to close` : undefined} />
        <Row col={COL.ceil} name="Glass-ceiling & lifecycle cap" val={`−${a.ceilLoss.toFixed(1)} pts`} />
        <Row col={COL.manual} name="Not automatable" val={`−${a.manual.toFixed(1)} pts`} />
      </div>
      <div>
        <h3>Tick to add</h3>
        <Row col={COL.human} name="Residual human FTE" val={`${a.humanEnd.toFixed(1)} FTE (${Math.round(a.residEndPct)}%) by ${a.endLabel}`} on={show.human} onToggle={(v) => set('human', v)}
          sub={`delivery ${a.team.devETP.toFixed(1)}  ·  supervision ${a.team.supETP.toFixed(1)}  ·  agentic-run ${a.team.runETP.toFixed(1)}`} />
        <Row col={COL.manln} name="Human-handled work" val={`${a.manualEndPct.toFixed(0)}% by ${a.endLabel}`} sub="not-automatable + glass-ceiling, together" on={show.manual} onToggle={(v) => set('manual', v)} />
        <Row col={COL.vfte} name="Agent vFTE share" val={`${a.vfteEndFte.toFixed(1)} vFTE by ${a.endLabel}`} sub={`${Math.round(a.vfteShareEnd)}% of the blended human + agent team`} on={show.vfte} onToggle={(v) => set('vfte', v)} />
        <Row col="linear-gradient(90deg,#8A94A6 25%,#1DB8F2 25% 50%,#00828E 50% 75%,#0058AB 75%)" name="Maturity levels L1–L4" val="crosses 25 / 55 / 80%" on={show.levels} onToggle={(v) => set('levels', v)} />
      </div>
    </div>
  );
}

/** 🤖 Automation over time — potential vs realized (the legend toggles are view state, not part of the case). */
export function AutomationCurve({ base }: { base: AutoBase }) {
  const c = useCtx(), a = automationCurve(c, base), [show, setShow] = useState<Toggles>({ human: false, manual: false, vfte: false, levels: false });
  return (
    <details open className="ac-card" data-rail="teal">
      <summary><h2 style={{ display: 'inline' }}>🤖 Automation over time — potential vs realized</h2></summary>
      <p className="ac-muted">How much of the delivery work is actually automated, month by month, against the ceiling. The <strong>full automation potential</strong> and <strong>glass ceiling</strong> set above define the reachable depth;
        the <strong>realized</strong> curve is what the adoption ramp (📊 S-curve) actually delivers each month. The gap between them is split into the factors that hold it back — a per-factor spec of what is (and isn&apos;t) captured.</p>
      <CurveSvg a={a} show={show} start={c.inp.v('rmStart')} />
      <Legend a={a} show={show} set={(k, v) => setShow({ ...show, [k]: v })} />
    </details>
  );
}
