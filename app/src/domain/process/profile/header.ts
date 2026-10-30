/** @calc-zone process-model */
import { attr, el, kids, NS, withAttrs, withChildren, type XDocument, type XElement } from '../xml';
import { DEFINITIONS_RANK, fitted, insertChild } from './tree';

/**
 * The file header of an export (spec F-B61; phase B5b): `definitions` names its exporter (`exporter="AgentCase"`, `exporterVersion`), keeps a
 * stable `targetNamespace` and declares the `ac:` extension (`bpmn:extension definition="ac:process" mustUnderstand="false"`: tools may ignore
 * it); every process is a documentation model (`isExecutable="false"`, `processType="None"`). Idempotent: a document that has the header is
 * returned as is, so export → import → export stays byte-identical.
 */
export const TARGET_NAMESPACE = 'https://agentcase.app/process';
export interface Header { exporter?: string; exporterVersion?: string; targetNamespace?: string; extension: boolean; documentation: boolean }

/** The header a document carries (`documentation`: every process is non-executable with process type None). */
export function headerOf(defs: XElement): Header {
  const h: Header = { extension: kids(defs, NS.bpmn, 'extension').some((e) => /:process$/.test(attr(e, 'definition') ?? '')),
    documentation: kids(defs, NS.bpmn, 'process').every((p) => attr(p, 'isExecutable') === 'false' && attr(p, 'processType') === 'None') };
  for (const k of ['exporter', 'exporterVersion', 'targetNamespace'] as const) { const v = attr(defs, k); if (v !== undefined) h[k] = v; }
  return h;
}

/** The document with the AgentCase header (`version`: the application's). */
export function withHeader(d: XDocument, version: string): XDocument {
  let root = withAttrs(d.root, { exporter: 'AgentCase', exporterVersion: version, targetNamespace: attr(d.root, 'targetNamespace') ?? TARGET_NAMESPACE });
  const procs = (r: XElement): XElement => withChildren(r, r.children.map((c) => (c.kind === 'element' && c.ns === NS.bpmn && c.local === 'process'
    ? withAttrs(c, { isExecutable: 'false', processType: attr(c, 'processType') ?? 'None' }) : c)));
  root = procs(root);
  if (!headerOf(root).extension) {
    const ac = root.attrs.find((a) => a.ns === NS.xmlns && a.value === NS.ac)?.name.slice('xmlns:'.length) ?? 'ac';
    const ext = { ...el('bpmn:extension', { definition: `${ac}:process`, mustUnderstand: 'false' }), prefix: root.prefix };
    root = insertChild(root, fitted(root, ext), DEFINITIONS_RANK);
  }
  return root === d.root ? d : { ...d, root };
}
