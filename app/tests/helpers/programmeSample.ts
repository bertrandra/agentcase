import { makeCtx } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { serialize } from '@/domain/process';
import { programmeProcess } from '@/domain/programme';
import { programmeDocument } from '@/domain/programme/bpmn';
import { openPortfolioFixture } from './portfolioFixtures';

/**
 * The transformation-programme sample (`fixtures/bpmn/programme/programme-three-products.bpmn`, BPMN B9a): the programme-only export of the
 * three-product portfolio with a setup capacity of 2, so it carries every programme element of the extension XSD (waves, capacity).
 */
export function programmeSampleText(): string {
  const pf = { ...openPortfolioFixture(), maxConcurrentSetups: 2 }, id = pf.products[0]!.id;
  return serialize(programmeDocument(programmeProcess(makeCtx(resolveProduct(pf, id)), pf, id)));
}
