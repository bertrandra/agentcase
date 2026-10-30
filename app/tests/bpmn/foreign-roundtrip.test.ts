// @vitest-environment jsdom
/**
 * BPMN B2 pass-through (F-B11, F-B12; spec § 11 item 4): parse → write of the sample files, the foreign imitations (bpmn.io / Camunda 7,
 * Camunda 8 / Zeebe, Signavio, OMG plain) and the AgentCase profile samples, keeps every element, attribute, namespace declaration, comment and
 * vendor extension. Compared as canonical XML (W3C C14N by xmllint, an independent canonicaliser) and as infoset; byte-identical where the
 * input is already in the writer's canonical form, and always on the second pass.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { serialize, type XElement, type XNode } from '@/domain/process';
import { BPMN_FIXTURES, schemaTestsRun } from '../helpers/bpmnValidate';
import { parsed } from '../helpers/bpmnRoundTrip';

const SAMPLES = readdirSync(BPMN_FIXTURES).filter((f) => f.endsWith('.bpmn')).sort();
const read = (f: string) => readFileSync(join(BPMN_FIXTURES, f), 'utf8');
/** Files already written in the writer's canonical form (double quotes, no space before `/>`, references as written). */
const CANONICAL = ['foreign-signavio.bpmn'];

/** Every element (qualified name + namespace) and every attribute (name = value) of the input, by a scan independent of the reader. */
function inventory(e: XElement, out: string[] = []): string[] {
  out.push(`<${e.prefix}:${e.local} ${e.ns}`, ...e.attrs.map((a) => `@${a.name}=${a.value}`));
  for (const c of e.children) if (c.kind === 'element') inventory(c, out);
  return out;
}
const comments = (n: XNode): number => (n.kind === 'comment' ? 1 : n.kind === 'element' ? n.children.reduce((s, c) => s + comments(c), 0) : 0);
const c14n = (file: string) => spawnSync('xmllint', ['--nonet', '--c14n', file], { encoding: 'utf8' });

describe('B2 pass-through: parse → write keeps every sample file', () => {
  it.each(SAMPLES)('%s: second pass byte-identical, same infoset, namespaces and vendor extensions kept', (f) => {
    const text = read(f), d = parsed(text), out = serialize(d), again = parsed(out);
    expect(serialize(again) === out, 'write(parse(write(parse(x)))) == write(parse(x))').toBe(true);
    expect(again).toEqual(d);
    expect(inventory(again.root)).toEqual(inventory(d.root));
    const count = (s: string) => s.split('<!--').length - 1;
    expect(comments(d.root), 'comments kept').toBe(count(text) - count(d.before + d.after));
    const decls = [...text.matchAll(/xmlns(?::[\w.-]+)?="[^"]*"/g)].map((m) => m[0]);
    expect(decls.filter((x) => !out.includes(x))).toEqual([]);
    for (const vendor of ['camunda:', 'zeebe:', 'signavio:', 'modeler:', 'bioc:', 'color:', 'ac:']) {
      expect(out.split(vendor).length, vendor).toBe(text.split(vendor).length);
    }
    if (CANONICAL.includes(f)) expect(out === text, 'byte-identical: the input is in canonical form').toBe(true);
  });
});

/** A foreign file with what the samples lack: comments around and inside the root, CDATA, character references, single quotes, `>` in text. */
const QUIRKS = read('foreign-camunda7-bpmnio.bpmn').replace('<bpmn:definitions', '<!-- exported by a tool -->\n<bpmn:definitions')
  .replace('</bpmn:definitions>', '<!-- inner -->\n</bpmn:definitions>\n<!-- trailing -->')
  .replace('<bpmn:process ', "<bpmn:process x:note='single &amp; quoted' xmlns:x='https://example.org/x' ")
  .replace('</bpmn:collaboration>', '<bpmn:documentation><![CDATA[a <b> & c]]> &#65;&#x42; d > e</bpmn:documentation>\n</bpmn:collaboration>');

describe('B2 pass-through: comments, CDATA, references and quotes', () => {
  it('the infoset is kept: comments in place, CDATA and references as text, the canonical writer output is stable', () => {
    const d = parsed(QUIRKS), out = serialize(d);
    expect([d.before, d.after]).toEqual(['\n<!-- exported by a tool -->\n', '\n<!-- trailing -->\n']);
    expect(comments(d.root)).toBe(1);
    expect(out).toContain('<bpmn:documentation>a &lt;b&gt; &amp; c AB d &gt; e</bpmn:documentation>');
    expect(out).toContain('x:note="single &amp; quoted" xmlns:x="https://example.org/x"');
    expect(serialize(parsed(out)) === out).toBe(true);
  });
});

describe.skipIf(!schemaTestsRun())('B2 pass-through: canonical XML (xmllint --c14n) of input and output are identical', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b2-c14n-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it.each([...SAMPLES, 'quirks'])('%s', (f) => {
    const out = join(dir, `${f}.out`), input = f === 'quirks' ? join(dir, f) : join(BPMN_FIXTURES, f);
    if (f === 'quirks') writeFileSync(input, QUIRKS);
    writeFileSync(out, serialize(parsed(readFileSync(input, 'utf8'))));
    const a = c14n(input), b = c14n(out);
    expect([a.status, b.status]).toEqual([0, 0]);
    expect(b.stdout === a.stdout).toBe(true);
  });
});
