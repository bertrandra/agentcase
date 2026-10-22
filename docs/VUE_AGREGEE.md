# Vue agrégée : toutes les sections suivent la vue de la barre haute

> Statut : **phase V0 réalisée** (fondation + classification + 2 exemplaires). Les phases suivantes remplissent les agrégats groupe par groupe.
> Décision utilisateur : « *TOUTES les sections sont calculées sur la sélection du sélecteur Vue de la barre haute : Portefeuille, une Vague ou un Produit* ».

## 1. Principe

1. **Sections de résultat** : elles suivent la Vue. Portefeuille / Vague = chiffres consolidés du domaine (`consolidate`, `portfolioHeadline`, `waveHeadline`, `selectionView`, `portfolioGantt`...) ; Produit = comportement d’aujourd’hui, inchangé.
2. **Sections de saisie** : elles restent **par produit** (le produit édité). Avec Portefeuille ou Vague en vue, elles affichent une **vue agrégée en lecture seule** de la sélection : une ligne par produit et le bouton **“Edit this product”** (contrôleur existant `showProduct` : la Vue devient ce produit, les sections redeviennent modifiables).
3. **Les 85 sections sont classées** (§ 4). Aucune formule financière nouvelle dans `ui/` (règle A8 étendue : pas de `.reduce` dans les widgets, hooks et agrégats de la Vue agrégée) ; pas de « cas agrégé synthétique » (faux pour le plafond de verre, les surcharges, les décalages de vague).
4. **Un seul produit : rien ne change** (ni bandeau, ni enveloppe DOM dans `SectionHost`). Le mode Produit des sections reste identique octet pour octet.

## 2. Mécanisme tel que construit

| Pièce | Où | Rôle |
|---|---|---|
| Type de chaque section | `ui/zones/data/sectionScope.json` + `ui/zones/sectionScope.ts` (`sectionKind`, `followsView`) | une donnée par id (85) ; le test `tests/ui/section-scope.test.ts` exige exactement les 85 ids du catalogue |
| `useViewScope()` | `store/viewScope.ts` | `{ kind: 'product'|'wave'|'portfolio', label, multi, productIds[] (planifiés, non archivés), excludedIds[], waveId?, activeProductId, activeProductName }`, référence stable ; dans un `ProductViewContext` la Vue est ce produit |
| `ProductViewContext` | `store/productView.ts` (+ `ProductViewProvider`, `productDocOf`) | lecture seule d’un autre produit : `useDoc`, `useCtx`, `useCaseResult`, `useSimulation`, `useActiveProduct`, `useActiveProductId`, `useFieldState`, `useSubsetField` lisent le cas résolu de ce produit au lieu du produit actif. Les écritures ne sont pas redirigées |
| `ReadOnlyScope` | `ui/widgets/ReadOnlyScope.tsx` | `fieldset disabled` + capture et arrêt des événements clic / clavier / change / input / submit / drop + message de lecture seule ; `inert` en option |
| `ScopeBanner` | `ui/widgets/ScopeBanner.tsx`, rendu par `SectionFrame` | une phrase par type, région `aria-live="polite"`, rien avec un seul produit ni dans un rendu par produit |
| `AggregateTable` | `ui/widgets/AggregateTable.tsx` | une ligne par produit, colonnes déjà calculées par le domaine, **ligne de total fournie par le domaine** (jamais sommée dans l’UI), bouton “Edit this product” (`showProduct` + annonce) |
| `ProductDrill` | `ui/widgets/ProductDrill.tsx` | rendu repliable, paresseux, en lecture seule, du composant de la section pour chaque produit (`ProductViewContext`) ; `SectionFrame` y devient `EmbeddedFrame` (pas de h1, zones nommées par produit) |
| `useScopedSection(id)` | `ui/zones/useScopedSection.ts` | produit / un seul produit / `S-static` / `P-portfolio` : la section telle quelle ; sinon l’agrégat enregistré, sinon le **repli générique** du type (`ui/zones/fallbacks.tsx`) |
| Registre d’agrégats | `ui/sections/aggregates/index.ts` + `aggregates/<groupe>.ts` (15 fichiers, un par groupe) | id → chargeur paresseux, comme les chargeurs de sections ; `SectionHost` les utilise pour Portefeuille / Vague |
| Vues domaine | `domain/portfolio/{selectionView,teams,inputSummary}.ts` | `selectionView` (chiffres consolidés d’une sélection), `aggregateTeams` (équipes sommées), `inputSummary` (comptes par produit) |
| Hooks | `store/selectionHooks.ts` | `useSelectionView`, `useInputSummary`, `useTeamAggregate` |

