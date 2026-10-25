import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import exceptions from '../../ui-parity-exceptions.json';
import { contrast } from '../../src/ui/colorText';
import { Badge, Callout, Stat, StatRow } from '../../src/ui/widgets/cards';
import { Rich } from '../../src/ui/widgets/Rich';
import { DataTable } from '../../src/ui/widgets/DataTable';
import { resolveCss } from '../helpers/themeCss';

const css = resolveCss(readFileSync(new URL('../../src/ui/theme/content.css', import.meta.url), 'utf8'));   // tokens resolved to their default-theme values
const sectionsB = readFileSync(new URL('../../src/ui/theme/sections-b.css', import.meta.url), 'utf8');

describe('shared widgets carry the classes the legacy-matching styles hang on', () => {
  it('Callout: note (insight box), warn, error, and the legacy green / blue notes', () => {
    for (const kind of ['note', 'warn', 'error', 'green', 'blue'] as const) {
      const html = renderToStaticMarkup(<Callout kind={kind}>x</Callout>);
      expect(html).toContain(`ac-callout ac-callout-${kind}`);
      expect(html).toContain(kind === 'warn' || kind === 'error' ? 'role="alert"' : 'role="note"');
      if (kind !== 'note') expect(css).toContain(`.ac-callout-${kind}`);
    }
  });
  it('Rich: legacy classes become ac-rich-* (styled in content.css) and content headings keep the legacy h3 / h4 scale one level up', () => {
    const html = renderToStaticMarkup(<Rich nodes={[['h3', 'T'], ['div', { class: 'note-green' }, 'n'],
      ['div', { class: 'formula' }, ['span', { class: 'v' }, 'v']], ['div', { class: 'worked' }, 'w'], ['div', { class: 'card' }, 'c'], ['h4', 'S']]} />);
    expect(html).toContain('<h2>T</h2>'); expect(html).toContain('<h3>S</h3>');
    for (const c of ['ac-rich-note-green', 'ac-rich-formula', 'ac-rich-v', 'ac-rich-worked', 'ac-rich-card']) {
      expect(html).toContain(c);
      expect(css).toContain(`.${c}`);
    }
  });
  it('DataTable: numeric alignment is a class of header and cells (legacy .text-right / .text-center, styled in sections-b.css); the scroller stays focusable', () => {
    const html = renderToStaticMarkup(<DataTable
      columns={[{ key: 'a', header: 'A', render: (r: number) => r }, { key: 'b', header: 'B', align: 'right', render: (r: number) => r * 2 },
        { key: 'c', header: 'C', align: 'center', render: () => 'c' }]}
      rows={[1]}
      rowKey={(r) => String(r)}
    />);
    expect(html).toContain('<th scope="col" class="ac-num">B</th>'); expect(html).toContain('<td class="ac-center">c</td>');
    for (const c of ['ac-num', 'ac-center']) expect(sectionsB).toContain(`.${c}`);
    expect(html).toContain('class="ac-table-wrap" tabindex="0"');
  });
  it('Stat / Badge keep the tone hooks', () => {
    expect(renderToStaticMarkup(<StatRow><Stat label="L" value="1" tone="teal" /></StatRow>)).toContain('data-tone="teal"');
    expect(renderToStaticMarkup(<Badge tone="amber">b</Badge>)).toContain('class="ac-badge" data-tone="amber"');
  });
});

describe('section exceptions pin the measured contrast', () => {
  const list = exceptions.exceptions.filter((e) => e.area.startsWith('sections:'));
  it('has the recorded section exceptions', () => expect(list.length).toBeGreaterThan(0));
  it.each(list.map((e) => [e.area + ' ' + e.prop, e] as const))('%s', (_n, e) => {
    const x = e as typeof e & { fg?: string; bg?: string; min?: number; ratio?: number; tokenOnly?: boolean };
    expect(x.reason.length).toBeGreaterThan(40);
    // not reachable by the computed-style walk: the value is in the stylesheet
    if (x.tokenOnly) expect(css.toLowerCase()).toContain(x.expected.toLowerCase());
    if (x.fg && x.bg && x.min && x.ratio) {
      const r = contrast(x.fg, x.bg);
      expect(r).toBeGreaterThanOrEqual(x.min);
      expect(Math.abs(r - x.ratio)).toBeLessThan(0.01);   // the recorded ratio is the measured one
      if (x.min >= 4.5) expect(r).toBeLessThan(x.min + 0.1);   // lightest adjustment: it just clears the threshold
    }
  });
});
