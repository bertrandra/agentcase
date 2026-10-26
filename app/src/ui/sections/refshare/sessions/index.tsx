import { useCallback, useEffect, useState } from 'react';
import content from '@/content/refshare/sessions.json';
import { clearAllSessions, listSessions, removeSession, restoreSession, saveSessionNow, sessionsAvailable, thisTabId,
  type SessionInfo } from '@/controllers/sessions';
import { toast } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SessionTable } from './SessionTable';

/** Session manager — the autosaved sessions of this browser: list, restore, remove, clear. */
export default function SessionsSection() {
  const [rows, setRows] = useState<SessionInfo[]>([]), [confirmAll, setConfirmAll] = useState(false), available = sessionsAvailable();
  const refresh = useCallback(async () => { setRows(await listSessions()); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const act = (fn: () => Promise<unknown>, message: string) => async () => {
    try { await fn(); toast(message); } catch (e) { toast(e instanceof Error ? e.message : String(e), 5000); }
    await refresh();
  };
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <Callout>{content.intro}</Callout>
        <div className="ac-actions ac-actions-block">
          <button type="button" className="ac-btn ac-btn-primary" disabled={!available} onClick={act(saveSessionNow, 'This session was autosaved')}>Autosave
            this session</button>
          <button type="button" className="ac-btn" disabled={!available}
            onClick={act(() => removeSession(thisTabId()), "This tab's autosave was cleared")}>Clear this tab's autosave</button>
          {confirmAll
            ? <><button type="button" className="ac-btn"
              onClick={() => { setConfirmAll(false); void act(clearAllSessions, 'All sessions cleared')(); }}>Confirm: remove every session</button>
              <button type="button" className="ac-btn" onClick={() => setConfirmAll(false)}>Cancel</button></>
            : <button type="button" className="ac-btn" disabled={!available} onClick={() => setConfirmAll(true)}>🗑 Clear all sessions</button>}
        </div>
      </>}
      result={!available ? <Callout kind="warn">{content.texts.unavailable}</Callout>
        : rows.length === 0 ? <p className="ac-muted">{content.texts.empty}</p> : (
        <>
          <p className="ac-muted">{content.texts.restoreNote}</p>
          <SessionTable rows={rows}
            onRestore={(id) => { void restoreSession(id).then((ok) => toast(ok ? 'Session restored' : 'That session no longer exists')); }}
            onRemove={(id) => { void act(() => removeSession(id), 'Session removed')(); }} />
        </>
      )} />
  );
}
