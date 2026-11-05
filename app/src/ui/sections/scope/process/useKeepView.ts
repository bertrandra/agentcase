import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Drawing } from '@/domain/process';
import { bringIntoView, FIT, keepView, type Cam } from './diagramCamera';

/**
 * The camera when the drawing changes (owner, 2026-11-04): another view (`viewKey`: point of view, phase, hidden, compact) is shown whole; an edit
 * keeps the window on screen at the same zoom, and the element just edited (`onEdited`) is brought into view when it left it.
 */
export function useKeepView(drawn: Drawing, viewKey: string, setCam: Dispatch<SetStateAction<Cam>>): (id: string) => void {
  const last = useRef({ key: viewKey, box: drawn.box }), follow = useRef<string | null>(null);
  useEffect(() => {
    const was = last.current;
    last.current = { key: viewKey, box: drawn.box };
    if (was.key !== viewKey) { setCam(FIT); return; }
    if (was.box === drawn.box) return;
    const s = drawn.shapes.find((x) => x.id === follow.current);
    follow.current = null;
    setCam((c) => (s ? bringIntoView(drawn.box, keepView(was.box, drawn.box, c), s) : keepView(was.box, drawn.box, c)));
  }, [drawn]);   // eslint-disable-line react-hooks/exhaustive-deps -- the view key changes with the drawing
  return useCallback((id: string) => { follow.current = id; }, []);
}