Replis génériques par type (Portefeuille / Vague, section sans agrégat) :

- `R-rollup` : `AggregateTable` des chiffres clés par produit (`SelectionRow`, total = ligne du domaine) + `ProductDrill`.
- `I-input` : `AggregateTable` des saisies par produit (ETP, artefacts, surcharges, état du hub ; total ETP = `aggregateTeams`) + “Edit this product”.
- `R-conso` sans agrégat enregistré : `ProductDrill` + note explicite “Consolidated view coming” (suivi en § 5).

## 3. Recette : ajouter l’agrégat d’une section (10 lignes)

1. Repérer l’id et son type dans `sectionScope.json` (ne le changer que si la classification est fausse, et alors mettre à jour ce document).
2. Écrire la fonction **pure** manquante dans `domain/portfolio/` (jamais de somme dans l’UI) avec son test (1e-9 contre `consolidate` / `computeCase`) ; l’exporter par `domain/portfolio/index.ts`.
3. Ajouter, si besoin, un hook dans `store/selectionHooks.ts` (`useViewScope()` donne `productIds`, `kind`, `label`).
4. Créer `ui/sections/<groupe>/<section>/Aggregate.tsx` (export `default`), ≤ 150 lignes : `<SectionFrame title=… result=…/>` avec `AggregateTable` (totaux du domaine) ; la règle A8 s’y applique d’office (`Aggregate*.tsx` ou dossier `aggregate/`).
5. Pour un rendu par produit : `<ProductDrill Section={…} productIds={vs.productIds} />` (le composant s’exécute sous `ProductViewContext`, en lecture seule).
6. Enregistrer **une ligne** dans `ui/sections/aggregates/<groupe>.ts` : `'id': () => import('../<groupe>/<section>/Aggregate'),`.
7. Pour une section déjà sensible à la vue, enregistrer son propre composant (exemples : `decision`, `gantt`).
8. Test RTL (store réel, `threeProducts`) : Portefeuille, Vague et Produit égaux au domaine à 1e-9 ; produit non planifié exclu avec l’avertissement ; un seul produit inchangé.
9. Audit : `node ../tools/a11y.mjs --fixtures pf-three-products --sections "<libellé>"` (Portefeuille et Vague sont audités), puis restaurer `app/a11y-report.json`.
10. Passer l’état de la section à FAIT dans le tableau du § 4 et retirer-la du suivi du § 5.

## 4. Classification des 85 sections

Total : **85 = 79 sections de cas + 6 du groupe Portefeuille** (le groupe compte 6 sections au catalogue, pas 7 : produits, surcharges, knowledge transfer, vagues, consolidation, stress portefeuille).

| Type | Nombre | Sens |
|---|---|---|
| `R-conso` | 15 | résultat à forme consolidée naturelle (sommes et séries de `domain/portfolio`) |
| `R-rollup` | 28 | contrôle ou logique par cas, qui ne s’additionne pas : tableau récapitulatif par produit + détail du rendu propre au produit |
| `I-input` | 18 | saisie par produit : synthèse agrégée en lecture seule, une ligne par produit, “Edit this product” |
| `S-static` | 18 | référence, documentation, réglages communs, gestion : indépendant de la vue (bandeau “Independent of the view”) |
| `P-portfolio` | 6 | section du groupe Portefeuille, déjà au niveau portefeuille (bandeau “Portfolio level”) |

