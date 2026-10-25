/** @calc-zone foundation */
import catalog from './catalog.json';

/**
 * Role of a zone in the staged graph: `input` feeds the model, `calc` computes, `result` is read by screens and exports, `shared` is plumbing
 * (reported, never drawn).
 */
export type ZoneLane = 'input' | 'calc' | 'result' | 'shared';
export interface ZoneDef { id: string; label: string; lane: ZoneLane; description: string; entry: string[] }
export interface FigureDef { id: string; label: string; zone: string; description: string }

/** The calculation zones of the code base (docs/ARCHITECTURE.md, section 13): every domain module carries exactly one `@calc-zone` tag. */
export const ZONES = catalog.zones as ZoneDef[];
/** The figures with exactly one owner module each (`@owner` tag): the "one source of truth" list. */
export const FIGURES = catalog.figures as FigureDef[];

export const ZONE_IDS: readonly string[] = ZONES.map((z) => z.id);
export const zoneById = (id: string): ZoneDef | undefined => ZONES.find((z) => z.id === id);
export const figureById = (id: string): FigureDef | undefined => FIGURES.find((f) => f.id === id);
