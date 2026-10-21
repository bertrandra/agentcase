/**
 * Keyboard focus survives a control that unmounts under it (the guided bar's Start / Exit, the group bar's ☰ Menu, the restore banner):
 * once the update has rendered, if focus fell back to the page body it moves to `target()`; if the user already moved elsewhere nothing changes.
 */
export function rescueFocus(target: () => HTMLElement | null, doc: Document = document): void {
  requestAnimationFrame(() => {
    const a = doc.activeElement;
    if (a && a !== doc.body && a.isConnected) return;
    target()?.focus();
  });
}

/** The main region (a section's landmark, programmatically focusable) — the fallback when nothing finer exists. */
export const focusMain = (): void => rescueFocus(() => document.getElementById('main'));
