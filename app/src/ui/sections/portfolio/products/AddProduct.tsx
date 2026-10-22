import { useState } from 'react';
import { addProduct } from '@/controllers/product';
import { useWaves } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';

/** "Ajouter un produit": a new product inherits every common value and has its own default team; it joins the first wave when there is one. */
export function AddProduct() {
  const [name, setName] = useState(''), first = useWaves()[0]?.id ?? null;
  const add = () => {
    const id = addProduct(name, first);
    toast(id ? `Produit ajouté : ${name.trim() || 'nouveau produit'}` : 'Limite de 50 produits atteinte');
    if (id) setName('');
  };
  return (
    <div className="ac-form-row">
      <label className="ac-field"><span className="ac-field-l">Nom du nouveau produit</span>
        <input type="text" value={name} placeholder="ex. Application Paie" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
      </label>
      <button type="button" onClick={add}>Ajouter un produit</button>
    </div>
  );
}