Légende de l’état : **FAIT** (construit en V0), **NATIF** (la section suit déjà la Vue ; elle est enregistrée comme son propre agrégat), **À FAIRE** (repli générique du type en attendant).

| id | Groupe | Libellé | Type | Contenu agrégé prévu / raison | Source domaine | État |
|---|---|---|---|---|---|---|
| `home` | frame | 🏠 Welcome | `S-static` | Bandeau seul. Page d’accueil : navigation seulement, ne calcule rien | — | FAIT (bandeau) |
| `engagement-context` | frame | 🧭 Engagement context | `I-input` | Cadre contractuel MSC/MSI/STA par produit (hérité/surchargé) | `inputSummary` + `values.engagementCtx` du cas résolu | À FAIRE |
| `engage` | frame | 🤝 Engage | `I-input` | Durées des 4 étapes d’onboarding et fin d’onboarding par produit | cas résolu de chaque produit (`dom.values`) | À FAIRE |
| `transform-params` | frame | 🏛️ Industry / regulatory profile | `I-input` | Profil sectoriel/réglementaire et normes cochées par produit | `selectedNorms`, `values.*` du cas résolu | À FAIRE |
| `params` | scope | 🎯 Automation & Glass ceiling | `I-input` | Potentiel cible et plafond de verre (forcé ou calculé) par produit | `model.eff`, `model.ceiling`, `forceGlassCeiling` | À FAIRE |
| `scurve` | scope | 📊 S-curve — adoption ramp | `I-input` | Rampe d’adoption Y1/Y2/Y3 par produit | `scurve` du cas résolu | À FAIRE |
| `maturity-map` | tune | 📐 Maturity levels (L1–L4) | `I-input` | Seuils de maturité L1-L4 par produit | `MATURITY_MAP` | À FAIRE |
| `readiness` | tune | 🧭 AI Readiness | `R-rollup` | Indice 0-100 par produit et dimension la plus faible ; pas de total | `tune` readiness du cas résolu de chaque produit (drill) | À FAIRE |
| `scope-sel` | scope | 🎯 Scope | `I-input` | Nombre d’artefacts SDLC / réglementaires retenus par produit | `inputSummary` (`artefacts`, `regArtefacts`) | À FAIRE |
| `phase-scope` | scope | 🎯 Phase scope | `I-input` | Phases désactivées par produit | `phaseOff` du cas résolu | À FAIRE |
| `lc-weighting` | scope | 📊 Product status lifecycle weighting | `I-input` | Position du produit dans le cycle de vie | `lifecycleUse`, `lifecyclePos` | À FAIRE |
| `lifecycle-edit` | tune | 📊 Status & phase weight | `I-input` | Matrice de poids et posture par statut, par produit | `statusLifecycle` | À FAIRE |
| `team-in` | baseline | Input team | `I-input` | FAIT (exemplaire) : ETP par produit, agrégé par compétence, grade, localisation et croisé ; “Edit this product” | `aggregateTeams(pf, productIds)` | FAIT |
| `ratecard` | baseline | Rate Card | `S-static` | Bandeau seul. Taux journaliers : valeurs communes (D-M3, clé `RATE`), identiques pour tous les produits | — | FAIT (bandeau) |
| `loc-strat` | baseline | 🌍 Location strategy | `I-input` | Répartition cible par localisation, par produit | `targetLocPct` du cas résolu | À FAIRE |
| `token-econ` | tune | 💸 Token economics | `R-rollup` | Usage et coût de tokens par produit (la série `token` se somme) ; catalogue de prix commun | `series.token` + usage par produit ; saisies communes (`TOKEN_MODELS`) | À FAIRE |
| `knowledge` | tune | 🧠 Knowledge hub | `I-input` | Knowledge Hub (CC0-CC4) : état initial/cible, sous-ensemble propre, par produit ; renvoi vers Knowledge transfer | `inputSummary.hub`, `knowledgeRow` | À FAIRE |
| `run-sizing` | tune | 🤖 Run-team sizing | `I-input` | Politique de dimensionnement de l’équipe run par produit | `dom.values` du cas résolu | À FAIRE |
| `assumptions` | defend | 📒 Assumptions register | `R-rollup` | Hypothèses écartées du défaut, non validées par le client, impact mesuré, par produit ; statuts de validation communs | `domain/pdc/assumptions` par produit | À FAIRE |
| `fte-vfte` | verify | FTE / vFTE | `R-conso` | Trajectoire ETP humains vs vFTE agents par année calendaire, une courbe par vague/produit | `series.humanFte`, `series.agentVfte` (`byYear`/dernier mois), `waves` | À FAIRE |
| `vfte-ov` | verify | vFTE Overview | `R-rollup` | Composition du vFTE par produit | `verifyA` vfte-ov par produit | À FAIRE |
| `team-out` | verify | Target team | `R-conso` | Équipe TO-BE agrégée par compétence, grade et localisation, tableau par produit | nouvelle fonction pure `aggregateTargetTeams` (domaine/portfolio) sur `verifyA` team-out de chaque produit planifié | À FAIRE |
| `opmodel` | tune | 🧩 Operating model | `R-rollup` | Pods, rôles transverses et AI Office par produit + contrôle de conservation V7 (ok/ko) | `domain/tune` opmodel par produit | À FAIRE |
| `tobe-team` | verify | 👥 TO-BE team by skill | `R-conso` | ETP humains résiduels et vFTE agents par compétence, sommés sur la sélection | idem : agrégat par compétence des `verifyA` tobe-team des produits | À FAIRE |
| `montecarlo` | stress | 🎲 Monte Carlo | `R-rollup` | P10/P50/P90 par produit issus du stress portefeuille s’il a tourné, sinon invitation à le lancer | `ProductStress` de `portfolioMonteCarlo` (`store/portfolioSimulation`) | À FAIRE |
| `model-stochastic` | model-engine | 📊 Stochastic layer (P4) | `R-rollup` | P50 et graine par produit ; renvoi vers Portfolio stress | `domain/model/modelState`, `portfolioMonteCarlo` | À FAIRE |
| `phase-art` | verify | Phase / Artifact detail | `R-rollup` | Périmètre phases/artefacts par produit (nombre, effort) ; jamais de somme par artefact (périmètres différents) | `verifyA` phase-art par produit | À FAIRE |
| `agent-dir` | verify | Agent Directory | `R-rollup` | Nombre d’agents par niveau d’autorisation et par produit | `verifyA` agent-dir par produit | À FAIRE |
| `agent-detail` | verify | 🤖 Agent details | `R-rollup` | Charge par rôle d’agent, produit par produit | `verifyA` agent-detail par produit | À FAIRE |
| `agent-usage` | verify | 📊 Agent usage | `R-conso` | Exécutions, tokens et coût par rôle d’agent, sommés sur la sélection | nouvelle fonction pure `aggregateAgentUsage` (somme par rôle des `verifyA` agent-usage) | À FAIRE |
| `model-convergence` | model-engine | 🔁 Loop convergence | `R-rollup` | Boucles bornées/non convergées par produit | `domain/model/lce` par produit | À FAIRE |
| `model-supervision` | model-engine | 🧑‍✈️ Supervision (P3) | `R-rollup` | Mode de supervision et coût par produit | `domain/model/supView` | À FAIRE |
| `setup` | tune | Agentic Setup | `I-input` | Coûts de mise en place (outillage, formation, coaching, gouvernance) par produit ; total = somme domaine | `domain/tuneB/setup` par produit | À FAIRE |
| `run` | economics | Agentic Run | `R-conso` | Coût de fonctionnement consolidé par année et par mois (équipe run, tokens, infrastructure, Knowledge Hub), une ligne par produit + total | `consolidate().series` (`run`, `token`, `infra`, `khCost`) et `headline.years` ; la ventilation fine équipe/agents par produit demande une vue domaine à ajouter | À FAIRE |
| `annual` | economics | Annual summary | `R-conso` | Tableau année par année calendaire du portefeuille / de la vague : économies, coût, mise en place, net, ETP humains et vFTE fin d’année | `portfolioHeadline`/`waveHeadline` (`years`, `fte`), `series.humanFte`/`agentVfte` via `byYear` | À FAIRE |
| `monthly` | economics | Monthly detail | `R-conso` | Détail mensuel calendaire : économies, coût, mise en place, net, trésorerie cumulée, ETP/vFTE, en option par produit | `consolidate().series` + `summary.cum` (`selectionView.chart`) | À FAIRE |
| `monthly-playback` | present | 🎬 Monthly Playback | `R-conso` | Lecture mensuelle de la trajectoire consolidée (ETP, coût, économies) ; vélocité et coût par point en pondéré | `consolidate().series`, `weightedVelocity` ; coût par point : vue domaine à ajouter | À FAIRE |
| `exec` | verify | Execution Timeline | `R-rollup` | Jalons du programme (début, fin d’onboarding, premier vFTE) par produit, décalés de `month0` | `portfolioGantt` (jalons) ; durées d’onboarding : `verifyB` | À FAIRE |
| `productivity` | verify | Productivity | `R-rollup` | Productivité par ETP : une ligne par produit ; pas de total sans moyenne pondérée au domaine | `verifyB` par produit | À FAIRE |
| `velocity` | verify | Velocity | `R-rollup` | Vélocité par produit ; total = `weightedVelocity` de la sélection | `verifyB`, `weightedVelocity` | À FAIRE |
| `quality` | verify | Quality | `R-rollup` | Indicateurs qualité par produit (non additifs) | `verifyB` par produit | À FAIRE |
| `compliance` | verify | Compliance | `R-rollup` | Couverture de conformité par produit | `verifyB` par produit | À FAIRE |
| `financial` | economics | 💳 Financial | `R-conso` | FAIT (exemplaire) : cartes ROI/retour/VAN/net, trésorerie cumulée, tableau par produit, flux par année calendaire, produits exclus signalés | `selectionView` ← `consolidate`, `scopeHeadline`, `consolidationView` | FAIT |
| `model-flow` | model-engine | ⏱️ Flow & value (P5) | `R-rollup` | Temps de cycle (Little) et VAN du time-to-market par produit | `domain/model/flow` par produit | À FAIRE |
| `gantt` | verify | 📅 Gantt / Timeline | `R-conso` | NATIF : Gantt par vague avec produits dépliables (`Waves.tsx`) ; enregistré comme agrégat | `portfolioGantt` ← `consolidate` | NATIF |
| `board` | configure | 📊 Board | `S-static` | Bandeau seul. Configuration des sections dynamiques : commune | — | FAIT (bandeau) |
| `factory-model` | factory | 🏭 Factory Model | `S-static` | Bandeau seul. Méta-modèle d’usine : données communes hors liste blanche (AMBIGU, voir § Ambiguïtés) | — | FAIT (bandeau) |
| `release-pipeline` | factory | 🚀 Release Pipeline | `S-static` | Bandeau seul. Idem : données communes, brouillon | — | FAIT (bandeau) |
| `engineering` | factory | ⚙️ Engineering | `S-static` | Bandeau seul. Idem : compteurs saisis, communs | — | FAIT (bandeau) |
| `factory-timeline` | factory | 📅 Factory Timeline | `S-static` | Bandeau seul. Idem : calendrier d’événements communs | — | FAIT (bandeau) |
| `commercial` | present | 💼 Commercial model | `R-rollup` | Modèle commercial par produit (gain sharing non linéaire : pas de somme) | `domain/pdc/commercial` par produit | À FAIRE |
| `scenarios` | stress | 🔀 Scenarios | `R-rollup` | Produit × 6 scénarios : ROI et retour ; pas de scénario portefeuille (limite connue) | `domain/stress` scénarios par produit | À FAIRE |
| `kpi` | verify | KPI Scorecard | `R-conso` | KPI financiers consolidés (retour, VAN, ROI, économies) et vélocité pondérée ; les KPI qualité non additifs restent en tableau par produit | `portfolioHeadline` (`velocityPct` = `weightedVelocity`) ; AMBIGU, voir § Ambiguïtés | À FAIRE |
| `asis-tobe` | verify | AS-IS vs TO-BE | `R-conso` | Avant / après consolidé : ETP, coût de référence vs to-be, mise en place, automatisation effective et plafond de verre pondérés | `headline.fte`, `headline.costReduction`, `eff`/`ceiling` (`weightedAutomation`) | À FAIRE |
| `compare` | stress | 3-way Comparison | `R-rollup` | Écart à la photo de référence par produit | `domain/stress` compare, photos communes | À FAIRE |
| `sensitivity` | stress | Sensitivity | `R-rollup` | Paramètre le plus sensible et amplitude par produit | `domain/stress` sensibilité par produit | À FAIRE |
| `sources` | refshare | Sources | `S-static` | Bandeau seul. Documentation : sources et références | — | FAIT (bandeau) |
| `results` | verdict | 📋 Results | `R-conso` | Verdict de la sélection, chiffres clés, bande d’incertitude (distribution portefeuille), décomposition des économies, glissement d’équipe | `portfolioHeadline`, `pfDecision`/`groupDecision` (stress portefeuille), `headline.fte` ; origine des économies : vue domaine à ajouter | À FAIRE |
| `story-summary` | present | 📖 The story so far | `R-conso` | Récit AS-IS → TO-BE de la sélection : équipe, coût, livraison ; confiance en tableau par produit | `headline.fte`, `costReduction`, `velocityPct`, `eff`, `ceiling` | À FAIRE |
| `decision` | verdict | 🧭 Decision Intelligence | `R-conso` | NATIF : verdict de la distribution du portefeuille / de la vague (`PortfolioVerdict`) ; enregistré comme agrégat | `pfDecision`, `groupDecision`, `store/portfolioSimulation` | NATIF |
| `model-evidence` | model-engine | 📋 Evidence ledger (P6) | `R-rollup` | Grade de confiance A-D et provenance par produit | `domain/model/evidence` par produit | À FAIRE |
| `strategies` | verdict | 🏆 Strategy comparison | `R-rollup` | 7 stratégies : stratégie recommandée, ROI et TCO par produit | `domain/verdict` stratégies par produit | À FAIRE |
| `arch-layers` | refshare | 🏛️ Architecture — Layers | `S-static` | Bandeau seul. Documentation d’architecture | — | FAIT (bandeau) |
| `arch-content` | refshare | 🏛️ Architecture — Layers content | `S-static` | Bandeau seul. Documentation d’architecture | — | FAIT (bandeau) |
| `verif` | defend | 🔍 Logic verification | `R-rollup` | Contrôles de logique : nombre d’échecs par produit (16 contrôles, 67 lignes de convergence) ; statut global = pire | `domain/pdc/verifChecks`, `verifConvergence`, `verifProvenance`, `verifSensi` | À FAIRE |
| `eligibility` | tune | 🎯 Eligibility & Abaques | `R-rollup` | Porte d’éligibilité (franchie / bloquée) et abaques par produit | `domain/tune` eligibility par produit | À FAIRE |
| `model-verification` | model-engine | 🛡️ Verification tax (P2) | `R-rollup` | Taxe de vérification V par produit | `domain/model/vtax`, `evt` | À FAIRE |
| `maturity` | tune | 📐 Maturity & Measurement | `I-input` | Maturité SDD/outillage et courbe de coaching par produit | `dom.values` du cas résolu | À FAIRE |
| `program` | tune | 🧭 Program & Completeness | `I-input` | Pilote, capacité interne, surcharge multi-pod par produit | `dom.values` du cas résolu | À FAIRE |
| `risk` | tune | 🛡️ Risk & Compliance | `I-input` | Registre de risques, palier AI Act et prime de risque par produit | `dom.values` du cas résolu | À FAIRE |
| `reference` | refshare | 🗺️ Reference Map | `S-static` | Bandeau seul. Carte de référence du modèle de livraison | — | FAIT (bandeau) |
| `deps` | refshare | 🔗 Section Dependencies | `S-static` | Bandeau seul. Matrice de dépendances entre sections (statique) | — | FAIT (bandeau) |
| `datamodel` | refshare | 🗄️ Data Model | `S-static` | Bandeau seul. Modèle de données de l’application (catalogue, registre d’état) | — | FAIT (bandeau) |
| `calcengine` | refshare | ⚙️ Calculation Engine | `S-static` | Bandeau seul. Documentation du moteur de calcul | — | FAIT (bandeau) |
| `glossary` | refshare | 📖 Delivery-model glossary | `S-static` | Bandeau seul. Glossaire | — | FAIT (bandeau) |
| `io` | refshare | 📥 Import / Export | `S-static` | Bandeau seul. Import/export et bibliothèque de photos ; le choix du périmètre d’export a déjà son propre sélecteur (`ReportPanel`) | — | FAIT (bandeau) |
| `sessions` | refshare | 🗂️ Session manager | `S-static` | Bandeau seul. Reprise d’autosauvegarde : indépendante du cas | — | FAIT (bandeau) |
| `duediligence` | defend | 🧾 Due diligence | `R-rollup` | Éléments à confirmer et coefficients embarqués : comptes et impact par produit ; annotations communes | `domain/dd` par produit | À FAIRE |
| `personas` | configure | 👥 Persona management | `S-static` | Bandeau seul. Gestion des personas : commune | — | FAIT (bandeau) |
| `products` | portfolio | 📦 Products | `P-portfolio` | Bandeau seul. Tableau des produits (déjà tous les produits) | — | FAIT (bandeau) |
| `overrides` | portfolio | 🧬 Overrides | `P-portfolio` | Bandeau seul. Surcharges par produit | — | FAIT (bandeau) |
| `knowledge-transfer` | portfolio | 🔁 Knowledge transfer | `P-portfolio` | Bandeau seul. Tableau F29 et effet du hub par vague | — | FAIT (bandeau) |
| `waves` | portfolio | 🌊 Waves | `P-portfolio` | Bandeau seul. Planche des vagues | — | FAIT (bandeau) |
| `consolidation` | portfolio | 📈 Consolidation | `P-portfolio` | Bandeau seul. Trajectoire consolidée (source de `selectionView`) | — | FAIT (bandeau) |
| `portfolio-stress` | portfolio | 🎲 Portfolio stress | `P-portfolio` | Bandeau seul. Monte Carlo agrégé des produits planifiés | — | FAIT (bandeau) |

