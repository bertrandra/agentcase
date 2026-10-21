import { useRef } from 'react';
import { useCaseResult } from '@/store/hooks';
import { fmtEurK } from '@/ui/format';

const chip = (l: string, v: string, d: number, fmt: (x: number) => string, tone: string) => (
  <span className="ac-chip" style={{ borderLeftColor: tone }}>{l} <strong>{v}</strong>
    {Math.abs(d) >= 0.5 && <b style={{ color: d > 0 ? 'var(--ac-teal)' : 'var(--ac-brick)' }}> {d > 0 ? '▲ +' : '▼ '}{fmt(d).replace('-', '')}</b>}</span>
);

/** Live result strip: values after the last edit and the change since the previous render. */
export function AdjustLive() {
  const m = useCaseResult().model, prev = useRef<{ pot: number; ceil: number; eff: number; sav: number } | null>(null);
  const cur = { pot: m.auto, ceil: m.ceiling, eff: m.eff, sav: m.yearSav[2] ?? 0 }, d = prev.current ?? cur;
  prev.current = cur;
  const pct = (x: number) => `${Math.round(x)}%`;
  return (
    <div className="ac-form-row" aria-live="polite">
      <span className="ac-muted">Live result:</span>
      {chip('Potential', pct(cur.pot), cur.pot - d.pot, pct, 'var(--ac-teal)')}
      {chip('Glass ceiling', pct(cur.ceil), cur.ceil - d.ceil, pct, 'var(--ac-brick)')}
      {chip('Max depth', pct(cur.eff), cur.eff - d.eff, pct, 'var(--ac-blue)')}
      {chip('Y3 savings', fmtEurK(cur.sav), cur.sav - d.sav, fmtEurK, 'var(--ac-amber)')}
      <span className="ac-muted">▲▼ = change since the previous edit</span>
    </div>
  );
}
