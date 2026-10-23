import { useEffect } from 'react';
import '../theme/nav.css';
import '../theme/a11y.css';
import '../theme/portfolio.css';
import '../theme/vue.css';
import { useDisplay } from '../display/store';
import { SectionHost } from '../zones/SectionHost';
import { sectionById } from '../zones/registry';
import { useNavModel } from '../zones/navModel';
import { setMenuHidden, useUi } from '../uiState';
import { CalcStaleBanner } from './CalcStaleBanner';
import { DockZone } from './DockZone';
import { GroupNavBar } from './GroupNavBar';
import { KpiZone } from './KpiZone';
import { NavZone } from './NavZone';
import { RestoreBanner } from './RestoreBanner';
import { TopZone } from './TopZone';
import { WizardBar } from './WizardBar';
import { useShortcuts } from './useShortcuts';

/** The application frame: top / kpi / nav / work / dock zones (CSS grid areas). The sidebar collapses in hide-menu mode and during a guided walk. */
export function Shell() {
  useShortcuts();
  const toastText = useUi((s) => s.toast), active = useUi((s) => s.activeSection), hidden = useUi((s) => s.menuHidden), walking = useUi((s) => s.wiz.active);
  const { persona, compact } = useNavModel(), collapsed = hidden || walking, display = useDisplay((s) => s.version);
  useEffect(() => { setMenuHidden(compact); }, [persona, compact]);   // the persona's "hide menu" default, live when it is edited
  return (
    <div className={`ac-shell${collapsed ? ' is-compact' : ''}`}>
      <a className="ac-skip" href="#main">Skip to content</a>
      <TopZone />
      <KpiZone />
      {!collapsed && <NavZone />}
      <div className="ac-workcol" style={{ gridArea: 'work' }}>
        <GroupNavBar />
        <WizardBar />
        <SectionHost key={display} />{/* a display change (dark, contrast, colour-blind charts) re-mounts the section: canvases and tok() read-outs are rebuilt */}
      </div>
      <DockZone />
      <div className="ac-live" role="status" aria-live="polite">{toastText}</div>
      <p className="ac-sr" aria-live="polite" aria-atomic="true" data-testid="section-announcer">{sectionById(active)?.label ?? ''}</p>
      <CalcStaleBanner />
      <RestoreBanner />
    </div>
  );
}
