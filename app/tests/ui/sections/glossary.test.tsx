// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Glossary from '@/ui/sections/refshare/glossary';
import { filterGlossary, glossaryMarkdown } from '@/ui/sections/refshare/glossary/model';
import { expectParity } from '../../helpers/sectionParity';

afterEach(cleanup);

describe('glossary section', () => {
  it('shows every figure and heading the legacy section showed (4 fixtures)', () => {
    expectParity('glossary', Glossary,
      { headings: ['Delivery-model glossary', 'All (96)', 'Vision & Engagement (14)', 'Software/Agentic Factory meta-model (15)', '1 · Vision & Engagement',
      '10 · Software/Agentic Factory meta-model', 'Agentic Software Engineering Reference Model'] });
  });
  it('searches terms and definitions, filters by dimension and counts what is shown', () => {
    render(<Glossary />);
    expect(screen.getByText('96 term(s) shown')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search a term or definition'), { target: { value: 'glass ceiling' } });
    const n = filterGlossary('all', 'glass ceiling').length;
    expect(n).toBeGreaterThan(0);
    expect(screen.getByText(`${n} term(s) shown`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search a term or definition'), { target: { value: 'zzzz-no-such-term' } });
    expect(screen.getByText('No term matches.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search a term or definition'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Process & SDLC (7)' }));
    expect(screen.getByText('7 term(s) shown')).toBeTruthy();
    expect(screen.queryByText('Agentic Software Engineering Reference Model')).toBeNull();
  });
  it('exports a Markdown table per dimension with all 96 terms', () => {
    const md = glossaryMarkdown('2026-01-01');
    expect(md).toContain('96 terms across 10 dimensions');
    expect(md.match(/^## /gm)).toHaveLength(10);
    expect(md.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Delivery') && !l.startsWith('| ---'))).toHaveLength(96);
  });
});
