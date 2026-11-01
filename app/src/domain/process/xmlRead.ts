/** @calc-zone process-model */
import type { XAttr, XDocument, XElement, XNode } from './xml';

/**
 * A DOM-free reader of the TRUSTED XML the app ships (SPEC_FIXES FX-02, decision D-B9: the default process `catalog/defaultProcess.bpmn` is the
 * one source of the catalogue). Elements, attributes, text, comments and namespaces (prefixes resolved like the browser's parser); the XML
 * declaration and the text around the root kept as written, so `serialize(readXml(t)) === t` for the shipped file. Not a reader for files a user
 * opens: those go through the hardened reader (`store/persistence/bpmn/read.ts`: checks, then DOMParser). Throws on text it does not expect.
 */
const XMLNS = 'http://www.w3.org/2000/xmlns/', XML = 'http://www.w3.org/XML/1998/namespace';
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s: string): string => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => (e[0] === '#'
  ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] ?? m));
const ATTR = /\s*([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/y;

export function readXml(text: string): XDocument {
  const decl = /^\uFEFF?(<\?xml[^?]*\?>)?/.exec(text)!;
  let at = decl[0].length;
  while (text.startsWith('<!--', text.indexOf('<', at)) && /^\s*$/.test(text.slice(at, text.indexOf('<', at)))) at = text.indexOf('-->', at) + 3;
  const rootAt = text.indexOf('<', at), before = text.slice(decl[0].length, rootAt);
  let i = rootAt;
  const fail = (why: string): never => { throw new Error(`readXml: ${why} at ${i}`); };
  function element(scope: ReadonlyMap<string, string>): XElement {
    const m = /<([^\s/>]+)/y; m.lastIndex = i;
    const name = m.exec(text)?.[1] ?? fail('element expected');
    i = m.lastIndex;
    const raw: [string, string][] = [];
    for (;;) {
      ATTR.lastIndex = i;
      const a = ATTR.exec(text);
      if (!a) break;
      raw.push([a[1]!, decode(a[3] ?? a[4] ?? '')]); i = ATTR.lastIndex;
    }
    const local = new Map(scope);
    for (const [n, v] of raw) if (n === 'xmlns') local.set('', v); else if (n.startsWith('xmlns:')) local.set(n.slice(6), v);
    const nsOf = (q: string, attr: boolean): string => {
      if (q === 'xmlns' || q.startsWith('xmlns:')) return XMLNS;
      const k = q.indexOf(':');
      if (k < 0) return attr ? '' : local.get('') ?? '';
      const p = q.slice(0, k);
      return p === 'xml' ? XML : local.get(p) ?? fail(`unknown prefix ${p}`);
    };
    const attrs: XAttr[] = raw.map(([n, value]) => ({ name: n, ns: nsOf(n, true), value }));
    const k = name.indexOf(':');
    const head = { kind: 'element' as const, ns: nsOf(name, false), local: k < 0 ? name : name.slice(k + 1), prefix: k < 0 ? '' : name.slice(0, k), attrs };
    while (/\s/.test(text.charAt(i))) i++;
    if (text.startsWith('/>', i)) { i += 2; return { ...head, children: [] }; }
    if (text.charAt(i) !== '>') fail('> expected');
    i++;
    const children: XNode[] = [];
    for (;;) {
      if (text.startsWith('</', i)) {
        const close = text.indexOf('>', i);
        if (text.slice(i + 2, close).trim() !== name) fail(`</${name}> expected`);
        i = close + 1;
        return { ...head, children };
      }
      if (text.startsWith('<!--', i)) { const e = text.indexOf('-->', i); children.push({ kind: 'comment', text: text.slice(i + 4, e) }); i = e + 3; continue; }
      if (text.charAt(i) === '<') { children.push(element(local)); continue; }
      const e = text.indexOf('<', i);
      if (e < 0) fail('unclosed element');
      children.push({ kind: 'text', text: decode(text.slice(i, e)) });
      i = e;
    }
  }
  const root = element(new Map());
  return { kind: 'document', decl: decl[1] ?? null, before, root, after: text.slice(i) };
}
