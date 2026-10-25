import ts from 'typescript';

/** One import of a module: `names` lists the named bindings used, null when the whole module is used (default, namespace, side effect, dynamic import). */
export interface Imp { spec: string; names: string[] | null; typeOnly: boolean }
/** `export { source as exported } from spec` (source null = namespace re-export); `export * from spec` is in `stars`. */
export interface ReExport { spec: string; exported: string; source: string | null }
export interface Parsed { imports: Imp[]; reexports: ReExport[]; stars: string[]; locals: Set<string>; globs: string[] }

const isExported = (n: ts.Node): boolean => (ts.canHaveModifiers(n) ? ts.getModifiers(n) : undefined)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  ?? false;
const text = (n: ts.ModuleExportName | ts.Identifier): string => n.text;

function importOf(d: ts.ImportDeclaration): Imp | null {
  if (!ts.isStringLiteral(d.moduleSpecifier)) return null;
  const spec = d.moduleSpecifier.text, c = d.importClause;
  if (!c) return { spec, names: null, typeOnly: false };
  const nb = c.namedBindings;
  if (c.name || (nb && ts.isNamespaceImport(nb))) return { spec, names: null, typeOnly: c.isTypeOnly };
  const els = nb && ts.isNamedImports(nb) ? nb.elements : [];
  const typed = c.isTypeOnly || (els.length > 0 && els.every((e) => e.isTypeOnly));
  return { spec, names: els.filter((e) => !e.isTypeOnly || c.isTypeOnly).map((e) => text(e.propertyName ?? e.name)), typeOnly: typed };
}

function declare(s: ts.Statement, locals: Set<string>): void {
  if (!isExported(s)) return;
  if (ts.isVariableStatement(s)) s.declarationList.declarations.forEach((v) => { if (ts.isIdentifier(v.name)) locals.add(v.name.text); });
  else if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s) || ts.isInterfaceDeclaration(s)
    || ts.isTypeAliasDeclaration(s)) && s.name) locals.add(s.name.text);
}

/** Static structure of one module: what it imports (with the names), what it re-exports and which names it declares. No type checker: syntax only. */
export function parseModule(file: string, src: string): Parsed {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Parsed = { imports: [], reexports: [], stars: [], locals: new Set(), globs: [] };
  for (const s of sf.statements) {
    if (ts.isImportDeclaration(s)) { const i = importOf(s); if (i) out.imports.push(i); continue; }
    if (ts.isExportDeclaration(s)) {
      const spec = s.moduleSpecifier && ts.isStringLiteral(s.moduleSpecifier) ? s.moduleSpecifier.text : null, ec = s.exportClause;
      if (spec && !ec) out.stars.push(spec);
      else if (spec && ec && ts.isNamespaceExport(ec)) out.reexports.push({ spec, exported: text(ec.name), source: null });
      else if (spec && ec && ts.isNamedExports(ec)) ec.elements.forEach((e) => out.reexports.push({ spec, exported: text(e.name),
        source: text(e.propertyName ?? e.name) }));
      else if (ec && ts.isNamedExports(ec)) ec.elements.forEach((e) => out.locals.add(text(e.name)));
      continue;
    }
    if (ts.isExportAssignment(s)) out.locals.add('default');
    else if (isExported(s) && (ts.getModifiers(s as ts.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))) out.locals.add('default');
    declare(s, out.locals);
  }
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0]
      && ts.isStringLiteralLike(n.arguments[0])) out.imports.push({ spec: n.arguments[0].text, names: null, typeOnly: false });
    else if (ts.isCallExpression(n) && n.expression.getText(sf) === 'import.meta.glob' && n.arguments[0]
      && ts.isStringLiteralLike(n.arguments[0])) out.globs.push(n.arguments[0].text);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}
