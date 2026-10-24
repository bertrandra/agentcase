import axe from 'axe-core';

/**
 * axe-core in jsdom for the unit tests (colour contrast needs a real browser: tools/a11y.mjs covers it). One line per violation, so `toEqual([])` prints them.
 *
 * Two things make it cheap and robust under a loaded test run:
 * - `resultTypes: ['violations']`: axe builds a unique CSS selector for every node it reports. On a large container (the dependency graph: ~500 SVG siblings,
 *   the matrix: ~2,900 cells) the `:nth-child` part walks the siblings through jsdom's slow `HTMLCollection` proxy for every passing node, which was ~80% of the
 *   run (1.8 s of 2.1 s on the graph tab). Passes, incomplete and inapplicable are not read by any test, so only the violations get their full node details.
 * - Runs are chained: axe refuses to start while a previous run is going, so one slow audit used to fail every later audit of the file ("Axe is already running").
 */
let last: Promise<unknown> = Promise.resolve();

export async function axeViolations(context: Element | null, { region = true }: { region?: boolean } = {}): Promise<string[]> {
  if (!context) throw new Error('axeViolations: nothing to audit (the element was not found)');
  const rules = { 'color-contrast': { enabled: false }, ...(region ? {} : { region: { enabled: false } }) };
  const run = last.catch(() => undefined).then(() => axe.run(context as HTMLElement, { resultTypes: ['violations'], rules }));
  last = run;
  const r = await run;
  return r.violations.map((v) => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)).join(' | ')}`);
}
