import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO } from '../helpers/bpmnValidate';

/**
 * Phase B7b: the official OMG schemas of DMN 1.3 and CMMN 1.1 sit unchanged under docs/bpmn/omg/dmn13/ and cmmn11/, byte-identical to the SHA-256
 * recorded in SOURCES.md (same rule as the BPMN schemas of B0), and the validation entry points import them.
 */
const omg = join(REPO, 'docs', 'bpmn', 'omg');
const rows = [...readFileSync(join(omg, 'SOURCES.md'), 'utf8').matchAll(/^\| `((?:dmn13|cmmn11)\/[\w.-]+\.xsd)` \| (https:\/\/\S+) \| `([0-9a-f]{64})` \|$/gm)];

describe('BPMN B7b — DMN 1.3 and CMMN 1.1 schemas', () => {
  it('every file of dmn13/ and cmmn11/ is listed once, from the OMG site, with its SHA-256', () => {
    const files = ['dmn13', 'cmmn11'].flatMap((d) => readdirSync(join(omg, d)).map((f) => `${d}/${f}`)).sort();
    expect(rows.map((r) => r[1]).sort()).toEqual(files);
    expect(files.length).toBe(9);
    for (const [, file, url, sha] of rows) {
      expect(url, file).toMatch(/^https:\/\/www\.omg\.org\/spec\/(DMN\/(20191111|20180521)|CMMN\/20151109)\/[\w]+\.xsd$/);
      expect(url?.endsWith(`/${file?.split('/')[1] ?? ''}`), file).toBe(true);
      expect(createHash('sha256').update(readFileSync(join(omg, file ?? ''))).digest('hex'), file).toBe(sha);
    }
  });
  it('the validation entry points import them', () => {
    const xsd = (f: string): string => readFileSync(join(REPO, 'docs', 'bpmn', f), 'utf8');
    expect(xsd('agentcase-bpmn-validate.xsd')).toContain('schemaLocation="omg/dmn13/DMN13.xsd"');
    expect(xsd('agentcase-dmn-validate.xsd')).toContain('schemaLocation="omg/dmn13/DMN13.xsd"');
    expect(xsd('agentcase-cmmn-validate.xsd')).toContain('schemaLocation="omg/cmmn11/CMMN11.xsd"');
  });
});
