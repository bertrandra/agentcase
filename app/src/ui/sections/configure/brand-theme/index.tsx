import { useMemo } from 'react';
import { activeSeq, allThemes } from '@/domain/theme/library';
import { useDoc } from '@/store/hooks';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Editor } from './Editor';
import { Library } from './Library';
import { Preview } from './Preview';
import { useBrandThemeView } from './selection';
import './brand-theme.css';

const help = (
  <>
    <p>The theme library of this case: seven built-in themes (Capgemini is the default look) and the themes you create. The active theme paints the
      app, the HTML snapshot, the HTML report and the Excel workbooks for everyone who opens the case; the light / dark display and the contrast level
      stay each viewer&apos;s own choice (◐ Display).</p>
    <p>Built-in themes cannot be edited: duplicate one to make it yours. Every theme has a number that opens the app in that theme without changing the
      case: add <code>?theme=&lt;number&gt;</code> to the address. Rainbow is a diagnostic theme that paints each screen zone a distinct colour.</p>
    <p>The customer logo for client presentations is set in Engagement context, next to the customer name.</p>
  </>
);

/** 🎨 Brand & theme: the theme library (left), the editor of the selected theme (centre), a live preview (right). */
export default function BrandThemeSection() {
  const themes = useDoc((d) => d.THEMES), active = useDoc((d) => d.ACTIVE_THEME), selected = useBrandThemeView((s) => s.selected);
  const lib = useMemo(() => ({ THEMES: themes, ACTIVE_THEME: active }), [themes, active]);
  const all = useMemo(() => allThemes(lib), [lib]), current = activeSeq(lib);
  const def = all.find((t) => t.seq === (selected ?? current)) ?? all[0]!;
  return (
    <SectionFrame title="🎨 Brand & theme" help={help}
      input={
        <div className="ac-bt-grid">
          <Library themes={all} active={current} selected={def.seq} />
          <Editor def={def} />
          <Preview def={def} />
        </div>
      } />
  );
}
