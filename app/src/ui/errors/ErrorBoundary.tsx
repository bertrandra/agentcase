import { Component, type ErrorInfo, type ReactNode } from 'react';
import { caughtError, reportError, type CaughtError, type ErrorScope } from './errorLog';

interface Props {
  scope: ErrorScope;
  /** What is rendered inside (a section id, a chart label): it names the failure in the details and the dock list. */
  where: string;
  /** The fallback; `reset` clears the error, so the children mount again. */
  fallback: (error: CaughtError, reset: () => void) => ReactNode;
  /** When this value changes (a new chart config), a failed boundary tries its children again. */
  resetKey?: unknown;
  children: ReactNode;
}
interface State { error: CaughtError | null; key: unknown }

/**
 * React error boundary: a render, lifecycle or effect error of the children is reported (console + the session list in the dock) and replaced by the
 * fallback, so the rest of the app keeps working. Errors of event handlers and timers are not render errors and do not reach it.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: caughtError(error, 'section', '') };   // scope and place are filled in componentDidCatch, with the component stack
  }

  static getDerivedStateFromProps(p: Props, s: State): Partial<State> | null {
    return p.resetKey === s.key ? null : { key: p.resetKey, error: null };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const entry = caughtError(error, this.props.scope, this.props.where, info.componentStack ?? '');
    reportError(entry, error);
    this.setState({ error: entry });
  }

  reset = (): void => { this.setState({ error: null }); };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return this.props.fallback({ ...error, scope: this.props.scope, where: error.where || this.props.where }, this.reset);
  }
}
