/** @calc-zone exports */
import type { XDocument } from '@/domain/process';
import { parseBpmn } from '../../bpmn/read';
import { ParamsImportError } from '../params/safe';
import { PF_SHEETS } from './names';

/**
 * A product's process document override read back from its XML text (Overrides sheet, key `BPMN`, B5): the BPMN reader's F-B10 checks first, any
 * problem refuses the whole workbook (nothing is written).
 */
export function processOverride(text: string, productId: string): XDocument {
  const r = parseBpmn(text);
  if (!r.doc) throw new ParamsImportError(`${PF_SHEETS.overrides}: the process of product "${productId}" is not a readable BPMN document (${
    r.errors[0]?.message ?? 'unknown error'})`);
  return r.doc;
}
