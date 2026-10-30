import type { ReactNode } from 'react';
import { selectElement } from './view';

/** The row header of an activity or role: a toggle button that opens (or closes) its audit form below the table. */
export function SelectCell({ id, selected, children }: { id: string; selected: string | null; children: ReactNode }) {
  return (
    <th scope="row">
      <button type="button" className="ac-link" aria-pressed={id === selected} onClick={() => selectElement(id === selected ? null : id)}>{children}</button>
    </th>
  );
}
