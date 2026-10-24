# Glossary — the English vocabulary of the multi-product interface

**All user-facing text is in English.** The multi-product build (v20.0, phases P1–P7 and V0) first shipped French labels; since v20.1 every label, tooltip,
ARIA name, toast, diagnostic, command label, Excel header and report sentence is English. This page fixes the words so they stay consistent.
(The specification [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md) and the aggregated-view document [VUE_AGREGEE.md](VUE_AGREGEE.md) are in English;
the user guide [GUIDE_MULTI_PRODUIT.md](GUIDE_MULTI_PRODUIT.md) stays in French with an English summary at the top (user decision D2); every UI label it quotes is the English one.) The guard `app/tests/ui/english-only.test.ts` fails on any French string in `app/src`.

| Former French label (v20.0) | English label | Where |
|---|---|---|
| Vue | **View** (top-bar selector) | `shell/ScopeSelect.tsx` |
| Portefeuille / Vague : X / Produit : Y | **Portfolio** / **Wave: X** / **Product: Y** | View selector, report scope |
| Produit(s), Vague(s), Portefeuille | **Product(s)**, **Wave(s)**, **Portfolio** | everywhere |
| Modifier : Tous les produits / Ce produit seulement | **Edit: All products / This product only** | `shell/ProductBar.tsx` |
| Édition : produit X | **Editing: product X** | banners, View selector |
| Équipe de : X | **Team of: X** | `widgets/ProductBanner.tsx` |
| Éditer ce produit | **Edit this product** | aggregate tables, drill-down |
| Calculé sur : … | **Calculated on: …** | `widgets/ScopeBanner.tsx` |
| Indépendant de la vue / Niveau portefeuille | **Independent of the view** / **Portfolio level** | scope banner |
| Lecture seule | **Read-only** | `widgets/ReadOnlyScope.tsx` |
| Vue consolidée à venir | **Consolidated view coming** | generic fallback |
| Vue agrégée | **Aggregate view** | docs, comments |
| hérité / surchargé | **inherited / overridden** | override chips |
| Surcharges (section) | **Overrides** | `🧬 Overrides` |
| Revenir au commun | **Revert to common** | override chip, Overrides section |
| Appliquer à tous les produits | **Apply to all products** | override chip, Overrides section |
| Valeur commune / Valeur du produit | **Common value / Product value** | Overrides section |
| non planifié / Non planifié | **unscheduled / Unscheduled** | Waves board, tables |
| Ajouter un produit / Ajouter une vague | **Add a product / Add a wave** | Welcome, Products, Waves |
| Déplacer vers la vague… | **Move to wave…** | product card menu |
| Démarrage (mois) / Décalage (mois) | **Start (month) / Offset (months)** | waves, products |
| Préparation du transfert | **Knowledge transfer preparation** | Knowledge hub, KT table |
| Domaines de connaissance | **Knowledge domains** | Knowledge hub |
| Reste X % à répartir | **X% left to allocate** | domains editor |
| Enregistrer / Retirer | **Save / Remove** | domains editor |
| Stress portefeuille | **Portfolio stress** | `🎲 Portfolio stress` |
| Tirages par produit / Graine / Corrélation entre produits ρ | **Draws per product / Seed / Correlation between products ρ** | Portfolio stress |
| Réduction du risque | **Risk reduction** | Portfolio stress |
| Économies / Coût de fonctionnement / Mise en place / Retour / VAN calendaire | **Savings / Run cost / Setup / Payback / Calendar NPV** | Consolidation |
| ETP | **FTE** | tables and workbooks |
| Année N | **Year N** | consolidation, report |
| Périmètre | **Scope** | KPI tile |
| Produit 1 / Vague 1 (default names) | **Product 1 / Wave 1** | `envelopeCase`, new product / wave |

## Compatibility aliases (the only French left in `app/src`)

`app/src/domain/portfolio/frenchAliases.ts` (`FRENCH_ALIASES`) lists them; the guard lets exactly these through.

- **Default names of a v20.0 file**: `Produit 1` (first product) and `Vague 1` (first wave). `isDefaultProductName` / `isDefaultWaveName` accept both languages, so the F22
  single-case rule (`isSingleCase`) still saves such a case as a plain `agentcase.snapshot.v1`; files that carry French names keep them (names are user data); everything
  written is English.
- **Excel sheet and column names** of the portfolio workbooks (`Products`, `Waves`, `TeamIn`, `Overrides`, `KnowledgeSubsets`, `KnowledgeDomains`, `PortfolioSettings`) were
  already English in v20.0, so a v20.0 workbook imports unchanged and no French sheet alias is needed. The results workbooks and the report are output only.
- **Legacy-oracle text** that the frozen v18.13 file itself shows and that golden fixtures compare character for character (`mémoire vivante` in the Knowledge hub callout,
  `mois` in the strategy comparison table, `ETP` in the section catalogue description) is kept verbatim.
