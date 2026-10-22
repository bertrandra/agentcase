import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { frenchHit, isAlias, userStrings } from '../helpers/englishOnly';

/** **All user-facing text is in English.** The multi-product work once shipped French labels; this guard keeps any French string out of app/src. */
const ROOT = join(process.cwd(), 'src');
const files = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? files(p) : /\.(tsx?|json)$/.test(n) ? [p] : []; });

describe('English only (user-facing text of app/src)', () => {
  it('no French string literal, JSX text or JSON value outside the compatibility aliases', () => {
    const found: string[] = [];
    for (const f of files(ROOT)) {
      if (f.endsWith('frenchAliases.ts')) continue;
      for (const [text, line] of userStrings(f, readFileSync(f, 'utf8'))) {
        const why = frenchHit(text);
        if (why && !isAlias(text)) found.push(`${f.slice(ROOT.length + 1)}:${line} [${why}] ${text.trim().slice(0, 90)}`);
      }
    }
    expect(found).toEqual([]);
  });
  it('detects French (negative test): accents, French words, French labels, elisions', () => {
    for (const s of ['Édition : produit', 'Lecture seule', 'Ajouter un produit', 'Vue', 'Modifier', 'Tous les produits', 'Équipe de :', 'l’équipe', 'Reste 10 % à répartir.', 'Portefeuille']) expect(frenchHit(s), s).not.toBeNull();
    const probe = 'export const x = "Aucun produit planifié"; export const y = <p>Vague suivante</p>;';
    expect(userStrings('probe.tsx', probe).map(([t]) => frenchHit(t) !== null)).toEqual([true, true]);
  });
  it('lets English through, including words that look French at a glance', () => {
    for (const s of ['Add a product', 'View', 'Portfolio stress', 'Revert to common', 'Edit: all products', 'Est. tokens Y3', 'modifier notes', 'a surcharge applies', 'Non-bypassable CI gates', 'ET — Effort & Tools']) expect(frenchHit(s), s).toBeNull();
  });
  it('the only French allowed are the legacy default names of a v20.0 file', () => {
    expect(isAlias('Produit 1') && isAlias('Vague 1') && !isAlias('Produit 2') && !isAlias('Add a product')).toBe(true);
  });
});
