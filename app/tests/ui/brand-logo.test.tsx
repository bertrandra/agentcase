// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLogoSrc, logoFileProblem } from '@/domain/theme/logo';
import { appStore } from '@/store/instance';
import { readLogoFile } from '@/ui/brand/logoFile';
import EngagementContext from '@/ui/sections/frame/engagement-context';
import { freshStore } from '../store/helpers';
import { PNG } from '../store/samples/themes';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

/** The customer logo upload (docs/THEME.md §8.6): type and size checks, PNG / JPEG stored as a data URL, options, undo. */
const bytes = (): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(PNG.split(',')[1]!), (c) => c.charCodeAt(0));
const png = (size?: number) => new File([size ? new Uint8Array(size) : bytes()], 'logo.png', { type: 'image/png' });
beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('customer logo upload', () => {
  it('accepts PNG, JPEG and SVG up to 200 KB only; stores only PNG / JPEG data URLs', async () => {
    expect(logoFileProblem('image/gif', 10)).toMatch(/PNG, JPEG or SVG/);
    expect(logoFileProblem('image/png', 201 * 1024)).toMatch(/too large \(201 KB, limit 200 KB\)/);
    expect(logoFileProblem('image/svg+xml', 1000)).toBeNull();
    expect(isLogoSrc('data:image/svg+xml;base64,PHN2Zy8+')).toBe(false);
    expect(isLogoSrc(`data:image/png;base64,${'A'.repeat(300 * 1024)}`)).toBe(false);
    await expect(readLogoFile(new File(['GIF89a'], 'a.gif', { type: 'image/gif' }))).rejects.toThrow(/PNG, JPEG or SVG/);
    await expect(readLogoFile(png(250 * 1024))).rejects.toThrow(/too large/);
    expect(await readLogoFile(png())).toBe(PNG);
  });
  it('Engagement context: upload, preview with alt text, backdrop, hide, remove; Ctrl+Z restores', async () => {
    render(<EngagementContext />);
    await act(async () => { fireEvent.change(screen.getByLabelText('Customer logo file'), { target: { files: [png()] } }); });
    await vi.waitFor(() => expect(screen.getByRole('img', { name: 'Customer logo' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Logo backdrop'), { target: { value: 'pill' } });
    fireEvent.click(screen.getByLabelText(/Hide the logo/));
    expect(appStore().getState().doc.CUSTOMER_LOGO).toEqual({ src: PNG, backdrop: 'pill', hidden: true });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(appStore().getState().doc.CUSTOMER_LOGO).toBeUndefined();
    act(() => { appStore().undo(); });
    expect(appStore().getState().doc.CUSTOMER_LOGO).toMatchObject({ src: PNG });
  });
});
