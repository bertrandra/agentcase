import { useMemo } from 'react';
import { addTokenModel, removeTokenModel, resetTokenModels, setTokenField } from '@/controllers/tuneB';
import { isSplitComplete } from '@/domain/split';
import { tokenModelRows, tokenUsage, type ModelRow } from '@/domain/tuneB/tokens';
import { useCtx } from '@/store/hooks';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';
import { eur } from '../../tuneB/fmt';

type Field = 'name' | 'mix' | 'priceIn' | 'priceOut';
const NUM: { field: Exclude<Field, 'name'>; header: string; step: number; max?: number }[] = [
  { field: 'mix', header: 'Mix %', step: 1, max: 100 },
  { field: 'priceIn', header: 'Price in (€/1M)', step: 0.5 },
  { field: 'priceOut', header: 'Price out (€/1M)', step: 0.5 },
];

/** Editable model mix and prices; volume and cost of the horizon-end year follow the usage estimate. */
export function ModelTable() {
  const c = useCtx(), t = useMemo(() => tokenModelRows(c), [c]), L = tokenUsage(c).endLabel;
  const columns: Column<ModelRow>[] = [
    { key: 'name', header: 'Model', render: (r) => <input type="text" aria-label={`Model ${r.index + 1} name`} defaultValue={r.name} key={r.name}
      onBlur={(e) => setTokenField(r.index, 'name', e.target.value)} /> },
    ...NUM.map((n): Column<ModelRow> => ({
      key: n.field, header: n.header, align: 'center',
      render: (r) => (
        <FieldNumber bare native="number" label={`${r.name} ${n.header}`} value={r[n.field]} min={0} max={n.max} step={n.step}
          onCommit={(v) => setTokenField(r.index, n.field, v)}>
          <input type="number" aria-label={`${r.name} ${n.header}`} value={r[n.field]} min={0} max={n.max} step={n.step}
            onChange={(e) => setTokenField(r.index, n.field, e.target.value)} />
        </FieldNumber>),
    })),
    { key: 'vol', header: `Tokens ${L} (M)`, align: 'right', render: (r) => `${r.volM.toFixed(1)} M` },
    { key: 'cost', header: `Cost ${L} (€)`, align: 'right', render: (r) => eur(r.cost) },
    { key: 'rm', header: '', align: 'center', render: (r) => <button type="button" title="Remove model" aria-label={`Remove ${r.name}`}
      onClick={() => removeTokenModel(r.index)}>✕</button> },
  ];
  const ok = isSplitComplete(t.mixSum);
  return (
    <Panel title="💸 Token economics by model">
      <p className="ac-muted">Per model: usage <strong>mix %</strong> and <strong>input / output price</strong> (€ per 1M tokens). Volume ({L}) and
        cost are computed from the usage estimate above, distributed by mix, with the input/output split applied. The <strong>blended
        €/1M</strong> drives Run / Setup / ROI. Add or remove models freely — this list is part of the Excel export / import.</p>
      <div className="ac-form-row">
        <button type="button" onClick={addTokenModel}>＋ Add model</button>
        <button type="button" onClick={resetTokenModels}>↺ Reset</button>
        <span>Mix total : <strong className="ac-tone" data-tone={ok ? 'teal-725' : 'danger-700'}>{Math.round(t.mixSum)}%</strong> · Annual token cost
          : <strong>{eur(t.costTot)} / yr ({L})</strong></span>
      </div>
      <DataTable columns={columns} rows={t.rows} rowKey={(r) => String(r.index)} empty="No model: add one." />
    </Panel>
  );
}
