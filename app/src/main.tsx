import { createRoot } from 'react-dom/client';
import { bootApp } from '@/controllers/boot';
import { idbStorage } from '@/store/persistence/idb';
import { App } from '@/ui/App';
import '@/ui/theme/tokens.css';
import '@/ui/theme/shell.css';

createRoot(document.getElementById('root')!).render(<App />);

// Autosave (IndexedDB) and multi-tab sync (BroadcastChannel); both are optional when the browser blocks them.
const tabId = crypto.randomUUID();
const channel = typeof BroadcastChannel === 'undefined' ? null : (new BroadcastChannel('agentcase-v19') as unknown as Parameters<typeof bootApp>[0]['channel']);
void bootApp({ storage: idbStorage(), channel, tabId });
