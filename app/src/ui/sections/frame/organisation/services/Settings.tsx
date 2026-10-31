import { SKILLS_EXIST } from '@/domain/baseline/skills';
import type { OrgRole, OrgUnit } from '@/domain/org';
import type { ServiceView } from '@/domain/portfolio';
import { addServiceLine, setServiceRoles, setServiceSkills, setSharedLineSplit, setSharedLineUnit } from '@/controllers/services';
import { useIsMulti, useSharedTeam } from '@/store/portfolioHooks';
import { goSection, toast } from '@/ui/uiState';
import { fmtNum } from '@/ui/widgets/orgFormat';

const toggle = (list: readonly string[], x: string, on: boolean): string[] => (on ? [...list, x] : list.filter((y) => y !== x));
const RULES = { effort: 'By effort (D-B38)', fixed: 'Fixed shares (override)' } as const;

/**
 * What a service is assigned (F-B82): its activity types (every activity of these team skills) and its roles (every activity where one of them is
 * RACI Responsible), on top of the activities pinned on its lines; its shared team lines and how each is split across the products.
 */
export function Settings({ unit, v, roles }: { unit: OrgUnit; v: ServiceView; roles: readonly OrgRole[] }) {
  const spec = unit.service!, n = unit.name, all = useSharedTeam(), others = all.filter((l) => (l.unit ?? '') !== unit.id), multi = useIsMulti();
  const types = [...SKILLS_EXIST, ...spec.skills.filter((s) => !SKILLS_EXIST.includes(s))], humans = roles.filter((r) => r.kind === 'role');
  return (
    <>
      <fieldset className="ac-svc-pick">
        <legend>{`Activity types done by ${n}`}</legend>
        {types.map((s) => (
          <label key={s} className="ac-check"><input type="checkbox" checked={spec.skills.includes(s)}
            onChange={(e) => { setServiceSkills(unit.id, toggle(spec.skills, s, e.target.checked)); }} /> {s}</label>
        ))}
      </fieldset>
      <fieldset className="ac-svc-pick">
        <legend>{`Roles of ${n} (activities where one is Responsible)`}</legend>
        {humans.map((r) => (
          <label key={r.id} className="ac-check"><input type="checkbox" checked={spec.roles.includes(r.id)}
            onChange={(e) => { if (!setServiceRoles(unit.id, toggle(spec.roles, r.id, e.target.checked))) toast('Role refused'); }} /> {r.name}</label>
        ))}
      </fieldset>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>{`Lines of ${n} (${v.lines.length}): FTE, pins and fixed shares are edited in Products`}</caption>
          <thead><tr><th scope="col">Line</th><th scope="col">FTE</th><th scope="col">Pins</th><th scope="col">Split</th>
            <th scope="col"><span className="ac-sr">Leave</span></th></tr></thead>
          <tbody>{v.lines.map(({ line: l, rule }, i) => {
            const who = `line ${i + 1} of ${n}`;
            return (
              <tr key={l.id}>
                <th scope="row">{`${l.skill} · ${l.grade} · ${l.loc}`}</th>
                <td className="ac-num">{fmtNum(l.etp)}</td>
                <td className="ac-num">{l.pins?.length ?? 0}</td>
                <td><select aria-label={`Split of ${who}`} value={rule}
                  onChange={(e) => { if (!setSharedLineSplit(l.id, e.target.value as 'effort' | 'fixed')) toast('Split refused'); }}>
                  {(['effort', 'fixed'] as const).map((r) => <option key={r} value={r}>{RULES[r]}</option>)}
                </select></td>
                <td><button type="button" onClick={() => toast(setSharedLineUnit(l.id, null) ? `Line moved to the delivery unit — Ctrl+Z to undo`
                  : 'Move refused')} aria-label={`Move ${who} to the delivery unit`}>Leave</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className="ac-form-row">
        <button type="button" onClick={() => toast(addServiceLine(unit.id) ? `Line added to ${n}, split by effort — Ctrl+Z to undo` : 'Line refused')}>
          + Add a line</button>
        {others.length > 0 && (
          <select aria-label={`Move a shared line to ${n}`} value="" onChange={(e) => {
            if (e.target.value) toast(setSharedLineUnit(e.target.value, unit.id) ? `Line moved to ${n} — Ctrl+Z to undo` : 'Move refused');
          }}>
            <option value="">Move a shared line here…</option>
            {others.map((l) => <option key={l.id} value={l.id}>{`${l.skill} · ${l.grade} · ${l.loc} · ${fmtNum(l.etp)} FTE`}</option>)}
          </select>
        )}
        {multi && <button type="button" className="ac-link" onClick={() => goSection('products')}>Edit the lines in Products</button>}
      </div>
    </>
  );
}
