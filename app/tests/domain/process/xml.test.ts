import { describe, expect, it } from 'vitest';
import {
  attr, comment, doc, el, indent, kids, NS, serialize, serializeElement, text, textOf, withAttrs, withChildren, type XElement,
} from '@/domain/process';

/** The XML node tree (spec § 6.1, D-B1): an infoset that serialises back byte for byte, with namespace declarations and attribute order kept. */
describe('XML node tree', () => {
  it('writes elements, attributes in order, text, comments and empty elements; same tree, same bytes', () => {
    const t = el('bpmn:definitions', { 'xmlns:bpmn': NS.bpmn, 'xmlns:ac': NS.ac, id: 'D', 'ac:inScope': true }, [
      comment(' generated '), el('bpmn:process', { id: 'P', isExecutable: 'false' }), text('x'),
    ]);
    const out = '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:ac="https://agentcase.app/schema/bpmn/1.0" id="D" '
      + 'ac:inScope="true"><!-- generated --><bpmn:process id="P" isExecutable="false"/>x</bpmn:definitions>';
    expect(serializeElement(t)).toBe(out);
    expect(serialize(doc(t))).toBe(`<?xml version="1.0" encoding="UTF-8"?>\n${out}\n`);
    expect(serialize(doc(t))).toBe(serialize(doc(t)));
  });
  it('resolves namespaces from the prefix and keeps the prefix as written; unprefixed attributes have no namespace', () => {
    const e = el('ac:activity', { effort: 3, 'ac:x': 1 });
    expect([e.ns, e.local, e.prefix]).toEqual([NS.ac, 'activity', 'ac']);
    expect(e.attrs.map((a) => [a.name, a.ns])).toEqual([['effort', ''], ['ac:x', NS.ac]]);
    expect(el('bpmn:definitions', { 'xmlns:bpmn': NS.bpmn }).attrs[0]?.ns).toBe(NS.xmlns);
    expect(() => el('foo:bar')).toThrow(/unknown prefix/);
  });
  it('a foreign namespace and prefix built by hand round-trips unchanged', () => {
    const foreign: XElement = { kind: 'element', ns: 'http://camunda.org/schema/1.0/bpmn', local: 'properties', prefix: 'camunda',
      attrs: [{ name: 'xmlns:camunda', ns: NS.xmlns, value: 'http://camunda.org/schema/1.0/bpmn' }, { name: 'camunda:x', ns: 'u', value: 'y' }], children: [] };
    expect(serializeElement(foreign)).toBe('<camunda:properties xmlns:camunda="http://camunda.org/schema/1.0/bpmn" camunda:x="y"/>');
  });
  it('escapes markup in text and in attributes (quotes, tabs, line ends kept as references)', () => {
    const e = el('bpmn:documentation', { name: 'a "b" & <c>\t\n\r' }, [text('R&D <x> > y\r')]);
    expect(serializeElement(e))
      .toBe('<bpmn:documentation name="a &quot;b&quot; &amp; &lt;c&gt;&#9;&#10;&#13;">R&amp;D &lt;x&gt; &gt; y&#13;</bpmn:documentation>');
    expect(textOf(e)).toBe('R&D <x> > y\r');
  });
  it('leaves out null / undefined attributes; withAttrs sets in place, appends, removes, and keeps identity when nothing changes', () => {
    const e = el('bpmn:task', { id: 'A', name: null, x: undefined, y: 1 });
    expect(e.attrs.map((a) => a.name)).toEqual(['id', 'y']);
    expect(withAttrs(e, { y: 1 })).toBe(e);
    expect(withAttrs(e, { y: null }).attrs.map((a) => a.name)).toEqual(['id']);
    const f = withAttrs(e, { id: 'B', 'ac:inScope': false });
    expect(f.attrs.map((a) => `${a.name}=${a.value}`)).toEqual(['id=B', 'y=1', 'ac:inScope=false']);
    expect(e.attrs[0]?.value).toBe('A');
    expect(withChildren(e, e.children)).toBe(e);
  });
  it('indent adds white-space text between element children only, and is stable', () => {
    const t = el('bpmn:process', {}, [el('bpmn:task', { id: 'A' }, [el('bpmn:documentation', {}, [text('keep inline')])]), el('bpmn:endEvent')]);
    const pretty = indent(t);
    expect(serializeElement(pretty)).toBe('<bpmn:process>\n  <bpmn:task id="A">\n    <bpmn:documentation>keep inline</bpmn:documentation>\n  </bpmn:task>'
      + '\n  <bpmn:endEvent/>\n</bpmn:process>');
    expect(serializeElement(indent(pretty))).toBe(serializeElement(pretty));
    expect(kids(pretty, NS.bpmn).map((k) => attr(k, 'id') ?? k.local)).toEqual(['A', 'endEvent']);
  });
});
