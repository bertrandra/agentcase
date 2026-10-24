import { useSyncExternalStore } from 'react';
import { APP_VERSION } from '@/domain/version';

/** Where an error boundary sits: the whole app, the section in the work area, or one chart. */
export type ErrorScope = 'app' | 'section' | 'chart';
/** One caught render error, as the fallbacks and the dock list show it. */
export interface CaughtError { at: string; scope: ErrorScope; where: string; message: string; stack: string; componentStack: string }

const MAX = 20;   // a small in-memory list (this session only, never saved with the case)
let entries: readonly CaughtError[] = [];
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

const messageOf = (e: unknown): string => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

/** The entry of an error, before it is recorded (the fallback renders it at once; the component stack comes with componentDidCatch). */
export function caughtError(error: unknown, scope: ErrorScope, where: string, componentStack = ''): CaughtError {
  const stack = error instanceof Error ? error.stack ?? '' : '';
  return { at: new Date().toISOString(), scope, where, message: messageOf(error), stack, componentStack };
}

/** Record a caught error: console, and the session list shown in the dock. */
export function reportError(entry: CaughtError, error: unknown): void {
  entries = [entry, ...entries].slice(0, MAX);
  notify();
  console.error(`AgentCase: ${entry.scope} error in ${entry.where}:`, error);
}

export const caughtErrors = (): readonly CaughtError[] => entries;
export function clearErrors(): void { entries = []; notify(); }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useCaughtErrors = (): readonly CaughtError[] => useSyncExternalStore(subscribe, caughtErrors);

/** The text "Copy details" puts on the clipboard: what failed, where, the app version and the stacks. */
export function errorDetails(e: CaughtError): string {
  return [
    `AgentCase ${APP_VERSION}`, `Scope: ${e.scope} (${e.where})`, `Time: ${e.at}`, `Error: ${e.message}`, '',
    'Stack:', e.stack || '(none)', '', 'Component stack:', e.componentStack.trim() || '(none)',
  ].join('\n');
}
