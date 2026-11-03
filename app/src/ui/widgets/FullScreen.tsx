import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Full screen for a canvas (owner's request 2026-11-03: the BPMN diagram and its editor). The element takes the whole window (class
 * `ac-fullscreen`) and asks the browser for real full screen when it can; Escape, the browser's own exit or the button leave it. View state only:
 * nothing is stored, nothing undoable. `onChange` runs after each switch (a canvas that must re-measure itself, e.g. bpmn-js).
 */
export function useFullScreen(ref: RefObject<HTMLElement | null>, onChange?: (on: boolean) => void) {
  const [on, setOn] = useState(false);
  const leave = useCallback(() => {
    setOn(false);
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
  }, []);
  const toggle = useCallback(() => {
    if (on) { leave(); return; }
    setOn(true);
    void ref.current?.requestFullscreen?.().catch(() => undefined);   // refused or unsupported: the window-filling overlay stays
  }, [on, leave, ref]);
  useEffect(() => {
    if (!on) return undefined;
    const exited = () => { if (!document.fullscreenElement) setOn(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) leave(); };
    document.addEventListener('fullscreenchange', exited);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('fullscreenchange', exited); document.removeEventListener('keydown', esc); };
  }, [on, leave]);
  useEffect(() => { onChange?.(on); }, [on]);   // eslint-disable-line react-hooks/exhaustive-deps -- after a switch only
  return { on, toggle, className: on ? ' ac-fullscreen' : '' };
}

/** The toggle button: "Full screen" / "Exit full screen", pressed while on. */
export function FullScreenButton({ on, toggle, what }: { on: boolean; toggle: () => void; what: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={toggle}>
      <span aria-hidden="true">{on ? '⤡ ' : '⤢ '}</span>{on ? 'Exit full screen' : 'Full screen'}<span className="ac-sr">{`: ${what}`}</span>
    </button>
  );
}
