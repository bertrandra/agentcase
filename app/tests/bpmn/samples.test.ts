/**
 * Phase B0 of docs/SPEC_BPMN.md (§ 5.3, § 11 items 3-4): the sample .bpmn files of fixtures/bpmn/ are valid BPMN 2.0.2 + DI against the
 * official OMG XSDs (docs/bpmn/omg/, hashes pinned in SOURCES.md) and the AgentCase extension XSD, and the extension is strict: an ac: name
 * the XSD does not declare, a value out of its type, an unknown attribute or an unresolved reference is refused.
 * The schema tests need xmllint (libxml2-utils). Locally they are skipped with a message when it is missing; in CI they always run.
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { BPMN_FIXTURES, codes, hasXmllint, REPO, schemaTestsRun, validate } from '../helpers/bpmnValidate';

const SAMPLES = readdirSync(BPMN_FIXTURES).filter((f) => f.endsWith('.bpmn')).sort();
const samplePath = (f: string) => join(BPMN_FIXTURES, f);
const MINIMAL = readFileSync(samplePath('minimal-agentcase.bpmn'), 'utf8');
const AC_XSD = readFileSync(join(REPO, 'docs', 'bpmn', 'agentcase-bpmn-1.0.xsd'), 'utf8');

if (!schemaTestsRun()) console.warn('BPMN schema tests SKIPPED: xmllint is not installed (Debian / Ubuntu: apt-get install libxml2-utils). CI runs them.');

describe('BPMN B0 — official OMG schemas', () => {
  it('docs/bpmn/omg/ holds the five OMG files, byte-identical to the SHA-256 recorded in SOURCES.md', () => {
    const omg = join(REPO, 'docs', 'bpmn', 'omg');
    const rows = [...readFileSync(join(omg, 'SOURCES.md'), 'utf8').matchAll(/^\| `([\w.]+\.xsd)` \| (https:\/\/www\.omg\.org\/\S+) \| `([0-9a-f]{64})` \|$/gm)];
    expect(rows.map((r) => r[1]).sort()).toEqual(['BPMN20.xsd', 'BPMNDI.xsd', 'DC.xsd', 'DI.xsd', 'Semantic.xsd']);
    for (const [, file, url, sha] of rows) {
      expect(url).toBe(`https://www.omg.org/spec/BPMN/20100501/${file}`);
      expect(createHash('sha256').update(readFileSync(join(omg, file ?? ''))).digest('hex'), file).toBe(sha);
    }
  });
});

describe('BPMN B0 — CI runs the XSD validation', () => {
  it('xmllint is installed wherever CI is set (D-B7), so the schema tests below never skip there', () => {
    if (process.env.CI) expect(hasXmllint()).toBe(true);
    else expect(schemaTestsRun()).toBe(hasXmllint());
  });
});

describe('BPMN B0 — the extension XSD', () => {
  const globals = (kind: string) => [...AC_XSD.matchAll(new RegExp(`^ {2}<xsd:${kind} name="(\\w+)"`, 'gm'))].map((m) => m[1] ?? '');
  it('declares the elements and attributes of the spec (§ 5.2, § 15, § 16, § 17)', () => {
    expect(globals('element').sort()).toEqual(['activity', 'actor', 'audit', 'auditHeader', 'frequency', 'handoffCost', 'norm', 'orgUnit',
      'phase', 'process', 'product', 'raci', 'rework', 'supervision', 'team', 'tool', 'toolCatalog', 'volume']);
    expect(globals('attribute').sort()).toEqual(['activityType', 'agent', 'decisionRef', 'gate', 'inScope', 'norm', 'partial', 'regulatory',
      'requiresState']);
  });
  it('every global element and attribute is used by at least one valid AgentCase sample', () => {
    const text = SAMPLES.filter((f) => f.endsWith('-agentcase.bpmn')).map((f) => readFileSync(samplePath(f), 'utf8')).join('\n');
    const unused = [...globals('element').map((n) => `<ac:${n}`), ...globals('attribute').map((n) => ` ac:${n}=`)].filter((n) => !text.includes(n));
    expect(unused).toEqual([]);
  });
});

describe('BPMN B0 — sample files', () => {
  it('are the AgentCase profile files and the hand-written foreign imitations, each described in the README', () => {
    expect(SAMPLES).toEqual(['extended-agentcase.bpmn', 'foreign-camunda7-bpmnio.bpmn', 'foreign-camunda8-zeebe.bpmn', 'foreign-omg-plain.bpmn',
      'foreign-signavio.bpmn', 'minimal-agentcase.bpmn']);
    const readme = readFileSync(join(BPMN_FIXTURES, 'README.md'), 'utf8');
    expect(SAMPLES.filter((f) => !readme.includes(f))).toEqual([]);
  });
});

describe.skipIf(!schemaTestsRun())('BPMN B0 — sample files validate (xmllint)', () => {
  it('every sample is valid BPMN 2.0.2 + DI + ac: (schema, profile, references), with no warning', () => {
    const { status, results } = validate(SAMPLES.map(samplePath));
    expect(results.map((r) => ({ file: r.file.split('/').pop(), schema: r.schema, errors: r.errors, warnings: r.warnings }))).toEqual(
      SAMPLES.map((file) => ({ file, schema: 'valid', errors: [], warnings: [] })));
    expect(status).toBe(0);
  }, 30000);
});

describe.skipIf(!schemaTestsRun())('BPMN B0 — the ac: extension is validated strictly (xmllint)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b0-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  /** One mutation of the minimal sample: [name, text to find, replacement, expected error codes]. */
  const MUTATIONS: [string, string, string, string[]][] = [
    ['percent out of range', '<ac:supervision human="30" agent="70"/>', '<ac:supervision human="130" agent="70"/>', ['schema']],
    ['unknown enum value', 'aiAuthority="Supervised autonomous"', 'aiAuthority="Fully autonomous"', ['schema']],
    ['required attribute missing', '<ac:rework probability="0.10" ', '<ac:rework ', ['schema']],
    ['unknown attribute on an ac: element', '<ac:phase code="V3"', '<ac:phase colour="red" code="V3"', ['schema']],
    ['unknown child of an ac: element', '<ac:line skill="Dev"', '<ac:member skill="Dev"', ['schema']],
    ['undeclared ac: element (lax would skip it)', '<ac:phase code="V4"', '<ac:stage code="V4"', ['ac-undeclared']],
    ['undeclared ac: attribute (lax would skip it)', 'ac:gate="true"', 'ac:gate="true" ac:priority="high"', ['ac-undeclared']],
    ['ac: attribute of the wrong type', 'ac:gate="true"', 'ac:gate="maybe"', ['schema']],
    ['unresolved RACI reference', 'responsible="role-dev" accountable="role-lead"', 'responsible="role-ghost" accountable="role-lead"', ['unresolved-ref']],
    ['unresolved ac:agent reference', 'ac:agent="agent-coding"', 'ac:agent="agent-ghost"', ['unresolved-ref']],
    ['unresolved sequence flow target', 'targetRef="A024"', 'targetRef="A999"', ['unresolved-ref']],
    ['BPMN content model', '<bpmn:extension definition="ac:process" mustUnderstand="false"/>', '<bpmn:extensionElements/>', ['schema']],
  ];
  it.each(MUTATIONS)('refuses: %s', (name, find, replace, expected) => {
    expect(MINIMAL.split(find).length, `"${find}" occurs once in the sample`).toBe(2);
    const file = join(dir, `${name.replace(/\W+/g, '-')}.bpmn`);
    writeFileSync(file, MINIMAL.replace(find, replace));
    const { status, results } = validate([file]);
    expect(codes(results[0])).toEqual(expected);
    expect(status).toBe(1);
  }, 15000);
  it('refuses a document whose root is an ac: element, even a declared one', () => {
    const file = join(dir, 'ac-root.bpmn');
    writeFileSync(file, '<?xml version="1.0" encoding="UTF-8"?>\n<ac:supervision xmlns:ac="https://agentcase.app/schema/bpmn/1.0" human="1" agent="2"/>\n');
    expect(codes(validate([file]).results[0])).toEqual(['not-bpmn']);
  });
});
