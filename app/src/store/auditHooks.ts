/** @calc-zone process-model */
import { useCallback, useMemo } from 'react';
import { activityAudits, effectiveCatalog, productAuditOf, readAudit, unitAuditOf, unitScope, withElementAudits, type ActivityAudit,
  type AuditModel, type AuditScopeKind, type CatalogTool, type ElementAudit,
} from '@/domain/audit';
import { orgExtOf, type OrgModel } from '@/domain/org';
import { productAuditTarget, editsCommon } from './commonEdit';
import { appStore } from './instance';
import { readProcess, type ActorView, type XDocument } from '@/domain/process';
import { scopeUnitId, useAuditUnit } from './auditScope';
import { useDoc, usePortfolio } from './hooks';
import { useOrgSelector } from './orgHooks';

/**
 * The audit scope the section shows (owner's request 2026-11-13): what is audited, its name, the activities and roles it covers (null: every one
 * of the document), the layer it records in and what it inherits.
 */
export interface AuditScopeInfo {
  kind: AuditScopeKind; id: string; name: string;
  activities: ReadonlySet<string> | null; roles: ReadonlySet<string> | null;
  /** the products a unit's teams serve (names) */
  serves: string[];
  /** the elements whose audit the scope's own layer holds; null = the document's own audit (nothing inherited) */
  own: ReadonlySet<string> | null;
  /** the audits the scope reads under its own layer (by element id), and where they come from */
  inherited: ReadonlyMap<string, ElementAudit>; inheritedFrom: string;
  /** calibration: allowed in this scope (an organisation unit's observations refine, they do not calibrate) */
  calibrates: boolean;
}

/** What the 🔎 Audit section reads (docs/SPEC_BPMN.md § 15): the shown case's document, its audit, the activities and the catalogue. */
export interface AuditViewData {
  doc: XDocument; audit: AuditModel;
  /** the activities of the scope (every activity of the document for the Portfolio and a Product) */
  rows: ActivityAudit[];
  catalog: CatalogTool[];
  /** the roles of the scope (every resource for the Portfolio and a Product) */
  actors: ActorView[];
  scope: AuditScopeInfo;
}

const NO_ORG: OrgModel = { units: [], teams: [], roles: [], activities: [], products: [] };

interface Layer { kind: AuditScopeKind; id: string; name: string; own: Map<string, ElementAudit> | null; from: string }

/** The layer the section edits: the unit's (when one is picked and exists), the product's own (FX-D6) or the document's. */
function layerOf(m: OrgModel, unit: string | null, product: string | null, common: boolean, productName: string): Layer {
  const pf = appStore().getState().portfolio, c = pf.common.BPMN as XDocument | undefined, u = unit ? m.units.find((x) => x.id === unit) : undefined;
  const base = common ? 'Portfolio' : productName;
  if (u) return { kind: u.service ? 'service' : 'unit', id: u.id, name: u.name, own: unitAuditOf(c, u.id), from: base };
  if (product) return { kind: 'product', id: product, name: productName, own: productAuditOf(c, product), from: 'Portfolio' };
  return { kind: common ? 'portfolio' : 'product', id: common ? 'portfolio' : pf.activeProductId, name: base, own: null, from: '' };
}

/** The audit of the shown scope, recomputed only when its process document, the organisation or the scope changes. */
export function useAuditData(): AuditViewData {
  const base = useDoc((d) => d.BPMN), product = usePortfolio(productAuditTarget), part = usePortfolio((p) => orgExtOf(p.common.BPMN as XDocument));
  const local = useAuditUnit(), common = usePortfolio(editsCommon), unit = usePortfolio((p) => scopeUnitId(p, local));
  // the organisation model only while a unit is audited: a rename of the customer (the default unit's name) re-renders nothing otherwise
  const org = useOrgSelector(useCallback((m: OrgModel) => (unit ? m : NO_ORG), [unit]));
  const productName = usePortfolio((p) => p.products.find((x) => x.id === p.activeProductId)?.name ?? 'This case');
  return useMemo(() => {
    const layer = layerOf(org, unit, product, common, productName), c = appStore().getState().portfolio.common.BPMN as XDocument;
    // FX-D6: a product sharing the common process sees (and edits) its own audit, laid over the document's; a unit's lies over that
    const shown = product ? withElementAudits(base, productAuditOf(c, product)) : base;
    const isUnit = layer.kind === 'service' || layer.kind === 'unit';
    const doc = isUnit && layer.own ? withElementAudits(shown, layer.own) : shown;
    const inheritedDoc = isUnit ? shown : base;
    const audit = readAudit(doc), us = isUnit ? unitScope(org, layer.id) : null, all = readProcess(doc).actors;
    const scope: AuditScopeInfo = {
      kind: layer.kind, id: layer.id, name: layer.name, activities: us?.activities ?? null, roles: us?.roles ?? null,
      serves: us?.products.map((p) => p.name) ?? [], own: layer.own ? new Set(layer.own.keys()) : null,
      inherited: layer.own ? readAudit(inheritedDoc).elements : new Map(), inheritedFrom: layer.from, calibrates: layer.kind !== 'unit',
    };
    const rows = activityAudits(doc).filter((r) => !us || us.activities.has(r.id));
    const actors = us ? all.filter((a) => us.roles.has(a.id)) : all;
    return { doc, audit, rows, catalog: effectiveCatalog(audit), actors, scope };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `part` is the identity of the organisation part
  }, [base, product, part, common, unit, org, productName]);
}
