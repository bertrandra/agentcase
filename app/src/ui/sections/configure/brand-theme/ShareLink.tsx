import { themeLink } from '@/ui/brand/themeView';
import { toast } from '../../../uiState';

/** The link that opens the app in a theme without changing the case (docs/THEME.md §8.7), with a Copy button. */
export function ShareLink({ seq }: { seq: number }) {
  const link = themeLink(seq);
  const copy = () => {
    const done = () => toast('Theme link copied'), failed = () => toast('Copy failed: select the link and copy it', 4000);
    const clip = globalThis.navigator?.clipboard;
    if (!clip) { failed(); return; }
    clip.writeText(link).then(done, failed);
  };
  return (
    <div className="ac-bt-share">
      <span className="ac-field-l">Link to view in this theme</span>
      <code data-testid="theme-link">?theme={seq}</code>
      <button type="button" className="ac-btn" onClick={copy} aria-label={`Copy the link to theme ${seq}`}>Copy</button>
    </div>
  );
}
