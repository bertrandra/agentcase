// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { addOrgUnit } from '@/controllers/org';
import Organisation from '@/ui/sections/frame/organisation';
import { ScopeSelect } from '@/ui/shell/ScopeSelect';
import { threeProducts } from '../../helpers/portfolioStore';

/** SPEC_FIXES FX-17: the unit tree is indented at every level (no cap at 6), in 🏢 Organisation and in the unit pickers. */
afterEach(cleanup);

describe('unit indentation at any depth', () => {
  it('a unit at level 9 is indented 8 steps in the tree and in the scope picker', () => {
    threeProducts();
    let parent: string | undefined;
    for (let i = 1; i <= 9; i++) { addOrgUnit({ id: `u${i}`, name: `Unit ${i}`, type: 'department', ...(parent ? { parent } : {}) }); parent = `u${i}`; }
    const { container } = render(<Organisation />);
    const row = screen.getByLabelText('Name of unit Unit 9').closest('th')!;
    expect(row.querySelectorAll('.ac-org-indent')).toHaveLength(8);
    expect(row.textContent).toContain('Level 9');
    cleanup();
    render(<ScopeSelect />);
    expect(screen.getByRole('option', { name: 'Unit 9, unit level 9' }).textContent).toBe(`${'· '.repeat(8)}Unit 9`);
    expect(container).toBeTruthy();
  });
});
