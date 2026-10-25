import { setCoef } from '@/controllers/tuneB';
import { useDoc } from '@/store/hooks';
import { Field } from './field/Field';
import { FieldNumber } from './field/FieldNumber';

/** An embedded coefficient of the engine (legacy COEF key), shared with the Due-diligence register. `domId` = the legacy input id mirrored in the snapshot. */
export function CoefInput({ coef, domId, label, hint, min = 0, max, step }: { coef: string; domId: string; label: string; hint?: string; min?: number;
  max?: number; step?: number }) {
  const value = useDoc((d) => d.COEF[coef]);
  return (
    <FieldNumber native="number" label={label} hint={hint} value={value ?? ''} min={min} max={max} step={step} onCommit={(v) => setCoef(coef, v, domId)}>
      <Field label={label} hint={hint}>
        <input type="number" aria-label={label} value={value ?? ''} min={min} max={max} step={step} onChange={(e) => setCoef(coef, e.target.value, domId)} />
      </Field>
    </FieldNumber>
  );
}
