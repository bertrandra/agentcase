import { fmtRoiPct } from '@/domain/economics/roi';
import type { PortfolioHeadline } from '@/domain/portfolio';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { Stat } from '@/ui/widgets/cards';

export type CoreHints = Partial<Record<'net' | 'roi' | 'payback' | 'npv', string>>;

/** Net, ROI, payback and calendar NPV of a Portfolio / Wave headline, as cards (Portfolio consolidation and the Portfolio verdict show the same four). */
export function CoreStats({ h, netLabel = 'Net', hints = {} }: { h: PortfolioHeadline; netLabel?: string; hints?: CoreHints }) {
  return (
    <>
      <Stat label={netLabel} value={fmtEurK(h.net)} tone={h.net < 0 ? 'brick' : 'teal'} hint={hints.net} /><Stat label="ROI" value={fmtRoiPct(h.roi)} hint={hints.roi} />
      <Stat label="Payback (months)" value={fmtMonths(h.paybackMonth)} hint={hints.payback} /><Stat label="Calendar NPV" value={fmtEurK(h.npv)} hint={hints.npv} />
    </>
  );
}
