import { createRoot } from 'react-dom/client';
import { bootApp, loadEmbeddedCase } from '@/controllers/boot';
import { configureSessions } from '@/controllers/sessions';
import { idbStorage } from '@/store/persistence/idb';
import { App } from '@/ui/App';
import { initThemeLink } from '@/ui/brand/themeView';
import { initDisplay } from '@/ui/display/store';
import '@/ui/theme/fonts.css';
import '@/ui/theme/tokens.css';
import '@/ui/theme/axes.css';
import '@/ui/theme/shell.css';
import '@/ui/theme/content.css';
import '@/ui/theme/sections-a.css';

initThemeLink();   // a ?theme=<seq> link shows that theme without touching the case (docs/THEME.md §8.7)
initDisplay();   // the viewer's display preference (light / dark / auto, contrast…) before the first paint; a saved HTML copy honours its viewer's choice
const embedded = loadEmbeddedCase(document);   // a saved HTML copy opens its own case before the first paint
createRoot(document.getElementById('root')!).render(<App />);

// Autosave (IndexedDB) and multi-tab sync (BroadcastChannel); both are optional when the browser blocks them.
const tabId = crypto.randomUUID();
const channel = typeof BroadcastChannel === 'undefined' ? null : (new BroadcastChannel('agentcase-v19') as unknown as Parameters<typeof bootApp>[0]['channel']);
const storage = idbStorage();
configureSessions({ storage, tabId });   // the Sessions section shares the boot storage and tab id
void bootApp({ storage, channel, tabId, embeddedSavedAt: embedded?.savedAt });
