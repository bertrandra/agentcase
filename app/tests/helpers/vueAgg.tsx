import { act, fireEvent, screen, within } from '@testing-library/react';
import { expect } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { scheduledProducts } from '@/domain/portfolio';
import { pf } from './portfolioUi';

/** Helpers of the aggregate-view tests (R-rollup sections): switch the View, read a table, a row, the roll-up line, open a product drill-down. */
export const view = (kind: 'portfolio' | 'wave' | 'product', id = ''): void => { act(() => { setDisplayScope(kind === 'wave' ? { kind, id } : { kind }); }); };
export const planned = (): string[] => scheduledProducts(pf()).map((s) => s.product.id);
export const table = (name: RegExp): HTMLElement => screen.getByRole('table', { name });
export const rowOf = (name: RegExp, id: string): HTMLElement => table(name).querySelector(`tbody tr[data-row="${id}"]`) as HTMLElement;
export const totalOf = (name: RegExp): HTMLElement => table(name).querySelector('tfoot tr') as HTMLElement;
export const bodyRows = (name: RegExp): number => table(name).querySelectorAll('tbody tr').length;
export const text = (e: Element | null): string => e?.textContent ?? '';
export const banner = (): string => text(document.querySelector('.ac-scope-banner'));

/** Every string is shown in the element (a figure computed by the domain and formatted like the screen does). */
export function expectShown(el: Element | null, shown: string[]): void {
  expect(el, 'element').not.toBeNull();
  for (const s of shown) expect(text(el), s).toContain(s);
}

/** Open the drill-down entry of a product (lazy) and return its read-only region. */
export async function openDrill(name: string): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${name}$`), expanded: false }));
  const region = await screen.findByRole('region', { name: `Detail: ${name}` });
  expect(region.querySelector('[data-readonly]')).not.toBeNull();
  expect(within(region).queryByRole('heading', { level: 1 })).toBeNull();
  return region;
}
