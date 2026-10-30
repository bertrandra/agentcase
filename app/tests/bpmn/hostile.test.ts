/**
 * Phase B0 of docs/SPEC_BPMN.md (F-B10, § 11 item 5): the hostile files of fixtures/bpmn/hostile/ are refused by the security checks of
 * tools/bpmn-validate.mjs (before any XML parser sees them) or, for markup in names, flagged. The security checks need no xmllint; the
 * schema pass (xmllint) is added when it is installed, and always in CI. Phase B2 runs the same files through the in-app reader.
 */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { codes, HOSTILE_FIXTURES, schemaTestsRun, validate } from '../helpers/bpmnValidate';

/** Every hostile file and the error codes it must raise (an empty list: schema-valid, but flagged by a markup warning). */
const EXPECTED: Record<string, string[]> = {
  'bad-id-duplicate.bpmn': ['duplicate-id'],
  'bad-id-reserved.bpmn': ['reserved-id'],
  'bad-id-syntax.bpmn': ['bad-id'],
  'bad-id-too-long.bpmn': ['bad-id'],
  'billion-laughs.bpmn': ['doctype', 'entity'],
  'deep-nesting.bpmn': ['too-deep'],
  'html-in-names.bpmn': [],
  'processing-instruction.bpmn': ['processing-instruction'],
  'xxe-external-entity.bpmn': ['doctype', 'entity'],
  'xxe-parameter-entity.bpmn': ['doctype', 'entity'],
};
const FILES = readdirSync(HOSTILE_FIXTURES).filter((f) => f.endsWith('.bpmn')).sort();
const name = (file: string) => file.split('/').pop() ?? '';

describe('BPMN B0 — hostile files (F-B10)', () => {
  it('every hostile file has an expectation, and every expectation a file', () => {
    expect(FILES).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const mode of [['--no-schema'], ...(schemaTestsRun() ? [[]] : [])]) {
    it(`each is refused with its codes, or flagged (${mode.length ? 'security checks only' : 'with the xmllint schema pass'})`, () => {
      const { status, results } = validate(FILES.map((f) => join(HOSTILE_FIXTURES, f)), mode);
      expect(Object.fromEntries(results.map((r) => [name(r.file), codes(r)]))).toEqual(EXPECTED);
      for (const r of results) expect(!r.ok || r.warnings.length > 0, name(r.file)).toBe(true);
      expect(status).toBe(1);
    }, 30000);
  }

  it.skipIf(!schemaTestsRun())('a refused file never reaches xmllint (no DTD, entity or processing instruction is ever parsed)', () => {
    const { results } = validate(FILES.map((f) => join(HOSTILE_FIXTURES, f)));
    expect(results).toHaveLength(FILES.length);
    expect(results.filter((r) => !r.ok).map((r) => r.schema)).toEqual(results.filter((r) => !r.ok).map(() => 'skipped'));
  }, 30000);

  it('markup in names and documentation is flagged, and refused with --strict', () => {
    const file = join(HOSTILE_FIXTURES, 'html-in-names.bpmn');
    const lax = validate([file], ['--no-schema']), strict = validate([file], ['--no-schema', '--strict']);
    expect(lax.results[0]?.warnings.map((w) => w.code)).toEqual(['markup-in-text', 'markup-in-text']);
    expect(lax.results[0]?.warnings[1]?.message).toContain('bpmn:task/@name');
    expect([lax.status, strict.status]).toEqual([0, 1]);
  });
});

describe('BPMN B0 — size and element-count limits (generated files)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b0-hostile-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const doc = (body: string) => '<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"'
    + ` id="defs" targetNamespace="https://example.org/hostile">\n<bpmn:process id="proc" isExecutable="false">\n${body}</bpmn:process>\n</bpmn:definitions>\n`;

  it('a file over 5 MB is refused without being read as XML', () => {
    const file = join(dir, 'too-large.bpmn');
    writeFileSync(file, doc(`<bpmn:documentation>${'x'.repeat(5 * 1024 * 1024)}</bpmn:documentation>\n`));
    expect(codes(validate([file], ['--no-schema']).results[0])).toEqual(['too-large']);
  });
  it('a file with more than 100,000 elements is refused, one at the limit is accepted (both under 5 MB)', () => {
    const tasks = (n: number) => Array.from({ length: n }, (_, i) => `<bpmn:task id="t${i}"/>\n`).join('');
    const over = join(dir, 'too-many.bpmn'), at = join(dir, 'at-limit.bpmn');
    writeFileSync(over, doc(tasks(100000 - 1)));   // + definitions + process = 100,001
    writeFileSync(at, doc(tasks(100000 - 2)));
    const { results } = validate([over, at], ['--no-schema']);
    expect(results.map(codes)).toEqual([['too-many-elements'], []]);
  });
  it('depth 64 is accepted, 65 refused', () => {
    const nest = (n: number) => `${'<bpmn:subProcess>'.repeat(n)}${'</bpmn:subProcess>'.repeat(n)}\n`;
    const ok = join(dir, 'depth-64.bpmn'), deep = join(dir, 'depth-65.bpmn');
    writeFileSync(ok, doc(nest(62)));   // definitions + process + 62 = 64
    writeFileSync(deep, doc(nest(63)));
    expect(validate([ok, deep], ['--no-schema']).results.map(codes)).toEqual([[], ['too-deep']]);
  });
});
