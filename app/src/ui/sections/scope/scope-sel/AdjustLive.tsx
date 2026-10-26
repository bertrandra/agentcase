import { useRef } from 'react';
import { liveDelta } from '@/domain/scopeView';
import { useCaseResult } from '@/store/hooks';
import { fmtEurK } from '@/ui/format';

const chip = (l: string, v: string, d: number, fmt: (x: number) => string, tone: string) => (
  <span className="ac-chip" data-tone={tone}>{l} <strong>{v}</strong>
    {liveDelta(d) && <b className="ac-tone" data-tone={liveDelta(d) === 'up' ? 'teal' : 'brick'}> {liveDelta(d) === 'up' ? '▲ +' : '▼ '}{fmt(d).replace(/^[-−]/, '')}</b>}</span>
);

/** Live result strip: values after the last edit and the change since the previous render. */
export function AdjustLive() {
  const { model: m, endYear } = useCaseResult(), prev = useRef<{ pot: number; ceil: number; eff: number; sav: number } | null>(null);
  const cur = { pot: m.auto, ceil: m.ceiling, eff: m.eff, sav: endYear.savings }, d = prev.current ?? cur;
  prev.current = cur;
  const pct = (x: number) => `${Math.round(x)}%`;
  return (
    <div className="ac-form-row" aria-live="polite">
      <span className="ac-muted">Live result:</span>
      {chip('Potential', pct(cur.pot), cur.pot - d.pot, pct, 'teal')}
      {chip('Glass ceiling', pct(cur.ceil), cur.ceil - d.ceil, pct, 'brick')}
      {chip('Max depth', pct(cur.eff), cur.eff - d.eff, pct, 'blue')}
      {chip(`Y${endYear.index} savings`, fmtEurK(cur.sav), cur.sav - d.sav, fmtEurK, 'amber')}
      <span className="ac-muted">▲▼ = change since the previous edit</span>
    </div>
  );
}
