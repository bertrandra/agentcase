import { useState, type CSSProperties } from 'react';

export interface Opt { value: string; label: string }

/**
 * A select whose long option list only exists while the user is choosing: closed, it holds just the current option, so a table of
 * hundreds of rows over a 400-item catalogue stays light (the legacy page rebuilt every list and exhausted memory at 660 rows).
 */
export function LazySelect({ value, options, onChange, ariaLabel, emptyLabel = '(none)', className, style }: {
  value: string; options: Opt[]; onChange: (v: string) => void; ariaLabel: string; emptyLabel?: string;
  /** The look of the select (a theme class); `style` stays accepted for older callers. */
  className?: string; style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const list = open ? options : current ? [current] : [];
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      className={className}
      style={style}   // a caller's own inline look (older callers; the theme class is `className`)
      onFocus={() => setOpen(true)}
      onMouseDown={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
