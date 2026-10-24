import { LOCATIONS } from '@/domain';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import { isPinnedRow, pinsOf, type TeamWeights } from '@/domain/baseline/teamWeights';
import { rateFor } from '@/domain/location';
import { activeArtefacts } from '@/domain';
import { removeTeamRow, updateTeamRow } from '@/controllers/team';
import type { Ctx } from '@/domain';
import type { TeamRow } from '@/domain/types/state';
import { CommitNumber } from '../CommitNumber';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';
import { fmtK } from '../fmtK';

const opts = (list: string[]) => list.map((o) => <option key={o} value={o}>{o}</option>);
const choices = (list: string[]) => list.map((o) => ({ value: o, label: o }));
const LOC_NAMES = LOCATIONS.map((l) => l.name);

/** One select of a team line, switchable to segmented buttons / radios by the choice controls axis (short lists only). */
function Pick({ i, field, list, name, value }: { i: number; field: 'skill' | 'grade' | 'loc'; list: string[]; name: string; value: string }) {
  const label = `${name} of line ${i + 1}`, set = (v: string) => updateTeamRow(i, field, v);
  return (
    <FieldChoice bare label={label} value={value} options={choices(list)} onChange={set}>
      <select aria-label={label} value={value} onChange={(e) => set(e.target.value)}>{opts(list)}</select>
    </FieldChoice>
  );
}

interface RowProps { r: TeamRow; i: number; c: Ctx; W: TeamWeights; open: boolean; onPin: (i: number) => void }

function Row({ r, i, c, W, open, onPin }: RowProps) {
  const tjm = rateFor(c.s, r.loc, r.grade), wd = c.inp.p('workdays');
  const d = (+r.etp || 0) - (W.targetFTE[i] ?? 0), pinned = isPinnedRow(r);
  const live = pinsOf(r).filter((id) => activeArtefacts(c.a, c.s).some((a) => a.id === id)).length;
  const dTone = Math.abs(d) < 1e-9 ? 'slate-700' : d > 0 ? 'danger-800' : 'teal-725';
  const pinTitle = pinned ? `${live} of ${pinsOf(r).length} pinned artefacts are in scope` : `Auto: takes a share of the ${r.skill} pool`;
  const fte = `FTE of line ${i + 1}`, setFte = (v: string) => updateTeamRow(i, 'etp', v);
  return (
    <tr className={pinned ? 'ac-row-hl' : undefined} data-tone={pinned ? 'warning-40' : undefined}>
      <td><Pick i={i} field="skill" list={SKILLS_EXIST} name="Skill" value={r.skill} /></td>
      <td><Pick i={i} field="grade" list={GRADES} name="Grade" value={r.grade} /></td>
      <td><Pick i={i} field="loc" list={LOC_NAMES} name="Location" value={r.loc} /></td>
      <td><FieldNumber bare native="number" label={fte} step={0.5} min={0} value={r.etp} onCommit={setFte}>
        <CommitNumber label={fte} step={0.5} min={0} className="ac-team-fte" value={r.etp} onCommit={setFte} /></FieldNumber></td>
      <td className="ac-td-num" title={`Implied by the artefact mix — exact ${(W.impliedETP[i] ?? 0).toFixed(2)}`}>
        {(W.targetFTE[i] ?? 0).toFixed(1)} <b className="ac-tone" data-tone={dTone}>{d >= 0 ? '+' : ''}{d.toFixed(1)}</b></td>
      <td className="ac-td-num">{tjm}</td>
      <td className="ac-td-num ac-team-cost">{fmtK(r.etp * tjm * wd)}</td>
      <td>
        <button type="button" aria-pressed={open} aria-label={`Pin line ${i + 1}`} title={pinTitle} onClick={() => onPin(i)}>📌{pinned ? ` ${live}` : ''}</button>
      </td>
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
          <th scope="col">Day rate (€/d)</th><th scope="col">Cost/yr</th><th scope="col" title="Pin this row to specific artefacts">Pin</th>
          <th scope="col"><span className="ac-sr">Remove</span></th>
        </tr></thead>
        <tbody>{c.s.teamIn.map((r, i) => <Row key={i} r={r} i={i} c={c} W={W} open={openRow === i} onPin={onPin} />)}</tbody>
      </table>
    </div>
  );
}
