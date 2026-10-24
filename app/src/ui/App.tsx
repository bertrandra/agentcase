import { flushAutosave } from '@/controllers/boot';
import { ErrorBoundary } from './errors/ErrorBoundary';
import { AppFallback } from './errors/fallbacks';
import { Shell } from './shell/Shell';

/** The shell under the app-level error boundary: a crash of the frame itself shows a minimal page (Reload, Copy details) after saving the case now. */
export function App() {
  return (
    <ErrorBoundary scope="app" where="shell" fallback={(e) => <AppFallback error={e} onShown={flushAutosave} />}>
      <Shell />
    </ErrorBoundary>
  );
}
