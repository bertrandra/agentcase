// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { acceptRestore, bootApp, dismissRestore, getRestoreOffer, loadEmbeddedCase } from '@/controllers/boot';
import { htmlSnapshotFile } from '@/controllers/htmlSnapshot';
import { setCustomerName } from '@/controllers/persona';
import { openCaseText } from '@/controllers/openFile';
import { buildSnapshotHtml, snapshotFileName } from '@/store/persistence/html/embed';
import { parseCaseFile } from '@/store/persistence/html/legacy';
import { readEmbeddedCase } from '@/store/persistence/html/read';
import { fromSnapshot, toSnapshot } from '@/store/persistence/snapshot';
import { memoryStorage, startAutosave } from '@/store/persistence/autosave';
import { createAppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { freshStore, snap } from './helpers';

/** A stand-in for the running page: the app shell, a mounted React tree and some transient nodes. */
function livePage(extra = ''): Document {
  return new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AgentCase</title><style>body{margin:0}</style></head>
     <body><div id="root"><main><h1>Mounted tree</h1><button>x</button></main></div><div data-transient>toast</div><iframe src="about:blank"></iframe>
     <script type="module">window.__app = "</scr" + "ipt>";</script>${extra}</body></html>`, 'text/html');
}
const parse = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');
const NOW = new Date('2026-10-21T15:55:00Z');

describe('HTML snapshot: save', () => {
  it('embeds the case, empties #root, drops transient UI and keeps the application script', () => {
    freshStore(); setCustomerName('Acme SA');
    const { filename, html } = htmlSnapshotFile(livePage().documentElement, NOW);
    expect(filename).toBe('AgentCase_Acme_SA_v20_12_Snapshot_2026-10-21-15-55-00.html');
    const d = parse(html);
    expect(d.getElementById('root')!.childNodes).toHaveLength(0);
    expect(d.querySelector('iframe, [data-transient]')).toBeNull();
    expect(d.querySelector('script[type=module]')!.textContent).toContain('window.__app');
    expect(d.querySelectorAll('script#agentcase-snapshot')).toHaveLength(1);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
  it('round trip: parsing the produced HTML gives back the document', () => {
    const s = freshStore(); setCustomerName('Round trip');
    const { html } = htmlSnapshotFile(livePage().documentElement, NOW);
    const back = readEmbeddedCase(parse(html))!;
    expect(back.doc).toEqual(s.getState().doc);   // the derived case lists teamIn last: compare structure, not key order
    expect(back.savedAt).toBe(NOW.toISOString());
    const viaText = parseCaseFile(html);   // the file-open path reads the text without a DOM
    expect(viaText.kind).toBe('html');
    expect(fromSnapshot(viaText.raw)).toEqual(s.getState().doc);
  });
  it('re-saving replaces the script and the legacy restore script instead of stacking', () => {
    freshStore(); setCustomerName('First');
    const first = htmlSnapshotFile(livePage('<script data-agentcase-snapshot="1">try{ applySnapshotState({"old":1}); }catch(e){}</script>').documentElement, NOW).html;
    setCustomerName('Second');
    const second = htmlSnapshotFile(parse(first).documentElement, NOW).html;
    const third = htmlSnapshotFile(parse(second).documentElement, NOW).html;
    for (const html of [first, second, third]) {
      expect(parse(html).querySelectorAll('script#agentcase-snapshot')).toHaveLength(1);
      expect(html).not.toContain('applySnapshotState');
      expect(html.match(/agentcase-snapshot"/g)).toHaveLength(1);
    }
    expect(readEmbeddedCase(parse(third))!.doc.customerName).toBe('Second');
    expect(third.length).toBeLessThan(second.length + 200);   // no growth from one save to the next
  });
  it('hostile content cannot leave the script element', () => {
    const s = freshStore();
    const evil = '</script><img src=x onerror=alert(1)><!-- <script>alert(2)</script> \u2028 end';
    setCustomerName(evil);
    const { html } = htmlSnapshotFile(livePage().documentElement, NOW);
    const d = parse(html);
    expect(d.querySelector('img')).toBeNull();
    expect(d.querySelectorAll('script')).toHaveLength(2);
    expect(html).not.toContain('</script><img');
    expect(html).toContain('\\u003c/script>');
    expect(readEmbeddedCase(d)!.doc.customerName).toBe(evil);
    expect(JSON.stringify(parseCaseFile(html).raw)).toBe(JSON.stringify(JSON.parse(JSON.stringify(toSnapshot({ currentPersona: 'builder', ...s.getState().doc }, () => NOW)))));
    expect(snapshotFileName(evil, 'v20', NOW)).toMatch(/^AgentCase_script_img_src_x_onerror_alert_1_script_alert_2_script_end_v20_Snapshot_/);
  });
  it('a plain page has no embedded case; a malformed one is reported, not executed', () => {
    expect(readEmbeddedCase(livePage())).toBeNull();
    expect(loadEmbeddedCase(livePage())).toBeNull();
    const bad = parse(buildSnapshotHtml(livePage().documentElement, { dom: 'nope' }));
    expect(() => readEmbeddedCase(bad)).toThrow();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(loadEmbeddedCase(bad)).toBeNull();   // boot logs and carries on with the default case
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('HTML snapshot: open', () => {
  it('boot opens the embedded case before anything else (fresh history)', () => {
    const s = freshStore(); setCustomerName('Embedded case');
    const { html } = htmlSnapshotFile(livePage().documentElement, NOW), saved = snap(s);
    const other = freshStore();
    expect(loadEmbeddedCase(parse(html))).toEqual({ savedAt: NOW.toISOString() });
    expect(snap(other)).toBe(saved);
    expect(other.getState().history.undo).toHaveLength(0);
  });
  it('opening a file is undoable and replaces the case', () => {
    freshStore(); setCustomerName('Saved');
    const { html } = htmlSnapshotFile(livePage().documentElement, NOW);
    const other = freshStore(); setCustomerName('Working');
    expect(openCaseText(html)).toBe('html');
    expect(other.getState().doc.customerName).toBe('Saved');
    other.undo();
    expect(other.getState().doc.customerName).toBe('Working');
  });
});

describe('boot: the embedded case comes before autosave offers', () => {
  it('only an autosave NEWER than the saved copy is offered, and it is never applied silently', async () => {
    const storage = memoryStorage();
    for (const [tab, at] of [['old-tab', '2026-10-20T10:00:00Z'], ['new-tab', '2026-10-22T10:00:00Z']] as const) {
      const other = createAppStore(makeDefaultDoc(), { now: () => 0 }); setAppStore(other);
      await startAutosave(other, storage, tab, { now: () => new Date(at) }).flush();
    }
    freshStore(); setCustomerName('Embedded');
    const { html } = htmlSnapshotFile(livePage().documentElement, NOW);
    const fresh = freshStore();
    const embedded = loadEmbeddedCase(parse(html))!;
    const stop = await bootApp({ storage, channel: null, tabId: 'me', embeddedSavedAt: embedded.savedAt });
    expect(fresh.getState().doc.customerName).toBe('Embedded');   // the embedded case is what is open
    expect(getRestoreOffer()).toMatchObject({ savedAt: '2026-10-22T10:00:00.000Z' });   // the 20 Oct record predates the saved copy: not offered
    dismissRestore();
    expect(fresh.getState().doc.customerName).toBe('Embedded');
    acceptRestore();
    stop();
  });
});
