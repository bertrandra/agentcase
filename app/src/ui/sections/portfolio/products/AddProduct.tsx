import { useState } from 'react';
import { addProduct } from '@/controllers/product';
import { useWaves } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';

/** "Add a product": a new product inherits every common value and has its own default team; it joins the first wave when there is one. */
export function AddProduct() {
  const [name, setName] = useState(''), first = useWaves()[0]?.id ?? null;
  const add = () => {
    const id = addProduct(name, first);
    toast(id ? `Product added: ${name.trim() || 'new product'}` : 'Limit of 50 products reached');
    if (id) setName('');
  };
  return (
    <div className="ac-form-row">
      <label className="ac-field"><span className="ac-field-l">Name of the new product</span>
        <input type="text" value={name} placeholder="e.g. Payroll application" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
      </label>
      <button type="button" onClick={add}>Add a product</button>
    </div>
  );
}
