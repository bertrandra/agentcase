import { caseValues } from '@/domain/process';
import { activityDef, DETAIL_SECTIONS, MILESTONE_NAMES, programmeActivityId, type ParamDef, type ProgrammeActivityDef } from '@/domain/programme';
import { useDocSelector } from '@/store/hooks';
import { useActiveProduct, useIsMulti } from '@/store/portfolioHooks';
import { selectActivity } from '@/ui/sections/scope/process/view';
import { goSection } from '@/ui/uiState';
import { openDetail } from './DetailLinks';
import './activity-refs.css';

/** Open the 🧩 Process section with an activity selected (a programme activity: its parameter panel open). */
export function openActivity(id: string): void {
  selectActivity(id);
  goSection('process');
}
export const openInProcess = (kind: string): void => openActivity(programmeActivityId(kind));
/** Open the 📋 Programme screen on an activity's row (selected, its editor open): the detail screen of the domain's map (`DETAIL_SECTIONS`). */
export const openInProgramme = (kind: string): void => openDetail(DETAIL_SECTIONS.programme[0]!, programmeActivityId(kind));

const shown = (p: ParamDef, raw: string | undefined): string => {
  const o = p.options?.find((x) => x.value === raw);
  return o ? o.label : raw === undefined || raw === '' ? 'default' : `${raw}${p.unit && p.unit !== '€' ? ` ${p.unit}` : ''}`;
};

/**
 * The programme activities a context screen relies on, as read-only references (docs/SPEC_BPMN.md § 19.7 F-B71; phase B9a): each one's name, its
 * parameter values as they stand, "Open in Process", which selects it in the 🧩 Process section where its description and parameters live
 * and are edited, and "Open in Programme", which opens its row in the 📋 Programme screen (selected, editor open; 2026-10-31).
 * A context screen shows results, figures and diagnostics; it never defines, describes or edits a programme activity.
 */
export function ActivityRefs({ kinds }: { kinds: string[] }) {
  const multi = useIsMulti(), product = useActiveProduct();
  const milestone = (k: string): Pick<ProgrammeActivityDef, 'kind' | 'name' | 'params'> | undefined => {
    const m = MILESTONE_NAMES.find((x) => x.kind === k);
    return m && { ...m, params: [] };
  };
  const defs = kinds.map((k) => activityDef(k) ?? milestone(k)).filter((d) => d !== undefined);
  // only the values of these parameters: another edit of the case (a figure, the customer name) does not re-render the list
  const keys = defs.flatMap((d) => d.params.map((p) => p.key)), read = useDocSelector((d) => { const v = caseValues(d); return keys.map((k) => v[k]); });
  const values: Record<string, string | undefined> = Object.fromEntries(keys.map((k, i) => [k, read[i]]));
  return (
    <div className="ac-act-refs" role="note" aria-label="Programme activities used here">
      <p className="ac-muted">Programme activities used here — their description and parameters are edited in the Process section:</p>
      <ul>
        {defs.map((d) => {
          const params = d.params.filter((p) => !(p.singleOnly && multi) && !(p.store === 'knowledge' && !multi)).map((p) =>
            `${p.label.replace(/ \([^)]*\)$/, '')}: ${shown(p, p.store === 'knowledge' ? String(product.knowledge.ktLeadMonths ?? 0) : values[p.key])}`);
          return (
            <li key={d.kind}>
              <strong>{d.name}</strong>
              {params.length > 0 && <span className="ac-muted">{` — ${params.join(' · ')}`}</span>}{' '}
              <button type="button" className="ac-link" onClick={() => openInProcess(d.kind)}>{`Open ${d.name} in Process`}</button>{' · '}
              <button type="button" className="ac-link" onClick={() => openInProgramme(d.kind)}>{`Open ${d.name} in Programme`}</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
