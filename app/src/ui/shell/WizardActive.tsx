import type { PersonaSeq } from '@/domain/pdc/personas';
import type { Stop } from '@/domain/nav/sequence';
import { rescueFocus } from '../focusRescue';
import { useUi, wizExit as exitWalk, wizGo } from '../uiState';
import { useNavModel } from '../zones/navModel';

/** The step bar of a running guided sequence: current step and section, per-step section picker, step chips, Prev / Next / Finish, exit and progress. */
export function WizardActive({ seq, stops }: { seq: PersonaSeq; stops: Stop[] }) {
  const { sections } = useNavModel(), { pos, visited } = useUi((s) => s.wiz), ids = stops.map((s) => s.sec);
  const cur = stops[Math.min(pos, stops.length - 1)]!, at = Math.min(pos, stops.length - 1), def = (id: string) => sections.find((s) => s.id === id);
  const pct = Math.round((visited.filter((v) => v < stops.length).length / stops.length) * 100), last = at === stops.length - 1;
  const go = (i: number) => wizGo(i, ids);
  const wizExit = () => { exitWalk(); rescueFocus(() => document.querySelector<HTMLElement>('.ac-wiz-idle button') ?? document.getElementById('main')); };   // the bar unmounts under the focused button
  return (
    <div className="ac-wiz ac-wiz-active" role="region" aria-label="Guided sequence">
      <div className="ac-wiz-title"><strong>{cur.step}</strong> <span className="ac-muted">→ {def(cur.sec)?.label ?? cur.sec} · section {at + 1}/{stops.length}</span></div>
      <div className="ac-wiz-picker" aria-label="Sections of this step">
        {stops.map((s, i) => s.si === cur.si && (
          <button key={i} type="button" className={`ac-wchip${i === at ? ' is-current' : visited.includes(i) ? ' is-done' : ''}`} aria-current={i === at ? 'step' : undefined}
            title={def(s.sec)?.description ?? s.sec} onClick={() => go(i)}>{visited.includes(i) && i !== at ? '✓ ' : ''}{def(s.sec)?.label ?? s.sec}</button>
        ))}
      </div>
      <div className="ac-wiz-nav">
        <button type="button" className="ac-btn" disabled={at === 0} onClick={() => go(at - 1)}>← Prev</button>
        <ol className="ac-wiz-steps" aria-label="Steps">
          {seq.steps.map((st, si) => {
            const idx = stops.map((s, i) => (s.si === si ? i : -1)).filter((i) => i >= 0);
            if (!idx.length) return null;
            const state = cur.si === si ? ' is-current' : idx.every((i) => visited.includes(i)) ? ' is-done' : '';
            return <li key={si}><button type="button" className={`ac-wchip${state}`} title={st.label} aria-current={cur.si === si ? 'step' : undefined} onClick={() => go(idx[0]!)}>{st.label.split('·')[0]!.trim()}</button></li>;
          })}
        </ol>
        {last ? <button type="button" className="ac-btn ac-btn-primary" onClick={wizExit}>✓ Finish</button> : <button type="button" className="ac-btn ac-btn-primary" onClick={() => go(at + 1)}>Next →</button>}
        <button type="button" className="ac-btn" title="Exit the sequence" aria-label="Exit the sequence" onClick={wizExit}>✕</button>
      </div>
      <div className="ac-progress" role="progressbar" aria-label="Guided sequence progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${pct}% visited`}><div style={{ width: `${pct}%` }} /></div>
      <div className="ac-muted" style={{ fontSize: 10 }}>{pct}% of the sequence visited</div>
    </div>
  );
}
