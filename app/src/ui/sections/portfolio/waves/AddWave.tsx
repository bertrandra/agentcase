import { useState } from 'react';
import { addWave } from '@/controllers/wave';
import { toast } from '@/ui/uiState';

/** "Ajouter une vague": a name and the portfolio month it starts at (0 = the portfolio start). */
export function AddWave() {
  const [name, setName] = useState(''), [start, setStart] = useState('0');
  const add = () => {
    const id = addWave(name, Math.max(0, parseInt(start, 10) || 0));
    toast(id ? `Vague ajoutée : ${name.trim() || 'nouvelle vague'}` : 'Vague refusée');
    if (id) setName('');
  };
  return (
    <div className="ac-form-row">
      <label className="ac-field"><span className="ac-field-l">Nom de la nouvelle vague</span>
        <input type="text" value={name} placeholder="ex. Vague 3" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
      </label>
      <label className="ac-field"><span className="ac-field-l">Démarrage de la nouvelle vague (mois)</span>
        <input type="number" min={0} step={1} value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <button type="button" onClick={add}>Ajouter une vague</button>
    </div>
  );
}
