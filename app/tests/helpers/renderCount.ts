/**
 * Counts component renders per React commit through the DevTools global hook (what the React Profiler of the DevTools reads). Install it before
 * react-dom loads: import this module first in the test file (it installs itself). A component "rendered" in a commit when its fiber carries
 * the PerformedWork flag (React clears it on a bail-out: a memoised or unchanged component that did not run is not counted).
 */
interface Fiber { tag: number; flags: number; type: unknown; child: Fiber | null; sibling: Fiber | null; alternate: Fiber | null }
interface Root { current: Fiber }
const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]);   // function, class, forwardRef, memo, simple memo
const PERFORMED_WORK = 1;

export interface RenderLog { commits: number; renders: Map<string, number> }
export const log: RenderLog = { commits: 0, renders: new Map() };

const nameOf = (t: unknown): string => {
  if (typeof t === 'function') return (t as { displayName?: string; name?: string }).displayName || (t as { name?: string }).name || 'anonymous';
  if (t && typeof t === 'object') {
    const o = t as { displayName?: string; render?: unknown; type?: unknown };
    return o.displayName || nameOf(o.render ?? o.type);
  }
  return 'unknown';
};
/**
 * Visit the children React worked on in this commit, like the DevTools profiler: a subtree that bailed out keeps the child list of the previous tree
 * (`child === alternate.child`) and is skipped, so stale flags of fibers rendered in an earlier commit are never counted.
 */
function visit(parent: Fiber): void {
  if (parent.alternate && parent.child === parent.alternate.child) return;
  for (let n = parent.child; n; n = n.sibling) {
    if (COMPONENT_TAGS.has(n.tag) && (n.alternate === null || n.flags & PERFORMED_WORK)) {
      const k = nameOf(n.type);
      log.renders.set(k, (log.renders.get(k) ?? 0) + 1);
    }
    visit(n);
  }
}

export function installRenderCounter(): void {
  (globalThis as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false, supportsFiber: true, renderers: new Map(),
    inject: () => 1, checkDCE: () => undefined, onScheduleFiberRoot: () => undefined, onCommitFiberUnmount: () => undefined,
    onPostCommitFiberRoot: () => undefined,
    onCommitFiberRoot: (_id: number, root: Root) => { log.commits++; visit(root.current); },
  };
}
export function resetRenders(): void { log.commits = 0; log.renders.clear(); }
export const totalRenders = (): number => [...log.renders.values()].reduce((a, b) => a + b, 0);
/** The components that rendered, most first (for a report). */
export const topRenders = (n = 15): [string, number][] => [...log.renders.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

installRenderCounter();   // on import: the test file imports this module first, before react-dom
