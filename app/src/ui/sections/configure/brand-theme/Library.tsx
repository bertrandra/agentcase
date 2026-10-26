import { useRef } from 'react';
import { activateTheme, addTheme, deleteTheme, duplicateTheme, importThemes, lastIssuedSeq, renameTheme } from '@/controllers/themes';
import { readThemeFile, themeFileJson, themeFileName } from '@/domain/theme/themeFile';
import type { ThemeDef } from '@/domain/theme/themeDef';
import { DraftText } from '@/ui/widgets/DraftText';
import { downloadText } from '../../refshare/download';
import { toast } from '../../../uiState';
import { ShareLink } from './ShareLink';
import { selectTheme } from './selection';

const exportThemes = (list: readonly ThemeDef[]) => downloadText(themeFileName(list), themeFileJson(list), 'application/json');
async function importFile(f: File | undefined): Promise<void> {
  if (!f) return;
  try {
    const { themes, notes } = readThemeFile(await f.text());
    importThemes(themes);
    selectTheme(lastIssuedSeq());
    toast(
      `Imported ${themes.length} theme${themes.length === 1 ? '' : 's'}${notes.length ? ` (${notes.length} setting${notes.length === 1 ? '' : 's'} ` +
        `ignored: ${notes[0]})` : ''}`, 6000);
  } catch (e) { toast(`Cannot import the themes: ${(e as Error).message}`, 6000); }
}

/** The library: every theme with its number and badges, the actions on the selected one, new / import / export. */
export function Library({ themes, active, selected }: { themes: readonly ThemeDef[]; active: number; selected: number }) {
  const file = useRef<HTMLInputElement>(null), sel = themes.find((t) => t.seq === selected)!, own = themes.filter((t) => !t.builtin);
  return (
    <section className="ac-card ac-bt-library" aria-label="Theme library">
      <h2>Library</h2>
      <ul className="ac-bt-list">
        {themes.map((t) => (
          <li key={t.seq}>
            <button type="button" className="ac-bt-item" aria-pressed={t.seq === selected} onClick={() => selectTheme(t.seq)}>
              <span className="ac-bt-seq">{t.seq}</span> <span className="ac-bt-name">{t.name}</span>
              {t.builtin && <span className="ac-bt-badge">Built-in</span>}
              {t.diagnostic && <span className="ac-bt-badge">Diagnostic</span>}
              {t.seq === active && <span className="ac-bt-badge is-active">Active</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="ac-bt-actions" role="group" aria-label={`Actions on ${sel.name}`}>
        <button type="button" data-tone="primary" disabled={sel.seq === active}
          onClick={() => { activateTheme(sel.seq); toast(`${sel.name} is now the theme of this case`); }}>Activate</button>
        <button type="button" className="ac-btn" onClick={() => { duplicateTheme(sel.seq); selectTheme(lastIssuedSeq()); }}>Duplicate</button>
        <button type="button" className="ac-btn" onClick={() => exportThemes([sel])}>Export</button>
        <button type="button" className="ac-btn" disabled={sel.builtin} title={sel.builtin ? 'Built-in themes cannot be deleted' : undefined}
          onClick={() => { deleteTheme(sel.seq); selectTheme(null); toast(`Deleted ${sel.name} — Ctrl+Z restores it`); }}>Delete</button>
      </div>
      {!sel.builtin && <label className="ac-field"><span className="ac-field-l">Rename</span>
        <DraftText label={`Name of theme ${sel.seq}`} value={sel.name} onCommit={(v) => renameTheme(sel.seq, v)} /></label>}
      <ShareLink seq={sel.seq} />
      <div className="ac-bt-actions">
        <button type="button" className="ac-btn" onClick={() => { addTheme('My theme'); selectTheme(lastIssuedSeq()); }}>New theme</button>
        <button type="button" className="ac-btn" onClick={() => file.current?.click()}>Import…</button>
        <button type="button" className="ac-btn" disabled={!own.length} onClick={() => exportThemes(own)}>Export library</button>
        <input ref={file} type="file" accept="application/json,.json" hidden aria-label="Import a theme file"
          onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </section>
  );
}
