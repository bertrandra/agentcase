import { activeArtefacts, type Ctx } from '@/domain';
import { isPinnedRow, type TeamWeights } from '@/domain/baseline/teamWeights';
import { addTeamRowFor } from '@/controllers/baseline';
import { Callout } from '@/ui/widgets/cards';

/** Coverage of the scope weight by the team: the unstaffed skills (with a one-click fix), or "100 % assigned" and the pinned share. */
export function MixBanner({ c, W }: { c: Ctx; W: TeamWeights }) {
  const rows = c.s.teamIn, covered = W.totW ? (1 - W.unassignedW / W.totW) * 100 : 100;
  if (W.unassignedW > 1e-9) {
    return (
      <Callout kind="error">
        <strong>Unstaffed scope weight — {(100 - covered).toFixed(1)}%</strong>
        <p>This effort is <em>not</em> redistributed over the other lines and it does not shrink them: it simply has nobody on it. At the team’s current intensity, staffing it would take about <strong>+{W.fteToFullScope.toFixed(1)} FTE</strong>.
          Pinning a line makes it <strong>dedicated</strong> — it stops drawing from its skill’s auto pool.</p>
        <ul>
          {Object.keys(W.unassigned).sort().map((ts) => {
            const n = rows.filter((r) => r.skill === ts && isPinnedRow(r)).length;
            return (
              <li key={ts}><strong>{ts}</strong> — {((W.unassigned[ts]! / W.totW) * 100).toFixed(1)}% of the scope weight unstaffed:{' '}
                {n > 0 ? `the ${n} ${ts} line${n === 1 ? ' is' : 's are'} pinned to specific artefacts, so ${n === 1 ? 'it does' : 'they do'} not staff the rest of this skill` : `there is no ${ts} resource line at all`}.{' '}
                <button type="button" onClick={() => addTeamRowFor(ts)}>+ add an auto line</button></li>
            );
          })}
        </ul>
      </Callout>
    );
  }
  const pinnedW = rows.reduce((s, r, i) => s + (isPinnedRow(r) ? W.rowW[i]! : 0), 0), pct = W.totW ? (pinnedW / W.totW) * 100 : 0;
  return (
    <Callout>
      <strong style={{ color: 'var(--ac-teal)' }}>100% of the scope weight is assigned.</strong>
      {pct > 0.05 ? <> <b style={{ color: 'var(--ac-brick)' }}>{pct.toFixed(1)}% pinned</b> · {(100 - pct).toFixed(1)}% auto pool.</> : ' Entirely auto pool (no pinning).'}{' '}
      Σw = {W.totW.toFixed(1)} over {activeArtefacts(c.a, c.s).length} active artefacts.
    </Callout>
  );
}
