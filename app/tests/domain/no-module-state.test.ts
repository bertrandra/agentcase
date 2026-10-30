import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Lot 5a guard (docs/ARCHITECTURE.md §3 "No module state in domain"): a domain function's result depends on its arguments only. So `src/domain` holds no
 * module-level `let` / `var` (a "current theme" set by one caller and read by another is exactly what this forbids), and a module-level container that can
 * be filled (`new Map / WeakMap / Set / WeakSet`) is a memo cache keyed by its input, listed here with its reason. Neither domain nor store imports the
 * UI theme runtime (the React context, the provider): the theme in effect is passed in.
 */
const SRC = join(process.cwd(), 'src');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : []; });
const rel = (f: string) => relative(SRC, f).replace(/\\/g, '/');

/** `file:name` → why this module-level container is not state: a memo keyed by an immutable input (same input, same output) or a constant lookup. */
const ALLOWED: Record<string, string> = {
  'domain/canonical.ts:engines': 'memo: the engine of a Ctx (WeakMap keyed by the immutable context)',
  'domain/model/overlay.ts:cache': 'memo: the model result of a Ctx',
  'domain/tuneB/tokens.ts:memo': 'memo: the token usage of a Ctx',
  'domain/pdc/vars/engine.ts:fallback': 'memo: the Monte Carlo fallback per seed (deterministic for a seed)',
  'domain/pdc/variables.ts:rank': 'constant lookup built once from ORDER (never written after)',
  'domain/snapshots/library.ts:sizes': 'memo: the serialised size of a snapshot object',
  'domain/portfolio/run.ts:runs': 'memo: the product run of a case state',
  'domain/portfolio/costModelRow.ts:SUMMED': 'constant lookup (never written after)',
  'domain/portfolio/core.ts:roots': 'memo: the core portfolio of a portfolio object',
  'domain/portfolio/timeline.ts:schedules': 'memo: the wave schedule (effective starts) of a portfolio object',
  'domain/portfolio/consolidate.ts:rates': 'memo: the discount rate of a common case',
  'domain/portfolio/consolidate.ts:memo': 'memo: the consolidation of a portfolio',
  'domain/portfolio/memo.ts:ctxs': 'memo: the Ctx of a case state',
  'domain/portfolio/aggVerdictStrategies.ts:cache': 'memo: the strategy pick of a product run',
  'domain/portfolio/aggPresentPlayback.ts:cache': 'memo: the playback series of a product run',
  'domain/portfolio/series.ts:cache': 'memo: the series of a consolidation object',
  'domain/portfolio/aggScenarios.ts:runsMemo': 'memo: the six scenario engines of a product run',
  'domain/portfolio/aggScenarios.ts:memo': 'memo: the portfolio scenarios of a consolidation and a selection',
  'domain/portfolio/aggSensitivity.ts:runsMemo': 'memo: the moved cases (tornado drivers) of a product run for a step',
  'domain/portfolio/aggSensitivity.ts:memo': 'memo: the portfolio sensitivity of a consolidation, a selection and a step',
  'domain/portfolio/portfolioGantt.ts:ramps': 'memo: the ramp end and milestones of a product run',
  'domain/portfolio/portfolioGantt.ts:memo': 'memo: the Gantt of a consolidation',
  'domain/portfolio/keys.ts:TOP': 'constant lookup (never written after)',
  'domain/portfolio/portfolioHeadline.ts:memo': 'memo: the headline of a portfolio object',
  'domain/portfolio/stressFingerprint.ts:own': 'memo: the stress fingerprint of an object',
  'domain/portfolio/selectionView.ts:cache': 'memo: the selection views of a consolidation',
  'domain/portfolio/knowledge.ts:hubs': 'memo: the hub view of a Ctx',
  'domain/portfolio/aggPresentCommercial.ts:cache': 'memo: the commercial row of a product run',
  'domain/portfolio/resolve.ts:roots': 'memo: the resolved root of a portfolio object',
  'domain/portfolio/sharedTeam.ts:roots': 'memo: the effective team of a product (own team plus its shares of the shared lines)',
  'domain/portfolio/resolve.ts:commons': 'memo: the common case of a portfolio object',
  'domain/stress/fingerprint.ts:EXCLUDED': 'constant lookup (never written after)',
  'domain/time/spline.ts:prepared': 'memo: the prepared spline of a knot object',
  'domain/process/defaultProcess.ts:built': 'memo: the catalogue process of a catalogue object (built once per catalogue)',
  'domain/process/read.ts:memo': 'memo: the typed views of a process document (keyed by the immutable node tree)',
  'domain/process/drawing.ts:memo': 'memo: what the Process section draws of a process document (keyed by the immutable node tree)',
  'domain/process/views.ts:memo': 'memo: the engine views of a process document (keyed by the immutable node tree)',
  'domain/process/scope.ts:legacy': 'memo: the scope keys of a version 2 case object handed to the engine (keyed by the immutable object)',
  'domain/process/scope.ts:catalogueValues': 'memo: the catalogue parameters of each activity (keyed by the catalogue process)',
  'domain/process/scope.ts:caseDocs': 'memo: the document of version 2 scope keys (pure function of their JSON, bounded to 64 entries)',
  'domain/process/xmlWrite.ts:texts': 'memo: the XML text of a process document (keyed by the immutable node tree)',
  'domain/process/exportPortfolio.ts:REF_ATTRS': 'constant lookup: the attribute names that reference an id (never written)',
  'domain/process/readPhases.ts:NONE': 'constant lookup: the empty BPSim value map (never written)',
  'domain/process/security.ts:RESERVED_IDS': 'constant lookup: the reserved ids of the F-B10 rule table (ReadonlySet, never written)',
  'domain/time/fit.ts:cache': 'fit cache: the S-curve fit of a key built from its inputs (pure, bounded by the inputs a session uses)',
};