## 5. Suivi des phases suivantes

À faire par type (le repli générique s’affiche en attendant, il est déjà correct et lisible) :

- `R-conso` (12), **sans vue consolidée tant qu’aucun agrégat n’est enregistré** (note “Consolidated view coming” + détail par produit) : `fte-vfte`, `team-out`, `tobe-team`, `agent-usage`, `run`, `annual`, `monthly`, `monthly-playback`, `kpi`, `asis-tobe`, `results`, `story-summary`.
- `R-rollup` (28), tableau récapitulatif spécifique (statut, valeurs clés) à la place du repli financier générique : `readiness`, `token-econ`, `assumptions`, `vfte-ov`, `opmodel`, `montecarlo`, `model-stochastic`, `phase-art`, `agent-dir`, `agent-detail`, `model-convergence`, `model-supervision`, `exec`, `productivity`, `velocity`, `quality`, `compliance`, `model-flow`, `commercial`, `scenarios`, `compare`, `sensitivity`, `model-evidence`, `strategies`, `verif`, `eligibility`, `model-verification`, `duediligence`.
- `I-input` (17), synthèse spécifique de la saisie de la section à la place du repli générique (ETP, artefacts, surcharges, hub) : `engagement-context`, `engage`, `transform-params`, `params`, `scurve`, `maturity-map`, `scope-sel`, `phase-scope`, `lc-weighting`, `lifecycle-edit`, `loc-strat`, `knowledge`, `run-sizing`, `setup`, `maturity`, `program`, `risk`.

