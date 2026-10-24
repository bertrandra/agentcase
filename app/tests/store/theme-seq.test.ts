import { describe, expect, it } from 'vitest';
import { exportSnapshotJson } from '@/controllers/files';
import { captureSnapshot, activateSnapshot } from '@/controllers/snapshots';
import { addTheme, deleteTheme, duplicateTheme, importThemes } from '@/controllers/themes';
import { userThemes } from '@/domain/theme/library';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc, setAppStore } from '@/store/instance';
import { connectBroadcast } from '@/store/persistence/broadcast';
import { openSnapshot } from '@/store/persistence/portfolioSnapshot';
import { channelPair } from '../helpers/channels';
import { freshStore } from './helpers';

/** DEV-THEME-SEQ-UNDO closed: a theme sequence id is never issued twice, across undo / redo, other tabs, snapshot activation and reload. */
const seqs = () => userThemes(appStore().getState().doc).map((t) => t.seq);
const mark = () => appStore().getState().portfolio.common.THEME_SEQ;

describe('theme sequence ids are monotonic (high-water mark)', () => {
  it('create -> undo -> create issues 101, not 100 again; redo never lowers the mark', () => {
    const s = freshStore();
    addTheme('A'); expect(seqs()).toEqual([100]);
    s.undo(); expect(seqs()).toEqual([]); expect(mark()).toBe(100);
    addTheme('B'); expect(seqs()).toEqual([101]);
    addTheme('C'); s.undo(); s.undo(); expect(mark()).toBe(102);
    s.redo(); expect(seqs()).toEqual([101]); expect(mark()).toBe(102);
    duplicateTheme(101); expect(seqs()).toEqual([101, 103]);
  });
  it('the mark is saved with the file: reload then create continues above it', () => {
    const s = freshStore();
    addTheme('A'); addTheme('B'); s.undo(); s.undo();
    const json = exportSnapshotJson().json;
    expect((JSON.parse(json) as { THEME_SEQ?: number }).THEME_SEQ).toBe(101);
    const reopened = createAppStore(openSnapshot(JSON.parse(json))); setAppStore(reopened);
    addTheme('C'); expect(seqs()).toEqual([102]);
  });
  it('an imported library gets fresh ids above the mark', () => {
    const s = freshStore();
    addTheme('A'); deleteTheme(100); s.undo(); s.undo(); s.undo();
    importThemes([{ name: 'X', colours: {}, axes: {} }, { name: 'Y', colours: {}, axes: {} }]);
    expect(seqs()).toEqual([101, 102]);
  });
  it('activating an older snapshot does not lower the mark', () => {
    freshStore();
    captureSnapshot('Before', new Date('2026-10-24T10:00:00Z'), 'a');
    addTheme('A'); addTheme('B');
    expect(activateSnapshot('a')).toBe(true);
    expect(seqs()).toEqual([]);
    addTheme('C'); expect(seqs()).toEqual([102]);
  });
  it('another tab\'s undo does not lower this tab\'s mark', () => {
    const A = freshStore(), B = createAppStore(makeDefaultDoc());
    const [ca, cb] = channelPair(); connectBroadcast(A, ca, 'A'); connectBroadcast(B, cb, 'B');
    addTheme('A'); expect(B.getState().portfolio.common.THEME_SEQ).toBe(100);
    A.undo();
    expect(userThemes(B.getState().doc)).toEqual([]);
    expect(B.getState().portfolio.common.THEME_SEQ).toBe(100);
  });
});
