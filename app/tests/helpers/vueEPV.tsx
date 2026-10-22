import { act, screen } from '@testing-library/react';
import { setDisplayScope } from '@/controllers/displayScope';
import type { DisplayScope } from '@/domain/portfolio';

/** Switch the top-bar View. */
export const view = (scope: DisplayScope): void => { act(() => { setDisplayScope(scope); }); };
export const table = (name: RegExp): HTMLElement => screen.getByRole('table', { name });
export const totalRow = (name: RegExp): Element => table(name).querySelector('tfoot tr')!;
export const bodyRows = (name: RegExp): NodeListOf<Element> => table(name).querySelectorAll('tbody tr');
/** The value of a Stat tile (aggregate result bands). */
export const stat = (label: string): string => screen.getAllByText(label).find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.querySelector('.ac-stat-v')!.textContent ?? '';
