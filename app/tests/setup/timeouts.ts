import { expect, vi } from 'vitest';

/**
 * SPEC_FIXES FX-40: test timeouts by weight. The default 5 s stays for the plain domain tests (a slow one there is a regression worth seeing); the
 * heavy areas — the store and its persistence, the UI, the BPMN files, the portfolio and the whole-graph checks — run several fixtures or render
 * whole sections per test (1.5–5 s on an idle machine, measured) and get 30 s, so a loaded machine (an agent run, a busy CI runner) does not turn
 * them into timeouts. A test that needs more still sets its own `{ timeout }`.
 */
export const HEAVY: readonly RegExp[] = [
  /\/tests\/(store|ui|bpmn)\//, /\/tests\/domain\/portfolio\//,
  /\/tests\/domain\/(affected-tests|deps-fresh|theme-palette-contrast|process\/edit)\.test\.ts$/,
];
/** 30 s, or more when a runner asks for more (`AC_TEST_TIMEOUT`, e.g. `validate:affected`'s 90 s): this setup only ever raises a limit. */
export const HEAVY_TIMEOUT = Math.max(30_000, Number(process.env.AC_TEST_TIMEOUT) || 0);

const path = (expect.getState().testPath ?? '').replace(/\\/g, '/');
if (HEAVY.some((r) => r.test(path))) vi.setConfig({ testTimeout: HEAVY_TIMEOUT });