interface Hit { where: string; kind: 'let' | 'container' }
function moduleState(file: string): Hit[] {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true), out: Hit[] = [];
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const flags = st.declarationList.flags, mutable = !(flags & ts.NodeFlags.Const);
    for (const d of st.declarationList.declarations) {
      const name = d.name.getText(sf), where = `${rel(file)}:${name}`;
      if (mutable) out.push({ where, kind: 'let' });
      else if (d.initializer && ts.isNewExpression(d.initializer) &&
        /^(Weak)?(Map|Set)$/.test(d.initializer.expression.getText(sf))) out.push({ where, kind: 'container' });
    }
  }
  return out;
}

describe('no module state in domain (lot 5a)', () => {
  const hits = walk(join(SRC, 'domain')).flatMap(moduleState);
  it('no module-level let / var in src/domain', () => {
    expect(hits.filter((h) => h.kind === 'let').map((h) => h.where)).toEqual([]);
  });
  it('every module-level Map / WeakMap / Set / WeakSet is an allowed memo cache or constant lookup (with its reason)', () => {
    expect(hits.filter((h) => h.kind === 'container' && !ALLOWED[h.where]).map((h) => h.where)).toEqual([]);
    expect(Object.keys(ALLOWED).filter((k) => !hits.some((h) => h.where === k)), 'stale allowlist entries').toEqual([]);
  });
  it('domain and store never import the UI theme runtime (the context, the provider, the display store)', () => {
    const bad = [...walk(join(SRC, 'domain')), ...walk(join(SRC, 'store'))].filter((f) =>
      /from '[^']*(ui\/themeContext|brand\/ThemeRuntime|display\/store|\/ui\/)[^']*'/.test(readFileSync(f, 'utf8')));
    expect(bad.map(rel)).toEqual([]);
  });
  it('the theme module exports no setter of a global theme', async () => {
    const theme = await import('@/domain/theme') as Record<string, unknown>;
    expect(Object.keys(theme).filter((k) => /^(set|tok$|printTok$|themedList$|baseTheme$)/.test(k))).toEqual([]);
  });
});
