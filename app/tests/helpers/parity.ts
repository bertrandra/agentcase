import { existsSync, readFileSync } from 'node:fs';

/** Numbers shown in a text: €1 704K, €1,204,000, 75%, 13.0 … (ids like Y3, A017, v18.9 and bare digits < 10 are skipped). */
export function numberTokens(raw: string): number[] {
  // DEV-NEG-MONEY: every negative amount reads as "-€x" for the comparison, whichever way it is printed ("−€x", "-€x", "€-x", "(€x)").
  const text = raw.replace(/\u2212/g, '-').replace(/-\s?€/g, '€-').replace(/\(\s?€\s?(\d[\d.,\u00a0\u202f ]*[KkMm]?)\s?\)/g, '€-$1');
  const out: number[] = [];
  const re = /(?<![A-Za-z0-9.])(-?\d{1,3}(?:[ \u00a0\u202f,]\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?)\s?([KkMm](?![A-Za-z]))?/g;
  for (const m of text.matchAll(re)) {
    const raw = (m[1] as string).replace(/[ \u00a0\u202f,]/g, '');
    let v = parseFloat(raw);
    if (isNaN(v)) continue;
    if (m[2]) v *= m[2].toLowerCase() === 'k' ? 1e3 : 1e6;
    if (Number.isInteger(v) && Math.abs(v) < 10 && !m[2]) continue;
    out.push(v);
  }
  return out;
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.006 * Math.abs(a), 0.51) ||
  (Math.abs(a) >= 1e3 && Math.abs(a - b) <= 1000.5 && String(Math.abs(a)).endsWith('000'));

/** Legacy figures that do not appear (within display rounding) in the rendered text. */
export function missingNumbers(legacy: string, rendered: string, ignore: number[] = []): number[] {
  const have = numberTokens(rendered), skip = new Set(ignore);
  const miss = [...new Set(numberTokens(legacy))].filter((v) => !skip.has(v) && !have.some((h) => close(v, h)));
  return miss;
}

/** Text the legacy section showed for a fixture (tools/section-text.mjs); null when it was not generated. */
export function legacySectionText(fixture: string, section: string): string | null {
  const p = `fixtures/sections/${fixture}/${section}.txt`;
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

/** Visible text of a rendered tree: text nodes and field values, separated by spaces (jsdom has no innerText). */
export function renderedText(root: Element): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 3) { parts.push(n.textContent ?? ''); return; }
    if (n.nodeType !== 1) return;
    const el = n as HTMLElement;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') parts.push((el as HTMLInputElement).value);
    el.childNodes.forEach(walk);
    parts.push(' ');
  };
  walk(root);
  return parts.join(' ');
}
