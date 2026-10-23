import { LOCATIONS } from '@/domain';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import { isPinnedRow, pinsOf, type TeamWeights } from '@/domain/baseline/teamWeights';
import { rateFor } from '@/domain/location';
import { activeArtefacts } from '@/domain';
import { removeTeamRow, updateTeamRow } from '@/controllers/team';
import type { Ctx } from '@/domain';
import type { TeamRow } from '@/domain/types/state';
import { CommitNumber } from '../CommitNumber';
import { fmtK } from '../fmtK';
import { tok } from '@/domain/theme';

const opts = (list: string[]) => list.map((o) => <option key={o} value={o}>{o}</option>);

interface RowProps { r: TeamRow; i: number; c: Ctx; W: TeamWeights; open: boolean; onPin: (i: number) => void }

function Row({ r, i, c, W, open, onPin }: RowProps) {
  const tjm = rateFor(c.s, r.loc, r.grade), wd = c.inp.p('workdays');
  const d = (+r.etp || 0) - (W.targetFTE[i] ?? 0), pinned = isPinnedRow(r);
  const live = pinsOf(r).filter((id) => activeArtefacts(c.a, c.s).some((a) => a.id === id)).length;
  const dcol = Math.abs(d) < 1e-9 ? tok('slate-700') : d > 0 ? tok('danger-800') : tok('teal-725');
  return (
    <tr style={pinned ? { background: tok('warning-40') } : undefined}>
      <td><select aria-label={`Skill of line ${i + 1}`} value={r.skill} onChange={(e) => updateTeamRow(i, 'skill', e.target.value)}>{opts(SKILLS_EXIST)}</select></td>
      <td><select aria-label={`Grade of line ${i + 1}`} value={r.grade} onChange={(e) => updateTeamRow(i, 'grade', e.target.value)}>{opts(GRADES)}</select></td>
      <td><select aria-label={`Location of line ${i + 1}`} value={r.loc} onChange={(e) => updateTeamRow(i, 'loc', e.target.value)}>{opts(LOCATIONS.map((l) => l.name))}</select></td>
      <td><CommitNumber label={`FTE of line ${i + 1}`} step={0.5} min={0} width={70} value={r.etp} onCommit={(v) => updateTeamRow(i, 'etp', v)} /></td>
      <td style={{ textAlign: 'right' }} title={`Implied by the artefact mix — exact ${(W.impliedETP[i] ?? 0).toFixed(2)}`}>
        {(W.targetFTE[i] ?? 0).toFixed(1)} <b style={{ color: dcol }}>{d >= 0 ? '+' : ''}{d.toFixed(1)}</b></td>
      <td style={{ textAlign: 'right' }}>{tjm}</td>
      <td style={{ textAlign: 'right', fontWeight: 'var(--ac-font-weight-semibold)' }}>{fmtK(r.etp * tjm * wd)}</td>
      <td><button type="button" aria-pressed={open} aria-label={`Pin line ${i + 1}`} title={pinned ? `${live} of ${pinsOf(r).length} pinned artefacts are in scope` : `Auto: takes a share of the ${r.skill} pool`}
        onClick={() => onPin(i)}>📌{pinned ? ` ${live}` : ''}</button></td>
      <td><button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => removeTeamRow(i)}>×</button></td>
    </tr>
  );
}

/** The editable team table: skill / grade / location / FTE, implied FTE vs the artefact mix, day rate, cost, pin. */
export function TeamRows({ c, W, openRow, onPin }: { c: Ctx; W: TeamWeights; openRow: number | null; onPin: (i: number) => void }) {
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        <thead><tr>
          <th scope="col">Skill</th><th scope="col">Grade</th><th scope="col">Location</th><th scope="col">FTE</th>
          <th scope="col" title="FTE implied by the artefact mix (Σw of the row ÷ Σw of the scope × total FTE)">Implied</th>
          <th scope="col">Day rate (€/d)</th><th scope="col">Cost/yr</th><th scope="col" title="Pin this row to specific artefacts">Pin</th><th scope="col"><span className="ac-sr">Remove</span></th>
        </tr></thead>
        <tbody>{c.s.teamIn.map((r, i) => <Row key={i} r={r} i={i} c={c} W={W} open={openRow === i} onPin={onPin} />)}</tbody>
      </table>
    </div>
  );
}
