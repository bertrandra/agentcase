import { useId, type ReactNode, type SyntheticEvent } from 'react';

const block = (e: SyntheticEvent): void => { e.stopPropagation(); };
const KEYS = new Set(['Enter', ' ', 'Backspace', 'Delete']);

/**
 * A read-only view of a section rendered for a product other than the edited one (Vue agrégée, drill-down). Writes are not redirected by
 * `ProductViewContext`, so nothing inside may reach a controller: native controls are disabled (`fieldset disabled`), and the click / key / change /
 * input / submit / drop events are stopped before any handler of a custom control (role=button, div with onClick...) sees them. Reading, focus and
 * scrolling still work, and the subtree stays in the accessibility tree (it is a result to read); `inert` is opt-in for an input section.
 */
export function ReadOnlyScope({ who, children, inert }: { who: string; children: ReactNode; inert?: boolean }) {
  const id = useId(), extra = inert ? ({ inert: '' } as Record<string, string>) : {};
  return (
    <div className="ac-readonly" data-readonly onClickCapture={block} onChangeCapture={block} onInputCapture={block} onSubmitCapture={block} onDropCapture={block}
      onKeyDownCapture={(e) => { if (KEYS.has(e.key)) block(e); }}>
      <p id={id} className="ac-muted ac-ro-note">Lecture seule : vue du produit <strong>{who}</strong>. Pour modifier, utilisez « Éditer ce produit ».</p>
      <fieldset disabled aria-describedby={id} className="ac-ro-fieldset" {...extra}>
        <legend className="ac-sr">Produit {who} (lecture seule)</legend>
        {children}
      </fieldset>
    </div>
  );
}
