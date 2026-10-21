import { APP_VERSION } from '@/domain/version';

export function App() {
  return (
    <main className="ac-boot">
      <h1>AgentCase v{APP_VERSION}</h1>
      <p>Migration scaffold — see docs/MIGRATION_PLAN.md.</p>
    </main>
  );
}
