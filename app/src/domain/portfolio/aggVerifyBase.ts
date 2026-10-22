/** @calc-zone aggregate-views */
import { model } from '../model/overlay';
import type { Live } from '../verifyA/fteVfte';
import { calendarOf, type Calendar } from './calendar';
import { consolidate, type Consolidated } from './consolidate';
import type { Series } from './series';
import type { Portfolio } from './types';
import type { ProductView } from './waves';

/** The two selections of the aggregate view of the "verify" group: the whole Portfolio or one Wave. */
export type VScope = { kind: 'portfolio' } | { kind: 'wave'; id: string };

/** The planned products of a selection with their calendar series, plus what the selection leaves out. */
export interface VSel {
  c: Consolidated;
  scope: VScope;
  label: string;
  items: ProductView[];
  /** the selection's consolidated series (the portfolio's, or the wave's) */
  series: Series;
  cal: Calendar;
  waveName: (id: string) => string;
  excluded: { id: string; name: string; archived: boolean }[];
}

/** The planned products of a Portfolio / Wave selection; null for an unknown wave. Everything is read from `consolidate`. */
export function selectionOf(pf: Portfolio, scope: VScope): VSel | null {
  const c = consolidate(pf), cal = calendarOf(pf), waveName = (id: string) => pf.waves.find((w) => w.id === id)?.name ?? '';
  const left = (ids: string[]) => ids.map((id) => pf.products.find((p) => p.id === id)).flatMap((p) => (p ? [{ id: p.id, name: p.name, archived: !!p.archived }] : []));
  if (scope.kind === 'portfolio') return { c, scope, label: 'Portfolio', items: c.products, series: c.series, cal, waveName, excluded: left(c.excluded) };
  const w = c.waves.find((x) => x.id === scope.id), wave = pf.waves.find((x) => x.id === scope.id);
  if (!w || !wave) return null;
  const items = c.products.filter((v) => v.waveId === w.id);
  return { c, scope, label: w.name, items, series: w.series, cal, waveName, excluded: left(wave.productIds.filter((id) => !items.some((v) => v.id === id))) };
}

/** The live case of a planned product for the verify domain functions: its resolved case, model and Time Engine (all cached on the product run). */
export const liveOf = (v: ProductView): Live => ({ c: v.run.ctx, m: model(v.run.ctx), eng: v.run.engine });

/** Memoised `build(selection)` per consolidation, selection and optional argument (the year picked on a page). */
export function viewMemo<T, A = undefined>(build: (sel: VSel, pf: Portfolio, arg: A) => T): (pf: Portfolio, scope: VScope, arg?: A) => T | null {
  const cache = new WeakMap<Consolidated, Map<string, T>>();
  return (pf, scope, arg) => {
    const sel = selectionOf(pf, scope);
    if (!sel) return null;
    const key = `${scope.kind === 'wave' ? `wave:${scope.id}` : 'portfolio'}|${String(arg)}`;
    let m = cache.get(sel.c);
    if (!m) { m = new Map(); cache.set(sel.c, m); }
    if (!m.has(key)) m.set(key, build(sel, pf, arg as A));
    return m.get(key) as T;
  };
}

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** How the UI formats a cell of a roll-up table. */
export type CellKind = 'text' | 'int' | 'n1' | 'n2' | 'pct' | 'eur';
export interface VCol { key: string; header: string; title?: string; kind: CellKind }
export type Cell = number | string | null;
export interface VRow { id: string; name: string; wave: string; cells: Record<string, Cell> }
/** A roll-up table: one line per planned product and the selection line (`total`, null cells stay blank: the figure does not add up). */
export interface VTable { columns: VCol[]; rows: VRow[]; total: Record<string, Cell> }

/** One line per planned product of the selection. */
export const productRows = (sel: VSel, cells: (v: ProductView, l: Live) => Record<string, Cell>): VRow[] =>
  sel.items.map((v) => ({ id: v.id, name: v.name, wave: sel.waveName(v.waveId), cells: cells(v, liveOf(v)) }));

/** The values of one numeric column over the lines. */
export const colOf = (rows: VRow[], key: string): number[] => rows.map((r) => +(r.cells[key] ?? 0));
