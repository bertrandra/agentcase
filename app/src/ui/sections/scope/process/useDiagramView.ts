import { useEffect, useState } from 'react';
import type { DiagramViewId } from '@/domain/process';
import type { DiagramColour } from './DiagramOptions';

/**
 * The display options of a diagram (view state, never in the case), kept in this browser between visits (owner's request 2026-11-05: "save the
 * view"): the point of view, the phase shown, hidden / compact, colours, the frozen headers, the minimap, the collapsed sub-processes. Per diagram
 * (its name), per browser; storage that cannot be read or written (a private window) leaves the defaults.
 */
export interface ViewOptions {
  pov: DiagramViewId; phase: string; hideOut: boolean; compact: boolean; colour: DiagramColour; freeze: boolean; freezePhases: boolean; map: boolean;
  collapsed: string[];
}
const DEFAULTS: ViewOptions = {
  pov: 'process', phase: '', hideOut: false, compact: true, colour: '', freeze: false, freezePhases: false, map: false, collapsed: [],
};
const key = (name: string): string => `ac-diagram-view:${name}`;

function load(name: string): ViewOptions {
  try {
    const raw = window.localStorage.getItem(key(name));
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ViewOptions>) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

export function useDiagramView(name: string): [ViewOptions, <K extends keyof ViewOptions>(k: K, v: ViewOptions[K]) => void] {
  const [o, setO] = useState<ViewOptions>(() => load(name));
  useEffect(() => {
    try { window.localStorage.setItem(key(name), JSON.stringify(o)); } catch { /* storage unavailable: the options last for this visit */ }
  }, [name, o]);
  const set = <K extends keyof ViewOptions>(k: K, v: ViewOptions[K]): void => setO((p) => (p[k] === v ? p : { ...p, [k]: v }));
  return [o, set];
}
