/** @calc-zone exports */
/** Id of the one script that carries the case inside a saved HTML copy of the application. */
export const SNAPSHOT_SCRIPT_ID = 'agentcase-snapshot';

/** JSON that is safe inside a <script> element: "<" (so "</script>" and "<!--" cannot occur) and the JS line separators are escaped. */
export const escapeJsonForScript = (json: string): string =>
  json.replace(/[<\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

/** True for a script element that an earlier save embedded (new format or the legacy `try{ applySnapshotState(…) }` one). */
const isSnapshotScript = (s: Element): boolean =>
  s.id === SNAPSHOT_SCRIPT_ID || s.hasAttribute('data-agentcase-snapshot') || /^\s*try\{\s*applySnapshotState\(/.test(s.textContent ?? '');

/**
 * A copy of the running application with the case embedded. The React tree is not serialised: `#root` is emptied (the app
 * rebuilds it on load), transient nodes are dropped, and any snapshot script of an earlier save is replaced — never stacked.
 */
export function buildSnapshotHtml(documentElement: Element, snapshot: unknown): string {
  const clone = documentElement.cloneNode(true) as Element, doc = documentElement.ownerDocument;
  clone.querySelectorAll('script').forEach((s) => { if (isSnapshotScript(s)) s.remove(); });
  clone.querySelectorAll('iframe, [data-transient]').forEach((n) => n.remove());
  const root = clone.querySelector('#root');
  while (root?.firstChild) root.removeChild(root.firstChild);
  const script = doc.createElement('script');
  script.setAttribute('type', 'application/json');
  script.id = SNAPSHOT_SCRIPT_ID;
  script.textContent = escapeJsonForScript(JSON.stringify(snapshot));
  (clone.querySelector('body') ?? clone).appendChild(script);
  return '<!DOCTYPE html>\n' + clone.outerHTML;
}

/** Legacy stamp: 2026-10-21-15-55-00 (UTC). */
export const fileStamp = (d: Date): string => d.toISOString().slice(0, 19).replace(/[:T]/g, '-');

/** AgentCase_<customer>_<vTag>_Snapshot_<stamp>.html — the customer part only when a name is set (legacy saveHtmlSnapshot). */
export function snapshotFileName(customer: unknown, verFileTag: string, now: Date): string {
  const cust = typeof customer === 'string' && customer.trim() ? customer.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' : '';
  return `AgentCase_${cust}${verFileTag ? verFileTag + '_' : ''}Snapshot_${fileStamp(now)}.html`;
}
