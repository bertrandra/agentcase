// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { bootApp, flushAutosave } from '@/controllers/boot';
import { setInput } from '@/controllers/inputs';
import { AUTOSAVE_FAILED } from '@/controllers/sessions';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc } from '@/store/instance';
import { memoryStorage } from '@/store/persistence/autosave';
import { connectBroadcast, SYNC_NOTICES } from '@/store/persistence/broadcast';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';
import { channelPair } from '../helpers/channels';
import { freshStore } from '../store/helpers';

const stops: (() => void)[] = [];
afterEach(() => { stops.splice(0).forEach((f) => f()); cleanup(); });
const live = () => screen.getAllByRole('status').find((n) => n.classList.contains('ac-live'))!;

describe('notices from outside a user action reach the live region (lot 10)', () => {
  it('another tab opening a document: this tab shows it and says its undo history was cleared', async () => {
    freshStore(); render(<App />);
    const [a, b] = channelPair(), other = createAppStore(makeDefaultDoc());
    stops.push(connectBroadcast(other, a, 'A'), await bootApp({ storage: null, channel: b, tabId: 'B' }));
    act(() => { setInput('y1Ramp', 18); });
    const d = makeDefaultDoc(); d.customerName = 'From tab A';
    act(() => { other.load(d); });
    expect(appStore().getState().doc.customerName).toBe('From tab A');
    expect(uiStore.getState().toast).toBe(`${SYNC_NOTICES.opened}: ${SYNC_NOTICES.cleared}`);
    expect(live().getAttribute('aria-live')).toBe('polite');
    expect(live().textContent).toBe(uiStore.getState().toast);
  });
  it('an autosave the browser refuses is announced once', async () => {
    freshStore(); render(<App />);
    const inner = memoryStorage(), storage = { ...inner, put: async () => { throw new Error('quota'); } };
    stops.push(await bootApp({ storage, channel: null, tabId: 'B' }));
    await act(async () => { await flushAutosave(); });
    expect(uiStore.getState().toast).toBe(AUTOSAVE_FAILED);
    act(() => uiStore.setState({ toast: '' }));
    await act(async () => { await flushAutosave(); });
    expect(uiStore.getState().toast).toBe('');
  });
});
