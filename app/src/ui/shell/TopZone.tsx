import { useDoc, useHistory } from '@/store/hooks';
import { APP_VERSION } from '@/domain/version';
import { BrandLogo, useHasLogo } from '../brand/BrandLogo';
import { DisplayMenu } from '../display/DisplayMenu';
import { goSection, setFastPath, toggleMenuHidden, useUi } from '../uiState';
import { useNavModel } from '../zones/navModel';
import { FileMenu } from './FileMenu';
import { ProductBar } from './ProductBar';
import { switchPersona } from './personaSwitch';
import { runHistory } from './useShortcuts';

/** Undo / redo: the only part of the top bar that changes on every edit (the history), so the rest of the bar does not re-render with it. */
function UndoRedo() {
  const h = useHistory();
  return (
    <>
      <button type="button" disabled={!h.canUndo} onClick={() => runHistory('undo')} title={h.undo.at(-1)?.label ?? 'Nothing to undo'}
        aria-label="Undo">↶</button>
      <button type="button" disabled={!h.canRedo} onClick={() => runHistory('redo')} title={h.redo.at(-1)?.label ?? 'Nothing to redo'}
        aria-label="Redo">↷</button>
    </>
  );
}

/**
 * Two zones: left = brand (and client logo), the sidebar toggle, the persona and Fast Path; right = Show / Change, undo / redo, the file menu and the
 * display menu.
 */
export function TopZone() {
  const customer = useDoc((d) => (d.customerName as string) ?? ''), { persona, personas, landing } = useNavModel();
  const logo = useHasLogo(), hidden = useUi((s) => s.menuHidden), fastPath = useUi((s) => s.fastPath);
  return (
    <header className="ac-top" role="banner">
      <div className="ac-top-left">
        <div className={logo ? 'ac-top-id has-logo' : 'ac-top-id'}>
          <strong className="ac-brand" title="Back to Welcome"
            onClick={() => goSection('home')}>AgentCase{customer ? ` for ${customer}` : ''} <small>v{APP_VERSION}</small></strong>
          <BrandLogo />
        </div>
        <div className="ac-top-ctrls ac-top-ctrls-left">
          <button type="button" className="ac-icon-btn" aria-label="Toggle the sidebar menu" aria-pressed={!hidden}
            title="Show or hide the sidebar; hidden, the group bar above the section navigates" onClick={toggleMenuHidden}>☰</button>
          <select aria-label="Persona" value={persona} onChange={(e) => switchPersona(e.target.value, landing(e.target.value))}>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.label ?? p.id}</option>)}
          </select>
          <label className="ac-fastpath" title="Fast Path: filter the menu to the minimum-viable-path sections plus Welcome. Untick to restore the full menu.">
            <input type="checkbox" checked={fastPath} onChange={(e) => setFastPath(e.target.checked)} /> Fast Path
          </label>
        </div>
      </div>
      <div className="ac-top-ctrls">
        <ProductBar />
        <UndoRedo />
        <FileMenu />
        <DisplayMenu />
      </div>
    </header>
  );
}
