import { describe, expect, it } from 'vitest';
import { orgOf, withOrganisationDiagram } from '@/domain/org';
import { analyseImport, catalogueProcess, serialize, kids, NS, attr, type XDocument } from '@/domain/process';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { goldenAndB } from '../../helpers/portfolio';
import { schemaTestsRun, validateText } from '../../helpers/bpmnValidate';

/**
 * SPEC_FIXES FX-23 (F-B39): the organisation lanes of the second diagram have their geometry (one band per role lane inside the pool, teams and
 * units spanning theirs), and an organisation lane set read on import names roles (its `partitionElementRef`), not units to map to a phase.
 */
const pf = goldenAndB(), base = catalogueProcess();
const lanesIn = (d: XDocument): string[] => {
  const out: string[] = [], walk = (e: XDocument['root']): void => { for (const c of kids(e)) { if (c.local === 'lane') out.push(attr(c, 'id') ?? ''); walk(c); } };
  for (const p of kids(d.root, NS.bpmn, 'process')) for (const s of kids(p, NS.bpmn, 'laneSet')) if (attr(s, 'id') === 'LaneSet-organisation') walk(s);
  return out;
};

describe('organisation lanes: geometry and import', () => {
  it('every organisation lane has a shape in the "By organisation" diagram; the file stays valid', () => {
    const d = withOrganisationDiagram(base, orgOf(pf, base), 'p1'), text = serialize(d), lanes = lanesIn(d);
    expect(lanes.length).toBeGreaterThan(2);
    for (const id of lanes) expect(text, id).toContain(`bpmnElement="${id}" isHorizontal="true"`);
    if (schemaTestsRun()) expect(validateText(text, 'org-view.bpmn')).toMatchObject({ schema: 'valid', errors: [] });
  });
  it('a foreign file with an organisation lane set: the role comes from the role lane resource, no lane unit to map', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d" targetNamespace="x">
  <bpmn:resource id="r-dev" name="Developer"/>
  <bpmn:process id="p" name="Delivery" isExecutable="false">
    <bpmn:laneSet id="LaneSet-organisation" name="By organisation">
      <bpmn:lane id="u1" name="Retail BU"><bpmn:childLaneSet id="u1s">
        <bpmn:lane id="t1" name="Team A"><bpmn:childLaneSet id="t1s">
          <bpmn:lane id="l1" name="Dev lane" partitionElementRef="r-dev"><bpmn:flowNodeRef>T1</bpmn:flowNodeRef></bpmn:lane>
        </bpmn:childLaneSet></bpmn:lane>
      </bpmn:childLaneSet></bpmn:lane>
    </bpmn:laneSet>
    <bpmn:userTask id="T1" name="Write the code"/>
  </bpmn:process>
</bpmn:definitions>`;
    const a = analyseImport(base, parseBpmn(xml).doc!);
    expect(a.tasks.find((t) => t.id === 'T1')!.roles).toEqual(['Developer']);
    expect(a.units.map((u) => u.kind)).toEqual(['process']);
  });
});
