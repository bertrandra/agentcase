import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import type { XDocument } from '@/domain/process';
import { resetStudio } from '@/ui/sections/scope/process-studio/view';
import { resetProcessView } from '@/ui/sections/scope/process/view';
import type { freshStore } from '../store/helpers';

/** What the 🗺️ Process studio's UI tests share: the reset after each test, the shown case's process, a tab click. */
export const resetStudioTest = (): void => { cleanup(); act(() => { resetStudio(); resetProcessView(); }); };
export const studioDoc = (s: ReturnType<typeof freshStore>): XDocument => s.getState().doc.BPMN as XDocument;
export const studioTab = (name: string | RegExp): void => { fireEvent.click(screen.getByRole('tab', { name })); };