## 6. Ambiguïtés assumées

- **Sections de saisie dont la clé est commune** (écrites hors liste blanche : `RATE`, `MODEL`, `COEF`, `TOKEN_MODELS`, `DD_STATE`, `assumptValidated`, données de l’usine) : la vue ne les change pas. Choix : `ratecard` et les quatre sections d’usine sont `S-static` (valeurs identiques pour tous les produits, une ligne par produit n’apporterait rien) ; `token-econ`, les six sections `model-engine`, `assumptions` et `duediligence` sont `R-rollup` (leur résultat est propre au produit, leurs réglages sont communs).
- **`factory-*`** : les données sont communes mais le générateur lit le produit actif. Choisi `S-static` (« brouillon, ne nourrit pas le modèle financier »). À revoir si l’usine devient par produit.
- **`readiness`** : questionnaire (saisie) mais surtout un indice : `R-rollup`, comme demandé. **`eligibility`**, **`opmodel`** : paramètres + diagnostics, classés `R-rollup` car l’intérêt est la porte / le contrôle par produit.
- **`kpi`**, **`monthly-playback`**, **`story-summary`** : mélange de grandeurs additives et de ratios. Classés `R-conso` ; les ratios non additifs doivent rester des lignes par produit ou des moyennes pondérées fournies par le domaine (`weightedVelocity`, `weightedAutomation`).
- **`productivity`, `quality`, `compliance`, `vfte-ov`, `phase-art`, `agent-dir`, `agent-detail`** : ratios, couvertures ou périmètres différents par produit : `R-rollup`. Une somme par phase ou par rôle (comme `agent-usage`) pourrait devenir `R-conso` plus tard.
- **`commercial`** : le partage de gain est non linéaire : `R-rollup`, sans total.
- **`compare`**, **`io`** : travaillent sur les photos (communes) ; `compare` en `R-rollup` (écart par produit), `io` en `S-static` (les exports ont déjà leur sélecteur de périmètre).
- **`decision`** et **`gantt`** suivent déjà la Vue : enregistrés comme leur propre agrégat.
- **`home`** : `S-static` (navigation).
- Les sections du **groupe Portefeuille** sont déjà à ce niveau ; `consolidation` est la source de `selectionView`.

## 7. Risques

- Un composant de section qui lit le store autrement que par `useDoc` / `useCtx` / `useCaseResult` échapperait au `ProductViewContext` (la règle ESLint G4 l’interdit côté `ui/`). `useSimulation` lit la dernière simulation du **produit actif** (affichée périmée pour un autre produit) : à traiter par la phase « stress ».
- Le détail par produit exécute la section entière pour chaque produit ouvert (coût proportionnel au nombre de produits ouverts, un par un par défaut).
- Un contrôle personnalisé qui écrirait sans passer par un événement React (ex. écouteur natif) ne serait pas arrêté par `ReadOnlyScope` : à vérifier section par section lors du drill.
