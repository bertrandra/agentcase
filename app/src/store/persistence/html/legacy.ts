/** @calc-zone exports */
import { SnapshotError } from '../snapshot';

/** The restore script a v18.x "Save HTML snapshot" bakes at the end of the file: <script …>try{ applySnapshotState({…}); }catch(e){…}</script>. */
const LEGACY_SCRIPT = /<script\b[^>]*>\s*try\{\s*applySnapshotState\(\s*(?=\{)/g;
/** What must follow the object literal: the end of the call and the catch clause. Anything else is rejected. */
const TAIL = /^\s*\)\s*;?\s*\}\s*catch\s*\(/;

/** Index just after the "}" that closes the object literal starting at `start` (strings and escapes are skipped). Throws when unbalanced. */
export function scanObject(s: string, start: number): number {
  let depth = 0, inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
  }
  throw new SnapshotError('The snapshot in this file is truncated');
}

/**
 * The state object of a legacy HTML snapshot, WITHOUT running anything: locate the restore script, scan the balanced object literal
 * after `applySnapshotState(`, JSON.parse it and check the call ends as the legacy wrote it. Stacked scripts: the last one wins, as it did on load.
 */
export function extractLegacyState(html: string): unknown {
  let at = -1;
  for (const m of html.matchAll(LEGACY_SCRIPT)) at = m.index + m[0].length;
  if (at < 0) throw new SnapshotError('No AgentCase snapshot found in this HTML file');
  const end = scanObject(html, at);
  if (!TAIL.test(html.slice(end, end + 64))) throw new SnapshotError('The restore script in this file is not a plain snapshot');
  try { return JSON.parse(html.slice(at, end)); } catch { throw new SnapshotError('The snapshot in this file is not valid JSON'); }
}

/** The state embedded by this build (<script type="application/json" id="agentcase-snapshot">), or undefined. Last occurrence wins. */
export function extractEmbeddedState(html: string): unknown {
  let json: string | undefined;
  for (const m of html.matchAll(/<script\b(?=[^>]*\bid="agentcase-snapshot")[^>]*>([\s\S]*?)<\/script>/g)) json = m[1];
  if (json === undefined) return undefined;
  try { return JSON.parse(json); } catch { throw new SnapshotError('The embedded snapshot is not valid JSON'); }
}

export type CaseFileKind = 'json' | 'html' | 'legacy-html';

/** Any file the user can open as a case: a JSON snapshot, an HTML copy saved by this build, or a v18.x HTML snapshot. */
export function parseCaseFile(text: string): { kind: CaseFileKind; raw: unknown } {
  if (text.trimStart().startsWith('{')) {
    try { return { kind: 'json', raw: JSON.parse(text) }; } catch { throw new SnapshotError('The file is not valid JSON'); }
  }
  const embedded = extractEmbeddedState(text);
  if (embedded !== undefined) return { kind: 'html', raw: embedded };
  return { kind: 'legacy-html', raw: extractLegacyState(text) };
}
