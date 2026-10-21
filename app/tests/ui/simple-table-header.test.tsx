// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SimpleTable } from '@/ui/sections/verifyA/SimpleTable';

afterEach(cleanup);

describe('SimpleTable blank head cell', () => {
  it('keeps its text empty (legacy parity) but is presentational, so it is no empty column header; named heads stay column headers', () => {
    const { container } = render(<SimpleTable head={['From', '', 'To']} rows={[{ key: 'r', cells: ['a', '→', 'b'] }]} />);
    const ths = [...container.querySelectorAll('thead th')];
    expect(ths.map((t) => t.textContent)).toEqual(['From', '', 'To']);
    expect(ths.map((t) => t.getAttribute('role'))).toEqual([null, 'presentation', null]);
    expect(screen.getAllByRole('columnheader').map((t) => t.textContent)).toEqual(['From', 'To']);
  });
});
