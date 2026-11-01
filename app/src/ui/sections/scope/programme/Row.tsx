import { memo, useEffect, useRef } from 'react';
import { structuralEqual } from '@/store/equal';
import type { ProgrammeRow } from '@/domain/programme';
import { eurK } from '@/ui/sections/tuneB/fmt';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { sectionById } from '@/ui/zones/registry';
import { goSection } from '@/ui/uiState';
import { Param } from '../process/programme/ParamPanel';
import { DescriptionField, EnabledBox, TypeSelect } from './Editors';
import { toggleRow } from './view';

const r1 = (n: number): string => String(Math.round(n * 10) / 10);
const money = (n: number): string => (Math.abs(n) < 500 ? (n ? '< €1K' : '—') : eurK(n));
const instances = (r: ProgrammeRow): string => (r.instances === null ? 'once for the case' : `per product × ${r.instances}`);
/** "12 days of Preceptor · 2 days a month over 6 months · €1,150 a day". */
export function detailText(r: ProgrammeRow): string {
  const d = r.detail;
  if (!d) return '';
  const parts = [d.days === null ? null : `${r1(d.days)} days of ${d.role}`, d.perMonth === null || d.months === null ? null
    : `${r1(d.perMonth)} days a month over ${r1(d.months)} months`, d.rate ? `€${Math.round(d.rate).toLocaleString('en-US')} a day` : null];
  return parts.filter(Boolean).join(' · ');
}
export const costCell = (r: ProgrammeRow): string =>
  (r.amount === null ? '—' : `${money(r.amount)}${r.per === 'year 1' ? ' / yr (Y1)' : ''}${r.sharedWith ? ` (with ${r.sharedWith})` : ''}`);

/**
 * One activity or milestone of the programme, and its editor when open (timing and cost parameters, description). Memoised on the row's content
 * (the table is recomputed per edit, with fresh row objects): an edit re-renders the rows whose values changed and the totals.
 */
export const ProgrammeRowView = memo(function ProgrammeRowView({ r, open, focused = false, years, multi, cols }: { r: ProgrammeRow; open: boolean;
  focused?: boolean; years: number; multi: boolean; cols: number }) {
  const head = useRef<HTMLTableCellElement>(null);
  useEffect(() => { if (focused) { head.current?.scrollIntoView?.({ block: 'center' }); head.current?.focus(); } }, [focused]);
  const linked = r.linked ? sectionById(r.linked) : undefined, editorId = `prog-edit-${r.id}`;
  const editable = r.element === 'task' && (r.descKey !== null || r.timingParams.length > 0 || r.costParams.length > 0);
  return (
    <>
      <tr className={focused ? 'is-focused' : undefined} aria-current={focused ? 'true' : undefined}>
        <td><EnabledBox name={r.name} e={r.enabled} /></td>
        <th scope="row" ref={head} tabIndex={focused ? -1 : undefined}>
          {r.name}{' '}
          <span className="ac-muted">{`— ${r.element === 'task' ? '' : `${r.element}, `}${instances(r)}`}</span>
          {editable && <> <button type="button" className="ac-link" aria-expanded={open} aria-controls={open ? editorId : undefined}
            aria-label={`${open ? 'Close' : 'Edit'} ${r.name}`}
            onClick={() => toggleRow(r.id)}>{open ? 'Close' : 'Edit'}</button></>}
        </th>
        <td>{r.description}</td>
        <td><TypeSelect kind={r.kind} name={r.name} /></td>
        <td>{r.placement}</td>
        <td>
          <span className="ac-proc-num">{costCell(r)}</span>
          {detailText(r) && <div className="ac-muted">{detailText(r)}</div>}
          {r.note && <div className="ac-muted">{r.note}</div>}
        </td>
        {Array.from({ length: years }, (_, y) => <td key={y} className="ac-proc-num">{r.years ? money(r.years[y] ?? 0) : ''}</td>)}
        <td>
          {linked && <button type="button" className="ac-link" onClick={() => goSection(linked.id)}>{`Open ${linked.label}`}</button>}{' '}
          <button type="button" className="ac-link" onClick={() => openActivity(r.id)}>{`Open ${r.name} in Process`}</button>
        </td>
      </tr>
      {open && editable && (
        <tr id={editorId}>
          <td colSpan={cols}>
            {r.descKey && <DescriptionField name={r.name} value={r.description} keyId={r.descKey} />}
            {r.timingParams.length > 0 && (
              <fieldset className="ac-proc-fields"><legend>{`Start and duration of ${r.name}`}</legend>
                {r.timingParams.map((p) => <Param key={p.key} p={p} multi={multi} />)}</fieldset>
            )}
            {r.costParams.length > 0 && (
              <fieldset className="ac-proc-fields"><legend>{`Cost of ${r.name}: ${r.ruleText}`}</legend>
                {r.costParams.map((p) => <Param key={p.key} p={p} multi={multi} />)}</fieldset>
            )}
          </td>
        </tr>
      )}
    </>
  );
}, structuralEqual);
