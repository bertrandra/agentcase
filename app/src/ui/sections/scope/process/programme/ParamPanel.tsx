import { useEffect, useId, useRef } from 'react';
import type { SubsetField } from '@/domain/portfolio';
import { descriptionKey, type ParamDef, type ProgrammeView } from '@/domain/programme';
import { useIsMulti } from '@/store/portfolioHooks';
import { NumberInput, SelectInput } from '@/ui/widgets/fields';
import { fmt1 } from '@/ui/economicsFormat';
import { LeadField } from '../../../tune/knowledge/MultiPanels';
import { SubsetFieldBox } from '../../../tune/knowledge/SubsetBadge';
import { DescriptionField, TypeSelect } from '../../programme/Editors';
import { selectActivity } from '../view';
import { costText } from './ProgrammeTable';
import { WAVE_PREFIX, WavePanel } from './WavePanel';

/** The knowledge-subset field a hub parameter belongs to with several products, and the name of its chip ("inherited / overridden"). */
const SUBSET: Record<string, [SubsetField, string]> = {
  khTargetCC: ['targetCC', 'Target CC'], khSetupBase: ['setupBase', 'Setup base'], khCurationFTE: ['curationFTE', 'Curation'],
};

/** One parameter field of a programme activity (shared with the 📋 Programme screen: the same field, key and command). */
export function Param({ p, multi }: { p: ParamDef; multi: boolean }) {
  if (p.singleOnly && multi) return <p className="ac-muted">{`${p.label}: a portfolio cost, set on the shared hub card of the Knowledge hub.`}</p>;
  if (p.store === 'knowledge') return multi ? <LeadField /> : <p className="ac-muted">{`${p.label}: set per product in a portfolio.`}</p>;
  const field = p.options ? <SelectInput id={p.key} label={p.label} options={[...p.options]} />
    : <NumberInput id={p.key} label={p.label} min={p.min} max={p.max} step={p.step} />;
  const sub = SUBSET[p.key];
  return sub ? <SubsetFieldBox field={sub[0]} label={sub[1]}>{field}</SubsetFieldBox> : field;
}

/**
 * The parameter panel of a programme activity (F-B70; phase B9a): its description, role (lane), RACI, duration and placement, effort, cost
 * rule and cost, and its own parameters. The description and parameters are the programme's (`domain/programme`), shown and edited here only
 * (F-B71, F-B72). In B9a the values are still held by the case keys, so each field writes its key through the existing input command: one
 * undoable step per edit, a portfolio product's override as elsewhere.
 */
export function ParamPanel({ v, id }: { v: ProgrammeView; id: string }) {
  const a = v.activities.find((x) => x.id === id), k = useId(), multi = useIsMulti(), head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.scrollIntoView?.({ block: 'nearest' }); }, [id]);
  if (!a) return id.startsWith(WAVE_PREFIX) ? <WavePanel v={v} id={id} /> : <MilestonePanel v={v} id={id} />;
  const lane = (r: string | undefined) => v.lanes.find((l) => l.role === r)?.name ?? '—';
  const list = (rs: string[]) => (rs.length ? rs.map(lane).join(', ') : '—');
  return (
    <section className="ac-proc-panel" aria-labelledby={`${k}-h`}>
      <h3 id={`${k}-h`} ref={head} tabIndex={-1}>{a.name}</h3>
      <p>{a.description}</p>
      <DescriptionField name={a.name} value={a.description} keyId={descriptionKey(a.kind)} />
      <dl className="ac-proc-facts">
        <dt>Role (lane)</dt><dd>{lane(a.lane)}</dd>
        <dt>RACI</dt><dd>{`R ${lane(a.lane)} · A ${lane(a.raci.A)} · C ${list(a.raci.C)} · I ${list(a.raci.I)}`}</dd>
        <dt>Phase</dt><dd>{v.phases.find((p) => p.phase === a.phase)?.name}</dd>
        <dt>Instances</dt><dd>{a.instances === null ? 'Once for the case' : `Per product: multi-instance × ${a.instances}`}</dd>
        <dt>Duration and placement</dt><dd>{a.placement.text}</dd>
        <dt>Effort</dt><dd>{a.cost.effortDays === null ? '—' : `${fmt1(a.cost.effortDays)} days`}</dd>
        <dt>Cost</dt><dd>{`${costText(a)} — ${a.cost.rule}${a.cost.note ? `. ${a.cost.note}` : ''}`}</dd>
        <dt>Computed by</dt><dd>{a.source}</dd>
        {!a.active && <><dt>Module</dt><dd>Off: switch it on in the Engagement / Knowledge hub context</dd></>}
      </dl>
      {a.params.length > 0 && (
        <fieldset className="ac-proc-fields">
          <legend>Parameters</legend>
          {a.params.map((p) => <Param key={p.key} p={p} multi={multi} />)}
        </fieldset>
      )}
      <p className="ac-form-row">Type (how its cost is laid on the months): <TypeSelect kind={a.kind} name={a.name} /></p>
      <div className="ac-form-row">
        <button type="button" onClick={() => selectActivity(null)}>Close</button>
      </div>
    </section>
  );
}

/** A milestone or maturity gate of the programme: its criteria (from their owner), role, placement by the engine; no cost, no parameter. */
function MilestonePanel({ v, id }: { v: ProgrammeView; id: string }) {
  const m = v.milestones.find((x) => x.id === id), k = useId();
  if (!m) return null;
  return (
    <section className="ac-proc-panel" aria-labelledby={`${k}-h`}>
      <h3 id={`${k}-h`}>{m.name}</h3>
      <dl className="ac-proc-facts">
        <dt>Kind</dt><dd>{m.element === 'gateway' ? 'Gateway (a gate the programme must clear)' : 'Milestone'}</dd>
        <dt>Criteria</dt><dd>{m.criteria}</dd>
        <dt>Role (lane)</dt><dd>{v.lanes.find((l) => l.role === m.lane)?.name}</dd>
        <dt>Placement</dt><dd>{m.placement}</dd>
        <dt>Instances</dt><dd>{`Per product: × ${m.instances}`}</dd>
        <dt>Cost</dt><dd>None</dd>
      </dl>
      <div className="ac-form-row"><button type="button" onClick={() => selectActivity(null)}>Close</button></div>
    </section>
  );
}
