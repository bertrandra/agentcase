import { AIACT_TIERS, aiActKey } from '@/domain/tuneB/risk';
import { useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { CheckInput, SelectInput } from '@/ui/widgets/fields';
import { useTheme } from '@/ui/themeContext';
import type { TokenName } from '@/domain/theme';

const OPTIONS = [
  { value: 'none', label: 'Not classified (neutral)' }, { value: 'minimal', label: 'Minimal risk' }, { value: 'limited', label: 'Limited risk (transparency)' },
  { value: 'high', label: 'High risk (Annex III)' }, { value: 'unacceptable', label: 'Unacceptable (prohibited)' },
];
const TONE: Record<string, TokenName> = { unacceptable: 'danger-800', high: 'warning-600', limited: 'secondary-600' };

/** EU AI-Act tier of the delivered product (EV-25) and its obligations. */
export function AiActCard() {
  const c = useCtx(), { tok } = useTheme(), k = aiActKey(c), t = AIACT_TIERS[k] as (typeof AIACT_TIERS)[string];
  const tone = TONE[k] ?? 'teal-700', col = tok(tone);   // a resolved hex: tinted with an alpha suffix
  const bar = c.inp.c('aiActApply') && t.bar > 0 ? ` · +${Math.round(t.bar * 100)} pts on the DI bar` : '';
  return (
    <Panel title="EU AI-Act tier — delivered product" aside={<Badge tone="blue">EV-25</Badge>}>
      <div className="ac-form-row">
        <SelectInput id="aiActTier" label="AI-Act risk tier (per mission)" options={OPTIONS} />
        <CheckInput id="aiActApply" label="Raise the Decision Intelligence bar for this tier" />
      </div>
      {/* dynamic: the tier colour with a hex alpha suffix, resolved in the theme in effect */}
      <div className="ac-risk-box" style={{ background: `${col}18`, borderColor: col }}>
        <div className="ac-tone ac-risk-title" data-tone={tone}>{t.label}{bar}</div>
        <ul>{t.obligations.map((o) => <li key={o}>{o}</li>)}</ul>
      </div>
      <p className="ac-muted">Reference 5.2: EU AI Act (unacceptable / high / limited / minimal), complementary to NIST AI RMF and ISO/IEC 42001. Tiering is per
        mission; a critical or safety product may fall under Annex III high-risk. CC-AIACT-01.</p>
    </Panel>
  );
}
