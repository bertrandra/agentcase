import { useState } from 'react';
import { addWave } from '@/controllers/wave';
import { toast } from '@/ui/uiState';

/** "Add a wave": a name and the portfolio month it starts at (0 = the portfolio start). */
export function AddWave() {
  const [name, setName] = useState(''), [start, setStart] = useState('0');
  const add = () => {
    const id = addWave(name, Math.max(0, parseInt(start, 10) || 0));
    toast(id ? `Wave added: ${name.trim() || 'new wave'}` : 'Wave refused');
    if (id) setName('');
  };
  return (
    <div className="ac-form-row">
      <label className="ac-field"><span className="ac-field-l">Name of the new wave</span>
        <input type="text" value={name} placeholder="e.g. Wave 3" onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
      </label>
      <label className="ac-field"><span className="ac-field-l">Start of the new wave (month)</span>
        <input type="number" min={0} step={1} value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <button type="button" onClick={add}>Add a wave</button>
    </div>
  );
}
