import { legacyJson, legacyMoney } from './deviations';
import { readdirSync, readFileSync } from 'node:fs';
import { makeCtx } from '@/domain';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';

/** Every oracle fixture the legacy present / defend / configure extras were recorded for. */
export const PDC_FIXTURES = readdirSync('fixtures/extras/pdc_story').map((f) => f.replace('.json', '')).sort();
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as unknown;
export const caseOf = (id: string) => fromSnapshot(json(`fixtures/cases/${id}.json`) as never);
export const ctxOf = (id: string) => makeCtx(caseOf(id));
/** A legacy pdc extra (tools/oracle-extras.d/pdc.mjs) for a fixture. */
export const pdc = <T = unknown>(name: string, id: string): T => legacyJson(json(`fixtures/extras/${name}/${id}.json`) as T);
/** Install the oracle case `id` as the application store. */
export function loadCase(id: string) { const s = createAppStore(caseOf(id)); setAppStore(s); return s; }
/** Whitespace-free text, to compare tabular legacy text with rendered text. */
export const sq = (s: string): string => legacyMoney(s.replace(/\s+/g, ''));
