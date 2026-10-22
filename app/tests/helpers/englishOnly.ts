import ts from 'typescript';
import { FRENCH_ALIASES } from '@/domain/portfolio/frenchAliases';

/**
 * The "all user-facing text is in English" guard. `userStrings` lists the text a user can read in a source file (string literals, template
 * chunks, JSX text, JSON values; never comments, identifiers or import paths) and `frenchHit` says why a string looks French (or null).
 */
const ACCENT = /[éèêëàâùûüçîïôœ]/;
/** French-only words (lower case, whole word). Words that are also English (modifier, surcharge, note, ...) are left to the exact-label list. */
const WORDS = new Set(('le la les des du pour avec sans dans une aux sont chaque tous toutes cette ces mois année portefeuille portefeuilles vague vagues produit produits ' +
  'équipe ajouter supprimer renommer dupliquer archiver restaurer activer retirer enregistrer déplacer cliquer choisir filtrer lancer lancez affectez glissez ' +
  'surcharges aucun aucune seulement ci-dessous ci-dessus lecture seule hérité surchargé planifié planifiés périmètre vue agrégée tirages graine nouveau nouvelle ' +
  'erreur refusée refusé introuvable invalide domaine domaines poids valeur valeurs commun commune communs communes tableau calendaire actif archivé supprimé retour démarrage décalage trésorerie économies').split(' '));
/** Words so short or so common in English that they only count next to another French word (eg "Vue", "Modifier" alone as a whole label). */
const LABELS = new Set(['Vue', 'Modifier', 'Supprimer', 'Dupliquer', 'Archiver', 'Restaurer', 'Activer', 'Retirer', 'Enregistrer', 'Annuler', 'Fermer', 'Ouvrir', 'Valider', 'Ajouter', 'Réinitialiser']);

export function frenchHit(text: string): string | null {
  const s = text.trim();
  if (!s || s.startsWith('data:') || /^https?:/.test(s)) return null;
  if (LABELS.has(s)) return s;
  const acr = /\b(ETP|VAN)\b/.exec(s);
  if (acr) return acr[0];
  const accent = ACCENT.exec(s.toLowerCase());
  if (accent) return accent[0];
  for (const w of s.toLowerCase().split(/[^a-zàâçéèêëîïôûùüœ'’-]+/)) if (WORDS.has(w.replace(/^['’-]+|['’-]+$/g, ''))) return w;
  return /\bl[’']\w|\bd[’']\w|\bqu[’']\w|\bn[’']\w/.test(s) ? "l'" : null;
}

/** The compatibility aliases (legacy French names a v20.0 file may carry) are the only French text allowed in the source. */
const ALIASES = new Set<string>([...FRENCH_ALIASES.defaultProductNames, ...FRENCH_ALIASES.defaultWaveNames]);
/** `file` is the path under src/: the legacy-oracle strings are only allowed in the file that mirrors the oracle. */
export const isAlias = (s: string, file = ''): boolean => ALIASES.has(s.trim()) || Object.entries(FRENCH_ALIASES.legacyOracle).some(([f, ss]) => file.endsWith(f) && ss.includes(s.trim()));

const SKIP_PARENTS = new Set([ts.SyntaxKind.ImportDeclaration, ts.SyntaxKind.ExportDeclaration, ts.SyntaxKind.LiteralType, ts.SyntaxKind.ExternalModuleReference]);

/** Every user-readable string of a TS / TSX / JSON source: [text, 1-based line]. */
export function userStrings(file: string, source: string): [string, number][] {
  const out: [string, number][] = [];
  if (file.endsWith('.json')) {
    const walk = (v: unknown): void => {
      if (typeof v === 'string') out.push([v, source.slice(0, Math.max(0, source.indexOf(JSON.stringify(v).slice(1, -1)))).split('\n').length]);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    try { walk(JSON.parse(source)); } catch { /* invalid JSON is not this test's business */ }
    return out;
  }
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const at = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node): void => {
    if (SKIP_PARENTS.has(n.kind)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { if (!ts.isPropertyAssignment(n.parent) || n.parent.name !== n) out.push([n.text, at(n)]); }
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) out.push([n.text, at(n)]);
    else if (ts.isJsxText(n)) out.push([n.text, at(n)]);
    n.forEachChild(visit);
  };
  visit(sf);
  return out;
}
