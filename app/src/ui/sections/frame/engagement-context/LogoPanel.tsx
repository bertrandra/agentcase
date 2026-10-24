import { useMemo, useRef } from 'react';
import { clearCustomerLogo, setCustomerLogo, setLogoOptions } from '@/controllers/brand';
import { logoAlt, logoOf, LOGO_MAX_BYTES } from '@/domain/theme/logo';
import { useDoc } from '@/store/hooks';
import { readLogoFile } from '@/ui/brand/logoFile';
import { toast } from '@/ui/uiState';
import { Panel } from '@/ui/widgets/cards';

/** The customer logo for client presentations (docs/THEME.md §8.6): shown next to "AgentCase for <customer>", in the HTML report and snapshot, the results workbook. */
export function LogoPanel() {
  const raw = useDoc((d) => d.CUSTOMER_LOGO), customer = useDoc((d) => (d.customerName as string | undefined) ?? '');
  const logo = useMemo(() => logoOf({ CUSTOMER_LOGO: raw }), [raw]), file = useRef<HTMLInputElement>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try { setCustomerLogo(await readLogoFile(f)); toast('Customer logo set — Ctrl+Z removes it'); } catch (e) { toast(`Cannot use this logo: ${(e as Error).message}`, 6000); }
  };
  return (
    <Panel title="🖼️ Customer logo">
      <p className="ac-muted">For a presentation in the client&apos;s context: the logo appears in the title bar next to “AgentCase
        for {customer || '<customer>'}”, in the HTML
        report, the HTML snapshot and the results workbook. PNG, JPEG or SVG up to {LOGO_MAX_BYTES / 1024} KB (an SVG is converted to PNG).</p>
      <div className="ac-logo-actions">
        <button type="button" className="ac-btn" onClick={() => file.current?.click()}>{logo ? 'Replace the logo…' : 'Upload a logo…'}</button>
        {logo && <button type="button" className="ac-btn" onClick={() => { clearCustomerLogo(); toast('Customer logo removed — Ctrl+Z restores it'); }}>Remove</button>}
        <input ref={file} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden aria-label="Customer logo file" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {logo && (
        <>
          <p className="ac-logo-sample" data-backdrop={logo.backdrop}><img className="ac-brand-logo" data-backdrop={logo.backdrop} src={logo.src} alt={logoAlt(customer)} /></p>
          <label className="ac-field"><span className="ac-field-l">Logo backdrop</span>
            <select value={logo.backdrop} onChange={(e) => setLogoOptions({ backdrop: e.target.value === 'pill' ? 'pill' : 'none' })}>
              <option value="none">None</option><option value="pill">White pill (for dark headers and dark mode)</option>
            </select>
          </label>
          <label className="ac-check"><input type="checkbox" checked={logo.hidden} onChange={(e) => setLogoOptions({ hidden: e.target.checked })} /> Hide the
            logo (keep it in the case)</label>
        </>
      )}
    </Panel>
  );
}
