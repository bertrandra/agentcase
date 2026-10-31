import { act, screen } from '@testing-library/react';
import { expect } from 'vitest';
import { setInput } from '@/controllers/inputs';

/**
 * Phase B9a (docs/SPEC_BPMN.md § 19.7, DEV-B9A-CONTEXT-SCREENS): a programme activity's parameter is edited in the Process section's parameter
 * panel, whose field writes its key through `setInput` (one undoable step). The context-screen tests edit it the same way and check that the
 * screen follows, that its own field is gone and that it links to the activity.
 */
export function editParam(key: string, value: string | number): void {
  act(() => { setInput(key, String(value)); });
}

/** The context screen has no field labelled `label` and shows the activity `name` as a reference ("Open … in Process"). */
export function expectReference(label: string | RegExp, name: string): void {
  expect(screen.queryByLabelText(label)).toBeNull();
  expect(screen.getByText(`Open ${name} in Process`)).toBeTruthy();
}
