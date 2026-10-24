import { setSectionNavStyle } from '@/controllers/navLayout';
import { useNavModel } from '@/ui/zones/navModel';

/**
 * Sidebar section display (legacy "Sidebar section display"): how the open group's sections appear in the hide-menu bar — buttons or an underlined
 * tab strip.
 */
export function NavStyle() {
  const { style } = useNavModel();
  return (
    <div role="radiogroup" aria-label="Sidebar section display">
      <p className="ac-muted">Buttons: small bordered pills in a wrapping row (default). Tabs: an underlined tab strip for the same sections. Used by the group bar of the hide-menu mode.</p>
      {(['buttons', 'tabs'] as const).map((s) => (
        <label key={s} className="ac-navstyle-opt"><input type="radio" name="navStyle" checked={style === s} onChange={() => setSectionNavStyle(s)} /> {s === 'tabs' ? 'Tabs' : 'Buttons'}</label>
      ))}
    </div>
  );
}
