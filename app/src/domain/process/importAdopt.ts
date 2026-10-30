/** @calc-zone process-model */
import { NS, type XAttr, type XElement, type XNode } from './xml';

/**
 * Elements moved from an imported file into the case's document (F-B11, phase B5b) written with the case's prefixes: a file may write BPMN with
 * another prefix (`semantic:`) or as its default namespace (Signavio); vendor namespaces it declared on its root are declared on the case's root
 * (under the file's prefix, or a numbered one when the case uses that prefix for another namespace). Reference values written as QNames to the
 * file's own ids lose their prefix (the case does not declare the file's target namespace), and `xsi:type` values follow the BPMN prefix.
 */
export interface Adopter { adopt: (e: XElement) => XElement; declarations: () => XAttr[] }

const declsOf = (root: XElement): Map<string, string> =>
  new Map(root.attrs.filter((a) => a.ns === NS.xmlns).map((a) => [a.name === 'xmlns' ? '' : a.name.slice(6), a.value]));
const QNAME = /^[A-Za-z_][\w.-]*:[A-Za-z_][\w.-]*$/;
const REFS = new Set(['messageRef', 'errorRef', 'escalationRef', 'signalRef', 'dataStoreRef', 'dataObjectRef', 'itemSubjectRef', 'calledElement',
  'processRef', 'sourceRef', 'targetRef', 'attachedToRef', 'operationRef', 'parameterRef', 'partitionElementRef', 'categoryValueRef']);

export function adopter(fileRoot: XElement, caseRoot: XElement, fileIds: ReadonlySet<string>): Adopter {
  const fileNs = declsOf(fileRoot), caseNs = declsOf(caseRoot), added = new Map<string, string>(), out: XAttr[] = [];
  const caseUri = new Map([...caseNs].map(([p, u]) => [u, p]));
  const prefixFor = (uri: string, wanted: string): string => {
    const have = caseUri.get(uri) ?? added.get(uri);
    if (have !== undefined && have !== '') return have;
    let p = wanted || 'ns', n = 1;
    while (caseNs.has(p) || [...added.values()].includes(p)) p = `${wanted || 'ns'}${n++}`;
    added.set(uri, p);
    out.push({ name: `xmlns:${p}`, ns: NS.xmlns, value: uri });
    return p;
  };
  const filePrefixOf = (uri: string): string => [...fileNs].find(([, u]) => u === uri)?.[0] ?? '';
  const qname = (v: string): string => {
    const i = v.indexOf(':');
    if (i < 0) return v;
    const uri = fileNs.get(v.slice(0, i));
    return uri ? `${prefixFor(uri, v.slice(0, i))}:${v.slice(i + 1)}` : v;
  };
  const attrOf = (a: XAttr): XAttr => {
    if (a.ns === NS.xmlns) return a;
    let { name, value } = a;
    if (a.ns) name = `${prefixFor(a.ns, name.slice(0, Math.max(0, name.indexOf(':'))))}:${name.slice(name.indexOf(':') + 1)}`;
    if (!a.ns && REFS.has(a.name) && value.includes(':') && fileIds.has(value.slice(value.indexOf(':') + 1))) value = value.slice(value.indexOf(':') + 1);
    // any other QName value (`structureRef="xsd:string"`, `xsi:type`) keeps its namespace under the case's prefix for it
    else if (QNAME.test(value) && fileNs.has(value.slice(0, value.indexOf(':')))) value = qname(value);
    return { ...a, name, value };
  };
  const adopt = (e: XElement): XElement => {
    const children: XNode[] = e.children.map((c) => {
      if (c.kind !== 'element') return c;
      // a reference written as the text of a child (`<sourceRef>tns:A1</sourceRef>`)
      if (REFS.has(c.local) || c.local.endsWith('Ref')) {
        return adopt({ ...c,
          children: c.children.map((t) => (t.kind === 'text' && t.text.includes(':') && fileIds.has(t.text.slice(t.text.indexOf(':') + 1).trim())
          ? { ...t, text: t.text.slice(t.text.indexOf(':') + 1) } : t)) });
      }
      return adopt(c);
    });
    return { ...e, prefix: prefixFor(e.ns, e.prefix || filePrefixOf(e.ns)), attrs: e.attrs.map(attrOf), children };
  };
  return { adopt, declarations: () => out.slice() };
}
