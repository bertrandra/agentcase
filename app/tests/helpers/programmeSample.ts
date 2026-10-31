import { makeCtx } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { serialize, withProgrammeValues } from '@/domain/process';
import { programmeProcess } from '@/domain/programme';
import { programmeDocument } from '@/domain/programme/bpmn';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { openPortfolioFixture } from './portfolioFixtures';

/**
 * The transformation-programme sample (`fixtures/bpmn/programme/programme-three-products.bpmn`, BPMN B9a): the programme-only export of the
 * three-product portfolio with a setup capacity of 2, so it carries every programme element of the extension XSD (waves, capacity).
 */
export function programmeSampleText(): string {
  const pf = { ...openPortfolioFixture(), maxConcurrentSetups: 2 }, id = pf.products[0]!.id;
  return serialize(programmeDocument(programmeProcess(makeCtx(resolveProduct(pf, id)), pf, id)));
}

/**
 * The WBS-override sample (`fixtures/bpmn/programme/programme-wbs-override.bpmn`, BPMN B9d): the programme-only export of the portfolio
 * fixture's first product alone, with a WBS code entered for the pilot, so the export carries `ac:wbsCode` (§ 19.8 F-B74).
 */
export function programmeWbsSampleText(): string {
  const pf = openPortfolioFixture(), s = resolveProduct(pf, pf.products[0]!.id);
  return serialize(programmeDocument(programmeProcess(makeCtx({ ...s, dom: { ...s.dom, values: { ...s.dom.values, 'wbsCode-pilot': '1.2.1.9' } } }))));
}

/**
 * The stored-values sample (`fixtures/bpmn/programme/stored-values-agentcase.bpmn`, BPMN B9c): the minimal AgentCase sample as a case stores it
 * since schema v4, with the programme's values in `ac:programmeValues` (a parameter, an opt-in switch, a type, a description, a WBS override).
 */
export function storedValuesSampleText(minimal: string): string {
  return serialize(withProgrammeValues(parseBpmn(minimal).doc!, { pilotFte: '3', optHypercare: 'on', costProfile_tooling: 'one-off',
    activityDesc_pilot: 'Our pilot pod proves the factory.', 'wbsCode-pilot': '1.2.1.9' }));
}
