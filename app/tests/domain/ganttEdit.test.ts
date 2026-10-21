import { describe, expect, it } from 'vitest';
import { moveStart, resizeBar } from '@/domain/verifyB';

describe('gantt bar edits', () => {
  it('resizes by the step, bigger with Shift, clamped to the input range', () => {
    expect(resizeBar('rmD1', 4, 1, false)).toEqual({ id: 'rmD1', value: '5', text: '5 weeks' });
    expect(resizeBar('rmD1', 4, -1, true)).toEqual({ id: 'rmD1', value: '0', text: '0 weeks' });
    expect(resizeBar('rmD1', 0, -1, false)).toBeNull();
    expect(resizeBar('setupDuration', 1, -1, true)).toBeNull();
    expect(resizeBar('khSetupDays', 30, 1, true)?.value).toBe('37');
    expect(resizeBar('ganttOverlap', 5, 1, false)).toBeNull();
  });
  it('moves the roadmap start by a day or a week across month ends; invalid dates are left alone', () => {
    expect(moveStart('2026-09-01', -1, false)?.value).toBe('2026-08-31');
    expect(moveStart('2026-12-28', 1, true)?.value).toBe('2027-01-04');
    expect(moveStart('', 1, false)).toBeNull();
  });
});
