import { SectionHost } from '../zones/SectionHost';
import { useUi } from '../uiState';
import { DockZone } from './DockZone';
import { KpiZone } from './KpiZone';
import { NavZone } from './NavZone';
import { RestoreBanner } from './RestoreBanner';
import { TopZone } from './TopZone';
import { useShortcuts } from './useShortcuts';

/** The application frame: top / kpi / nav / work / dock zones (CSS grid areas). */
export function Shell() {
  useShortcuts();
  const toastText = useUi((s) => s.toast);
  return (
    <div className="ac-shell">
      <a className="ac-skip" href="#main">Skip to content</a>
      <TopZone />
      <KpiZone />
      <NavZone />
      <SectionHost />
      <DockZone />
      <div className="ac-live" role="status" aria-live="polite">{toastText}</div>
      <RestoreBanner />
    </div>
  );
}
