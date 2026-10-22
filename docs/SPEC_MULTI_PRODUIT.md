# AgentCase — Spécification : portefeuille multi-produits et transformation par vagues

> Statut : **décisions D-M1…D-M12 retenues** (§ 15) ; phases P1 (domaine `domain/portfolio/`) et P2 (store, commandes, persistance) réalisées, phases suivantes à venir. Périmètre : l'application TypeScript + React dans `app/` (v19.x).
> Documents liés : [ARCHITECTURE.md](ARCHITECTURE.md) (couches, commandes, persistance), [DEVIATIONS.md](DEVIATIONS.md) (écarts au legacy),
> [BUMP_PROCEDURE.md](BUMP_PROCEDURE.md) (versions). Règles de code inchangées : fichiers ≤ 150 lignes, pas de `any`, couches
> `ui → controllers → store → domain`, toute écriture passe par une commande annulable (Ctrl+Z).

## 1. Objectif

Aujourd'hui un fichier AgentCase décrit **un seul cas** : une équipe d'entrée (AS-IS), un périmètre (artefacts SDLC / réglementaires), des
paramètres, et le moteur calcule une trajectoire (économies, coût, VAN, retour sur investissement).

Cible : un fichier décrit un **portefeuille** de plusieurs **produits**. Chaque produit a **sa propre équipe d'entrée**. Le **périmètre est
commun par défaut** mais **peut différer** par produit. La transformation est **progressive** : elle se déploie par **vagues**, chaque vague
regroupant **plusieurs produits**. L'application calcule la trajectoire de chaque produit, décalée dans le temps selon sa vague, puis la
**consolide** pour le portefeuille.

Principe directeur : **un produit résolu = un cas actuel**. Le moteur de calcul existant (`computeCase`, Time Engine, vérification, verdict…)
n'est pas réécrit : il est appelé une fois par produit sur un « cas effectif », puis une couche de consolidation additionne les résultats.
Les 79 sections continuent de travailler sur le **produit actif**.

Le **Knowledge Hub** (plateforme de connaissance qui alimente les agents) est mutualisé au niveau du portefeuille, mais chaque produit en utilise un
**sous-ensemble** et prépare un **transfert de connaissance** (*knowledge transfer*, KT) propre : ce qu'on ingère, à quel niveau de complétude de contexte
on vise, à quel coût et à quel moment (§ 3.5).

## 2. Vocabulaire

| Terme | Définition |
|---|---|
| **Portefeuille** | Le fichier / document. Contient les valeurs communes, les produits et les vagues. |
| **Produit** | Unité à transformer. Possède une équipe d'entrée, un périmètre effectif, des surcharges de paramètres. |
| **Valeurs communes** (*défauts*) | Tout ce qui est partagé : grille de tarifs, périmètre de référence, coefficients, modèle, courbe d'adoption, taux d'actualisation, etc. |
| **Surcharge** (*override*) | Valeur propre à un produit qui remplace la valeur commune. Stockée en différence (sparse) : seules les clés modifiées existent. |
| **Cas effectif** | `fusion(valeurs communes, surcharges du produit)` : un `CaseState` identique à celui d'aujourd'hui, donné au moteur. |
| **Vague** | Ensemble ordonné de produits qui démarrent leur transformation à la même date. Un produit appartient à **au plus une** vague. |
| **Mois 0 du produit** | Date de démarrage de la vague + décalage éventuel du produit. Le Time Engine part de ce mois. |
| **Knowledge Hub (commun)** | Plateforme de connaissance du portefeuille : activation, infrastructure, coûts de mise en place et de curation de base. |
| **Sous-ensemble de connaissance** (*knowledge subset*) | La part du Knowledge Hub qui sert un produit : domaines de connaissance retenus, état initial (maturité de contexte), niveau cible, charge de curation. |
| **Transfert de connaissance (KT)** | Travail d'ingestion et de curation du sous-ensemble d'un produit (équipe d'entrée → hub), avec un coût et une échéance ; plus tard, jours de KT évités grâce au hub. |
| **Niveau de complétude de contexte (CC)** | Échelle 0 à 4 existante (0 = aucun contexte, 4 = contexte complet), de l'état initial (9 questions de maturité) au niveau cible. |
| **Mois calendaire** | Axe de temps du portefeuille (mois 1 = démarrage de la première vague). |

## 3. Exigences fonctionnelles

### 3.1 Produits et équipes d'entrée

- **F1** — Créer, renommer, dupliquer, archiver, supprimer un produit. Un portefeuille compte 1 à 50 produits (cible de performance : § 8).
- **F2** — Chaque produit a **sa propre équipe d'entrée** (`teamIn` : compétence, grade, localisation, ETP, épingles). L'équipe n'est **jamais**
  héritée ni fusionnée : ajouter une équipe à un produit n'affecte pas les autres.
- **F3** — Dupliquer un produit copie l'équipe et les surcharges (point de départ pratique pour des produits voisins).
- **F4** — Importer / exporter l'équipe d'un produit (Excel, déjà existant pour le cas actuel) ; l'import d'un fichier multi-produits indique
  la colonne « Produit ».

### 3.2 Périmètre : commun par défaut, différent si besoin

- **F5** — Le portefeuille contient un **périmètre de référence** (artefacts SDLC, artefacts réglementaires, normes, phases désactivées,
  inclusion réglementaire, séquences de phase). Tout nouveau produit en hérite.
- **F6** — Un produit peut **surcharger** le périmètre. La surcharge est à la granularité de la clé (ex. `selectedArtefacts`, `phaseOff`,
  `selectedNorms`) et **pas** à la granularité de l'élément : une surcharge de `selectedArtefacts` remplace la liste entière.
  *(Raison : lisible, prévisible, sans fusion ambiguë. Voir décision D-M2.)*
- **F7** — L'interface affiche pour chaque champ concerné un état : **hérité** (valeur commune), **surchargé** (puce + valeur du commun en infobulle)
  et une action « Revenir au commun ». Une action « Appliquer à tous les produits » écrit la valeur au niveau commun et supprime les
  surcharges identiques.
- **F8** — Quand le périmètre commun change, les produits qui **héritent** suivent automatiquement ; les produits qui **surchargent** ne bougent
  pas (un bandeau liste les produits surchargés concernés).
- **F9** — Les autres paramètres (tarifs, coefficients, modèle, courbe, cibles de localisation…) suivent la même mécanique hérité / surchargé,
  avec une liste blanche de clés surchargeables (§ 4.3) pour éviter les incohérences (le taux d'actualisation, par exemple, reste commun).

### 3.3 Vagues

- **F10** — Créer, renommer, réordonner, supprimer des vagues. Chaque vague a : nom, **date de démarrage** (ou décalage en mois par rapport au
  début du portefeuille), liste de produits, note.
- **F11** — Affecter un produit à une vague (glisser-déposer et sélecteur). Un produit sans vague est **non planifié** : il est exclu de la
  consolidation (affiché en grisé, avec un avertissement dans le diagnostic).
- **F12** — Un produit peut avoir un **décalage propre** (en mois) à l'intérieur de sa vague, pour étaler le démarrage sans créer une vague.
- **F13** — Les vagues peuvent se chevaucher dans le temps. Aucune contrainte de dépendance entre vagues en v1 (hors périmètre, § 9).
- **F14** — La durée d'une transformation (rampe d'adoption, mise en place, courbe en S) est celle du produit ; elle se déroule à partir de son
  mois 0. L'horizon du portefeuille est calendaire (`horizonPortefeuille` en mois) ; chaque produit est tronqué à l'horizon.

### 3.4 Consolidation et restitution

- **F15** — **Vue portefeuille** : économies, coût de fonctionnement, investissement, trésorerie cumulée, **VAN**, **retour sur investissement**,
  **mois de retour**, **ETP humains / vFTE**, vitesse, par mois calendaire, par année, **par vague** et **par produit**.
- **F16** — Les chiffres du portefeuille sont **exactement la somme** des chiffres produits, décalés dans le temps. Aucune formule parallèle
  (principe : un calcul, plusieurs affichages).
- **F17** — Le **sélecteur de périmètre d'affichage** (barre haute) choisit : *Portefeuille*, *Vague X*, ou *Produit Y*. Les indicateurs de la barre
  haute (économies, coût, économies sur N ans, vélocité, retour, automatisation, plafond de verre) sont ceux du périmètre choisi.
- **F18** — **Gantt** : une ligne par vague (barre agrégée) avec produits dépliables ; les jalons d'adoption (L1 → L4), le retour et le premier vFTE
  sont ceux de chaque produit.
- **F19** — **Rapport / Excel / HTML / photos instantanées** : le fichier de résultats contient une feuille « Portefeuille », une feuille par vague
  et une feuille par produit ; le rapport critique est produit pour le périmètre d'affichage choisi.
- **F20** — **Stress et verdict** : scénarios et Monte Carlo s'exécutent par produit (cas effectif) ; la vue portefeuille agrège les tirages
  (§ 6.3). Le verdict (décision) existe au niveau produit et au niveau portefeuille.

### 3.5 Knowledge transfer : un sous-ensemble du Knowledge Hub par produit

Aujourd'hui le Knowledge Hub est réglé **une fois pour le cas** : activation (`khEnabled`), 9 questions de maturité initiale (`khA0`…`khA8`,
note 0 à 4 → score → niveau CC initial), niveau CC cible (`khTargetCC`, plafonné par le contexte d'engagement), coût de mise en place
(`khSetupBase × (0,5 + 0,25 × écart de niveaux)`), coût annuel (`khCurationFTE × TJM cible × jours ouvrés + khInfraMonthly × 12`), multiplicateur de
potentiel d'automatisation (`CC_MULT[cible]`) et jours de transfert de connaissance évités par an (`ETP de départ × 0,2 × 15 × TJM × KT_RED[CC]`).
En multi-produits, ces réglages deviennent **par produit**, sur un hub de portefeuille.

- **F24** — **Hub commun, sous-ensemble par produit.** Le portefeuille porte le réglage commun du hub (activation par défaut, coût d'infrastructure, mode
  d'imputation § 5.3). Chaque produit possède un **sous-ensemble de connaissance** (`product.knowledge`), indépendant de celui des autres.
- **F25** — **Contenu d'un sous-ensemble.** (a) `enabled` : le produit utilise le hub (hérite du commun, surchargeable) ; (b) `domains` : liste libre de
  domaines de connaissance retenus (documentation, code, tickets, procédures d'exploitation, décisions d'architecture, …) avec un **poids** (%) qui
  répartit la charge de curation ; (c) les **9 réponses de maturité** initiale propres au produit (→ CC initial du produit) ; (d) `targetCC` cible
  du produit (≤ plafond du contexte) ; (e) `curationFTE` et `setupBase` du produit ; (f) `ktLeadMonths` (≥ 0) : préparation du transfert avant le démarrage
  de la vague (F28).
- **F26** — **Valeurs par défaut identiques à aujourd'hui.** Un produit créé hérite du hub commun : mêmes réponses, même cible, mêmes coûts que le cas
  unique actuel. Chaque champ du sous-ensemble suit la mécanique « hérité / surchargé » de F7 (puce, retour au commun, application à tous).
- **F27** — **Effets propres au produit.** Le sous-ensemble d'un produit agit **uniquement** sur ce produit : multiplicateur de potentiel (`CC_MULT`), niveau
  CC par année depuis le mois 0 du produit, jours de KT évités (calculés sur l'équipe d'entrée du produit), coût de mise en place et coût annuel de curation.
  Il alimente les mêmes champs du cas effectif (aucune nouvelle formule dans le moteur).
- **F28** — **Préparation avant la vague.** `ktLeadMonths = k` place le **coût de mise en place du KT** (ingestion, curation initiale) *k* mois **avant** le mois 0
  du produit dans la consolidation (préparer la vague N+1 pendant la vague N). Les bénéfices restent à partir du mois 0. Valeur par défaut 0 = comportement actuel.
- **F29** — **Tableau « Knowledge transfer » du portefeuille.** Une ligne par produit : état de départ (CC initial), cible, domaines, coût de mise en place,
  coût annuel, jours de KT évités, vague, échéance de préparation, plus des totaux ; filtrable par vague ; signale les produits sans hub (désactivé) et ceux dont
  la cible est plafonnée par le contexte.
- **F30** — **Imputation de l'infrastructure commune.** Le coût d'infrastructure du hub (`khInfraMonthly`) est un coût de portefeuille imputé aux produits selon
  l'un des modes de § 5.3 (v1 : coût complet par produit ; option : répartition au prorata de l'effectif d'entrée). La consolidation n'additionne jamais deux fois
  la même infrastructure.
- **F31** — **Lecture « effet de bascule ».** Le tableau et la vue Consolidation montrent, par vague, la part du bénéfice attribuable au hub (écart avec la même vague hub
  désactivé), calculée par la fonction existante de comparaison avec/sans hub (`hubView`), appliquée produit par produit.

### 3.6 Compatibilité

- **F21** — Un fichier actuel (cas unique) s'ouvre comme un portefeuille d'**un produit « Produit 1 »** et d'**une vague « Vague 1 »** démarrant au
  mois 0. Tous les chiffres sont **identiques** à l'ancien affichage (critère d'acceptation A1).
- **F22** — Un portefeuille à un seul produit peut être **réexporté en fichier cas unique** (sans perte) pour les outils et les utilisateurs
  qui n'en sont pas au multi-produits.
- **F23** — Le mode mono-produit reste le comportement par défaut : tant qu'un seul produit existe, l'interface n'affiche ni sélecteur de produit
  ni vues vagues (affichage progressif, § 7).

## 4. Modèle de données

### 4.1 Document

Version de schéma : `agentcase.portfolio.v1` (le cas unique reste `agentcase.snapshot.v1`, accepté en lecture).

```ts
interface Portfolio {
  _schema: 'agentcase.portfolio.v1';
  common: CommonCase;                       // valeurs communes (défauts)
  products: Product[];                      // ordre d'affichage
  waves: Wave[];                            // ordre de déploiement
  activeProductId: string;                  // produit sur lequel travaillent les 79 sections (état UI persisté dans le document ? voir D-M6)
  hub: { enabled: boolean; infraMonthly: number; infraAllocation: 'perProduct' | 'byBaseEtp' };   // Knowledge Hub commun (§ 3.5, § 5.3)
  horizonMonths: number;                    // horizon calendaire du portefeuille
  startDate: string;                        // ISO, mois 1 du portefeuille
}

interface CommonCase extends Omit<CaseState, 'teamIn'> {}   // tout sauf l'équipe d'entrée

interface Product {
  id: string; name: string; note?: string; archived?: boolean;
  teamIn: TeamRow[];                        // équipe d'entrée propre, jamais héritée
  knowledge: KnowledgeSubset;               // sous-ensemble du Knowledge Hub (§ 3.5) ; champs absents = hérités du commun
  overrides: Partial<Overridable>;          // surcharges parcimonieuses (liste blanche § 4.3)
  waveId: string | null;                    // null = non planifié
  offsetMonths: number;                     // décalage dans la vague (≥ 0)
}

interface KnowledgeSubset {
  enabled?: boolean;                        // hérité du hub commun si absent
  domains?: { label: string; weightPct: number }[];   // domaines retenus ; poids = répartition de la curation (Σ = 100)
  maturityAnswers?: number[];               // 9 notes 0..4 (khA0..khA8) propres au produit
  targetCC?: number;                        // 0..4, plafonné par le contexte d'engagement
  curationFTE?: number; setupBase?: number; // charge de curation, base du coût de mise en place
  ktLeadMonths?: number;                    // préparation du KT avant le mois 0 (≥ 0)
}

interface Wave {
  id: string; name: string; note?: string;
  startMonth: number;                       // 0 = début du portefeuille (≥ 0)
  productIds: string[];                     // ordre d'affichage ; cohérent avec Product.waveId
}
```

Invariants (vérifiés par un test de propriété) : un produit n'est dans qu'**une** vague ; `Wave.productIds` et `Product.waveId` sont
cohérents ; `offsetMonths ≥ 0` ; `ktLeadMonths ≥ 0` ; la somme des poids de `domains` vaut 100 ; `targetCC` ∈ [0, 4] ; `startMonth ≥ 0` ; les identifiants sont uniques ; au moins un produit.

### 4.2 Cas effectif

```ts
resolveProduct(p: Portfolio, productId): CaseState   // fonction pure du domaine
  = { ...p.common, ...pick(overrides, whitelist), teamIn: product.teamIn }
```

- Les champs `knowledge` du produit sont écrits dans les clés existantes du cas effectif (`dom.checked.khEnabled`, `dom.values.khA0`…`khA8`, `khTargetCC`,
  `khCurationFTE`, `khSetupBase`, `khInfraMonthly` imputé selon § 5.3) : le moteur (`domain/knowledge.ts`) reste inchangé.
- Fusion **superficielle** à la clé (pas de fusion profonde), sauf `dom.values` / `dom.checked` où la surcharge est une différence par champ de
  formulaire (clés de `dom.values`).
- Le résultat est mémorisé (`WeakMap` sur `common`, `product.overrides`, `product.teamIn`), donc modifier un produit ne recalcule pas les autres.
- Le résultat est un `CaseState` valide : **tout le domaine existant fonctionne sans changement**.

### 4.3 Clés surchargeables (liste blanche v1)

| Famille | Clés | Surchargeable ? |
|---|---|---|
| Périmètre | `selectedArtefacts`, `artefactsEdited`, `selectedRegArtefacts`, `regArtefactsEdited`, `phaseOff`, `phaseSeq`, `selectedNorms`, `regInclude`, `lifecycleUse`, `lifecyclePos`, `statusLifecycle` | **oui** |
| Cibles | `targetLocPct`, `dom.values` (horizon exclu), `forceGlassCeiling` | oui |
| Knowledge Hub | `khEnabled`, `khA0`…`khA8`, `khTargetCC`, `khCurationFTE`, `khSetupBase` (= sous-ensemble du produit, § 3.5) | **oui** |
| Knowledge Hub (infra) | `khInfraMonthly` | non (commun ; imputé selon § 5.3) |
| Courbe | `scurve` (famille, points) | oui (rythme propre au produit) |
| Contexte | `engageCoef` (contexte d'engagement), `MATURITY_MAP` | oui |
| Tarifs | `RATE` | non en v1 (commun) — voir D-M3 |
| Modèle / coefficients | `MODEL`, `COEF`, `TOKEN_MODELS`, `TOK_OUT_SHARE` | non en v1 (commun) |
| Taux d'actualisation | `MODEL.CASE.discountRate` | **jamais** (portefeuille) |
| Horizon | `dom.values.horizon` | **jamais** (calendaire, portefeuille) |

### 4.4 Persistance

- Instantané JSON, HTML, sauvegarde automatique (IndexedDB) et multi-onglets : le `Portfolio` remplace `Doc` ; les correctifs (patches Immer)
  restent au niveau du document, donc **historique et Ctrl+Z couvrent produits, surcharges et vagues** sans mécanisme supplémentaire.
- Le paquet de calcul canonique (`calculationPackage`) devient : un paquet par produit + un paquet portefeuille ; la détection d'obsolescence
  compare les deux niveaux.
- Migration : `fromSnapshot` détecte `_schema` ; un cas unique est enveloppé (F21). Aucune table de migration complexe : le contenu du cas
  devient `common` + le produit « Produit 1 » reçoit `teamIn`.

### 4.5 Excel

Feuilles ajoutées au classeur de paramètres : `Products` (id, nom, vague, décalage, note), `Waves` (id, nom, début, note), `Team_<produit>`
(ou une feuille `TeamIn` avec colonne `Product`), `Overrides` (produit, clé, valeur JSON), `KnowledgeSubsets` (produit, activation, cible, curation, mise en place, préparation en mois) et `KnowledgeDomains` (produit, domaine, poids). Les feuilles actuelles décrivent le **commun**.
L'import est durci comme aujourd'hui (taille, types, clés interdites) et reste **un seul pas annulable**.

## 5. Moteur : consolidation

### 5.1 Principe

```
pour chaque produit planifié p :
    c_p  = resolveProduct(portefeuille, p)
    mois0_p = vague(p).startMonth + p.offsetMonths
    lignes_p(t) = Time Engine de c_p  (t = 1..N_p)                        ← inchangé
    ligne calendaire : T = mois0_p + t
consolidation(T) = Σ_p lignes_p(T - mois0_p)       pour chaque mesure additive
```

Exception : le coût de **mise en place du KT** d'un produit est positionné sur `mois0_p − ktLeadMonths_p` (F28) ; ses autres flux restent sur `mois0_p + t`.
La consolidation conserve donc le coût de KT dans une série séparée (`ktSetup`) puis l'ajoute à la trésorerie.

Mesures **additives** (somme directe) : économies nettes mensuelles, coût de fonctionnement, setup, jetons, infrastructure, ETP humains, vFTE,
trésorerie. Mesures **non additives** recalculées sur la série consolidée : trésorerie cumulée, **mois de retour du portefeuille**
(premier mois où le cumul consolidé est ≥ 0), **VAN**, **ROI** (`roiCanonical` sur net et setup consolidés), vitesse (moyenne pondérée par
l'équipe d'entrée).

### 5.2 Actualisation

La VAN du portefeuille actualise **chaque mois calendaire T** au taux commun : `Σ net(T) / (1+r/12)^T`. La VAN d'un produit, lue seule
(son propre Time Engine), s'actualise depuis **son** mois 0 : les deux vues se lisent donc différemment. Pour que la somme des VAN produits
égale la VAN du portefeuille, la vue produit du portefeuille affiche la **VAN calendaire** (actualisée depuis le mois 1 du portefeuille) ;
la VAN « depuis son démarrage » est proposée en infobulle. *(Décision D-M4.)*

### 5.3 Investissement partagé

Certains coûts de mise en place sont communs (plateforme, hub de connaissances). Deux options :

1. **Par produit** (v1) : chaque cas effectif porte son propre setup ; le commun n'a pas de coût propre. Simple, additif.
2. **Setup partagé** (v2) : une ligne de coût portefeuille, imputée à la première vague (ou répartie), sans doublon dans les produits.

*(Décision D-M5, recommandation : option 1 en v1.)*

**Imputation du hub commun (F30).** `hub.infraAllocation` :

- `perProduct` (v1, défaut) : chaque produit supporte `khInfraMonthly × 12` comme aujourd'hui (conservatrice, additive, identique au cas unique pour un produit) ;
- `byBaseEtp` : l'infrastructure du portefeuille est répartie au prorata de l'effectif d'entrée des produits qui utilisent le hub ; la somme des parts vaut
  exactement le coût du hub (test de conservation), et un hub utilisé par un seul produit lui coûte le coût complet.

Coûts de curation et de mise en place : toujours propres au produit (sous-ensemble).

### 5.4 Organisation du code

```
domain/portfolio/
  types.ts           // Portfolio, Product, Wave
  resolve.ts         // resolveProduct (fusion + mémoïsation)
  validate.ts        // invariants (§ 4.1), diagnostics
  timeline.ts        // mois0 d'un produit, décalage calendaire, troncature à l'horizon
  consolidate.ts     // somme des lignes décalées → série consolidée
  headline.ts        // VAN / ROI / retour du portefeuille depuis la série consolidée (réutilise roiCanonical)
  waves.ts           // agrégats par vague
  knowledge.ts       // sous-ensemble → clés du cas effectif ; imputation de l'infra du hub ; décalage de ktSetup ; vue Knowledge transfer
  index.ts
```

Le domaine n'importe rien d'autre que le domaine existant. `computeCase` reste la seule fonction qui calcule un produit.

## 6. Commandes, état d'interface, sections

### 6.1 Commandes (toutes annulables, regroupées en lot quand elles touchent plusieurs clés)

`product.add / rename / duplicate / archive / remove / setNote`, `product.setTeam*` (réutilise les commandes équipe existantes, adressées par
`productId`), `product.setOverride(key, value)`, `product.clearOverride(key)`, `product.applyToCommon(key)`, `portfolio.setCommon(key, value)`
(réutilise les commandes de paramètres existantes quand le produit actif est « hérité »), `wave.add / rename / remove / reorder / setStart`,
`wave.assign(productId, waveId)`, `product.setOffset`, `portfolio.setHorizon`.

Règle d'adressage : les **commandes existantes** (≈ 202) gardent leur signature ; une couche d'**adressage** décide si l'écriture va dans
`common` (clé héritée) ou dans `products[active].overrides` (clé déjà surchargée, ou mode « modifier ce produit seulement » actif).
Un interrupteur visible « Modifier : tous les produits / ce produit seulement » (par défaut : *ce produit seulement* pour l'équipe,
*tous les produits* pour le périmètre tant que le produit hérite) évite les modifications involontaires.

### 6.2 État d'interface (non annulable)

`activeProductId`, périmètre d'affichage (portefeuille / vague / produit), vue vagues dépliée, filtres. Stocké dans `uiState` (comme
l'état actuel), sauf `activeProductId` persisté dans le document pour qu'un fichier rouvre sur le même produit (décision D-M6).

### 6.3 Sections

- Les **79 sections existantes** se branchent sur `useCtx()` qui renvoie le **cas effectif du produit actif** : aucune modification de leur
  logique, seulement un bandeau « Produit : X (hérité / surchargé) » dans `SectionFrame`.
- **Nouveau groupe « Portefeuille »** (≈ 6 sections) :

| Section | Contenu |
|---|---|
| Produits | Tableau des produits : équipe (ETP), vague, décalage, état (hérité / n surcharges), indicateurs clés, actions F1–F4. |
| Surcharges | Par produit, liste des clés surchargées avec valeur commune vs valeur produit, « Revenir au commun », « Appliquer à tous ». |
| Vagues | Planche de vagues (colonnes) avec produits (cartes), date de démarrage, glisser-déposer (F10–F12). |
| Knowledge transfer | Tableau F29 : un sous-ensemble par produit (domaines, état initial, cible, coûts, jours de KT évités, préparation), totaux, effet du hub par vague (F31) ; édition du sous-ensemble du produit actif (réutilise la section Knowledge Hub existante avec le bandeau « hérité / surchargé »). |
| Consolidation | Trajectoire du portefeuille : courbe cumulée, mensuel, par vague, par produit, retour, VAN, ROI (F15–F16). |
| Stress portefeuille | Monte Carlo / scénarios agrégés (v2). |

- Barre haute : sélecteur de **produit actif** et de **périmètre d'affichage** (visibles dès qu'il y a ≥ 2 produits, F23).
- Le **Gantt** (« Planning ») gagne la vue vagues (F18).
- Le **rapport** et les **exports** consomment `consolidate` (jamais un recalcul).

### 6.4 Stress et verdict

- Monte Carlo : tirages **par produit** avec graine déterministe par produit (`seed ⊕ hash(productId)`) ; le portefeuille additionne les
  trajectoires tirage par tirage. Paramètre de **corrélation entre produits** (`ρ ∈ [0,1]`, défaut 0 en v1 = indépendants ; `ρ = 1` =
  mêmes tirages pour les facteurs communs) pour ne pas sous-estimer le risque agrégé.
- Verdict : règles actuelles appliquées au résultat du périmètre choisi ; un tableau de bord de portefeuille reprend les verdicts par vague.

## 7. Parcours utilisateur

1. L'utilisateur ouvre un fichier existant : il voit le même écran qu'avant (un produit, pas de sélecteur).
2. « Ajouter un produit » (section Produits) : la barre haute fait apparaître le sélecteur ; le nouveau produit hérite du commun.
3. Il remplit l'équipe du produit 2 ; il modifie le périmètre pour ce produit seulement (puce « surchargé »).
4. Dans « Vagues », il crée « Vague 1 » (mois 0) et « Vague 2 » (mois 6) et y glisse les produits.
5. « Consolidation » montre la trajectoire du portefeuille ; la barre haute passe sur *Portefeuille* ; le rapport et le Gantt suivent.
6. Ctrl+Z annule indifféremment une équipe, une surcharge, un déplacement de produit ou une date de vague.

## 8. Exigences non fonctionnelles

| Sujet | Exigence |
|---|---|
| **Performance** | 20 produits × horizon 60 mois : rafraîchissement d'un changement de produit < 150 ms (un seul produit recalculé grâce à la mémoïsation par produit) ; consolidation < 30 ms. Budget ajouté dans `app/perf-budget.json`. |
| **Mémoire / taille** | Fichier de 20 produits < 1 Mo ; autosave diffée comme aujourd'hui. |
| **Accessibilité** | Planche de vagues utilisable au clavier (déplacer un produit = commandes « Déplacer vers la vague… », flèches), annonces par la zone `aria-live`. Audit axe étendu (`npm run a11y`) aux nouvelles sections. |
| **Annulation** | Toute modification (y compris glisser-déposer) = une étape ; les gestes continus se coalescent (`coalesceKey`). |
| **Sécurité** | Mêmes protections (`sanitize`, clés interdites, pas de HTML brut) ; les identifiants de produit / vague sont des chaînes d'une liste sûre. |
| **Interface** | Même charte que le reste (parité UI legacy), pas de nouvelle bibliothèque. |

## 9. Hors périmètre (v1)

- Dépendances et contraintes entre vagues (produit B après le produit A), capacité d'équipe de transformation partagée entre vagues.
- Équipes partagées entre produits (une personne affectée à deux produits). L'équipe est strictement par produit en v1.
- Tarifs / modèle / coefficients propres à un produit (liste blanche § 4.3 les exclut).
- Monte Carlo avec matrice de corrélation complète (seul `ρ` global en v2).
- Édition collaborative simultanée (le diffusion multi-onglets existante reste valable).

## 10. Plan de réalisation par phases

| Phase | Contenu | Critère de sortie |
|---|---|---|
| **P0 — Cadrage** | Valider les décisions D-M1…D-M8 ; maquettes (Produits, Vagues, barre haute). | Décisions notées dans ce document. |
| **P1 — Modèle et domaine** | `domain/portfolio/` (types, resolve, validate, timeline, consolidate, headline) ; tests de propriétés. | Invariants A2–A5 verts ; `computeCase` inchangé. |
| **P2 — Store et persistance** ✅ réalisée | `Portfolio` à la place de `Doc` ; enveloppe de migration (F21) ; commandes produit / vague / surcharge ; adressage des commandes existantes ; autosave, multi-onglets, calcul canonique par produit. | Les 202 commandes passent le test d'annulation sur un portefeuille de 3 produits ; ouverture des 107 fixtures = A1. |
| **P3 — Interface produit** | Sélecteur produit actif, bandeaux hérité / surchargé, sections Produits et Surcharges, mode « tous / ce produit ». | Parcours 1–3 (§ 7) ; audit axe sans violation. |
| **P3b — Knowledge transfer par produit** | `domain/portfolio/knowledge.ts`, sous-ensemble dans `Product`, section Knowledge transfer, `ktLeadMonths`, imputation de l'infrastructure, feuilles Excel `KnowledgeSubsets` / `KnowledgeDomains`. | A11–A13 verts ; un produit avec hub par défaut = cas unique actuel (A1). |
| **P4 — Vagues et consolidation** | Section Vagues (planche + clavier), Consolidation, barre haute par périmètre, Gantt par vague. | Parcours 4–6 ; budgets de performance. |
| **P5 — Restitution** | Excel (paramètres et résultats), rapport, HTML, photos instantanées. | Parité cellule à cellule du mode mono-produit ; nouvelles feuilles validées par test. |
| **P6 — Stress** | Monte Carlo par produit + agrégat, corrélation `ρ`, verdict portefeuille. | Tests de reproductibilité (graine) ; documentation des écarts. |
| **P7 — Mise en production** | Documentation, version 20.0.0, exemples de portefeuille, `npm run ui-parity` et `a11y` étendus. | Tous les contrôles CI verts. |

Chaque phase est livrée par une demande de fusion indépendante, avec les tests de la phase et sans régression des 13 000 tests actuels.

## 11. Critères d'acceptation et stratégie de test

| # | Critère | Test |
|---|---|---|
| **A1** | Un portefeuille « 1 produit, 1 vague au mois 0 » donne **exactement** les chiffres actuels (1e-9) sur les 107 fixtures. | Oracle : toutes les fixtures chargées en enveloppe ; mêmes tests de parité qu'aujourd'hui. |
| **A2** | N produits **identiques** dans la même vague ⇒ la série consolidée = N × la série d'un produit. | Test de propriété. |
| **A3** | Décaler une vague de *k* mois ⇒ la série consolidée est décalée de *k* ; la VAN calendaire est multipliée par `(1+r/12)^-k` ; le retour est décalé de *k*. | Test de propriété. |
| **A4** | Σ(VAN calendaire des produits) = VAN du portefeuille ; idem économies, coût, setup, ETP. | Test de propriété (toutes fixtures). |
| **A5** | Un produit qui hérite d'une clé suit le commun ; un produit qui la surcharge ne bouge pas ; « Revenir au commun » restaure l'héritage ; `applyToCommon` supprime les surcharges identiques. | Tests unitaires + propriété `fast-check`. |
| **A6** | Toute commande de portefeuille est annulable / rétablissable ; `undo∘apply = id`. | Étendre `tests/store/undo-property.test.ts` et le registre de commandes. |
| **A7** | Un produit sans vague n'entre pas dans la consolidation et déclenche un avertissement. | Test. |
| **A8** | Aucun chiffre de portefeuille n'est calculé en dehors de `domain/portfolio/consolidate` ; pas de somme dans `ui/`. | Revue + règle ESLint ciblée (interdiction de `reduce` financier dans `ui/sections/portfolio`). |
| **A9** | L'export mono-produit d'un portefeuille à un produit rouvre à l'identique (aller-retour). | Test d'aller-retour. |
| **A10** | Performance et accessibilité conformes au § 8. | `npm run perf`, `npm run a11y`. |
| **A11** | Un produit dont le sous-ensemble est hérité donne exactement les chiffres hub actuels (setup, coût annuel, `CC_MULT`, jours de KT évités) ; modifier le sous-ensemble d'un produit ne change **aucun** chiffre des autres produits. | Test de propriété + oracle sur les fixtures avec hub activé. |
| **A12** | Avec `perProduct`, l'imputation redonne le coût de cas unique ; avec `byBaseEtp`, Σ des parts = coût d'infrastructure du hub (conservation, au centime). | Test de propriété. |
| **A13** | `ktLeadMonths = k` déplace uniquement le coût de mise en place du KT de *k* mois avant le mois 0 ; trésorerie cumulée, VAN et retour consolidés se recalculent en conséquence ; avec `k = 0` rien ne change. | Test de propriété. |

Les écarts volontaires au comportement actuel (s'il y en a) sont consignés dans `DEVIATIONS.md` (règle en vigueur : on modifie le nouveau
build seulement, on enregistre l'écart).

## 12. Décisions (question, options, recommandation, retenu)

| # | Question | Options | Recommandation | Retenu |
|---|---|---|---|---|
| **D-M1** | Une vague peut-elle contenir un produit déjà dans une autre vague ? | oui (étalement) / non | **Non** : un produit = une vague ; l'étalement se fait par `offsetMonths`. | Recommandation acceptée (§ 15) |
| **D-M2** | Granularité de la surcharge du périmètre | clé entière / élément par élément (diff d'ensemble) | **Clé entière** en v1 ; diff d'ensemble en v2 si le besoin apparaît. | Recommandation acceptée (§ 15) |
| **D-M3** | Tarifs (`RATE`) et coefficients par produit | commun seulement / surchargeables | **Commun seulement** en v1 (un fournisseur, une grille). | Recommandation acceptée (§ 15) |
| **D-M4** | VAN d'un produit dans le portefeuille | actualisée depuis le mois 1 du portefeuille / depuis son mois 0 | **Depuis le mois 1 du portefeuille** (somme = VAN du portefeuille) ; l'autre en infobulle. | Recommandation acceptée (§ 15) |
| **D-M5** | Setup partagé (plateforme, hub) | par produit / ligne portefeuille | **Par produit** en v1. | Recommandation acceptée (§ 15) |
| **D-M6** | `activeProductId` dans le document ou dans l'état d'interface | document / interface | **Document** (réouverture sur le même produit), sans étape d'annulation. | Recommandation acceptée (§ 15) |
| **D-M7** | Corrélation entre produits dans Monte Carlo | indépendants / paramètre `ρ` | **`ρ` global**, défaut 0, en P6. | Recommandation acceptée (§ 15) |
| **D-M8** | Versionnage | 19.x / 20.0.0 | **20.0.0** (changement de schéma de document, lecture des anciens fichiers conservée). | Recommandation acceptée (§ 15) |
| **D-M9** | Nom d'interface : « Produit », « Application », « Service » | libre | **Produit** par défaut, libellé configurable dans les paramètres (futur). | Recommandation acceptée (§ 15) |
| **D-M10** | Granularité du sous-ensemble | domaines libres avec poids / catalogue fermé de domaines | **Domaines libres avec poids** (information et répartition de curation, sans effet sur le multiplicateur qui reste piloté par le niveau CC). | Recommandation acceptée (§ 15) |
| **D-M11** | Réutilisation de connaissance entre produits (un domaine déjà ingéré pour le produit A baisse le coût du produit B) | ignorée en v1 / facteur de réutilisation | **Ignorée en v1** ; facteur `reusePct` par domaine en v2. | Recommandation acceptée (§ 15) |
| **D-M12** | Imputation de l'infrastructure du hub | par produit / au prorata de l'effectif | **Par produit** en v1 (cohérent avec D-M5), prorata en option. | Recommandation acceptée (§ 15) |

## 13. Risques

| Risque | Parade |
|---|---|
| Les commandes existantes écrivent au mauvais niveau (commun vs surcharge) | Couche d'adressage unique + test d'annulation sur portefeuille ; interrupteur visible « tous / ce produit ». |
| Régression des chiffres mono-produit | A1 sur les 107 fixtures dès P2, avant toute interface. |
| Lenteur avec beaucoup de produits | Mémoïsation par produit ; consolidation linéaire ; budget de performance en CI. |
| Confusion entre VAN produit et VAN portefeuille | Libellés explicites + infobulles (déjà en place sur la barre haute). |
| Taille de fichier / import Excel volumineux | Limites d'import existantes + tests de taille ; feuilles par produit paginées. |
| Double comptage de l'infrastructure ou de la mise en place du hub | Mode d'imputation explicite, test de conservation (A12), diagnostic « hub utilisé par 0 produit ». |
| Complexité de l'interface | Affichage progressif (F23) : rien ne change tant qu'il n'y a qu'un produit. |

## 14. Glossaire des chiffres consolidés

| Chiffre | Définition |
|---|---|
| Économies (mois T) | Σ produits, économies nettes du mois `T - mois0_p`. |
| Coût de fonctionnement | Σ produits, coût total du mois. |
| Investissement | Σ setup produits, positionnés sur leurs mois de mise en place. |
| Trésorerie cumulée | Somme cumulée des économies nettes consolidées (setup compris). |
| Retour (mois) | Premier mois calendaire où la trésorerie cumulée consolidée est ≥ 0. |
| VAN | `Σ net(T) / (1+r/12)^T`, `r` = taux commun, T = mois calendaire. |
| ROI | `roiCanonical(net consolidé, setup consolidé)` (même règle que pour un cas : nul sans setup). |
| Économies en % sur N ans | `(économies cumulées − setup) / (coût de référence × années)`, sommées sur les produits planifiés. |
| Vélocité | Hausse moyenne de vélocité, pondérée par l'effectif d'entrée de chaque produit. |
| Knowledge transfer (coût) | Σ produits : mise en place du KT (décalée de `ktLeadMonths`), curation annuelle et part d'infrastructure du hub. |
| Jours de KT évités | Σ produits, `ETP de départ × 0,2 × 15 × TJM × KT_RED[CC]` par année depuis le mois 0 du produit. |
| ETP / vFTE | Somme des ETP humains et des vFTE agents des produits, par mois calendaire. |

## 15. Décisions retenues

Toutes les recommandations du § 12 ont été **acceptées** par le commanditaire. Elles valent spécification ; les phases P1 à P7 s'y conforment.

| # | Décision retenue | Conséquence dans le code |
|---|---|---|
| **D-M1** | Un produit appartient à **au plus une** vague ; l'étalement passe par `offsetMonths`. | Invariant `multi-wave` de `validate`. |
| **D-M2** | Surcharge à la granularité de la **clé entière** ; diff d'ensemble reporté en v2. | `setOverride` remplace la valeur de la clé ; `dom.values` / `dom.checked` : une entrée par champ de formulaire. |
| **D-M3** | `RATE`, `MODEL`, `COEF`, `TOKEN_MODELS`, `TOK_OUT_SHARE` **communs** en v1. | Hors de `OVERRIDABLE_KEYS` ; `validate` refuse la clé. |
| **D-M4** | La VAN d'un produit dans la vue portefeuille est la **VAN calendaire**, actualisée depuis le mois 1 du portefeuille ; la VAN « depuis son démarrage » est celle de son propre `computeCase` (`ProductRun.headline().npv`). | `ProductView.summary.npv` (calendaire) ; Σ = VAN du portefeuille. |
| **D-M5** | Mise en place **par produit** en v1 (pas de ligne de coût portefeuille). | Chaque cas effectif porte son `setupTotal`. |
| **D-M6** | `activeProductId` est **dans le document**, sans étape d'annulation. | Champ `Portfolio.activeProductId` (le store, en P2, l'écrira hors historique). |
| **D-M7** | Corrélation `ρ` globale, défaut 0, en P6. | Hors périmètre de P1. |
| **D-M8** | Version **20.0.0**, livrée en P7. | `APP_VERSION` inchangée en P1. |
| **D-M9** | Libellé d'interface **« Produit »** (configurable plus tard). | `envelopeCase` : « Produit 1 », « Vague 1 ». |
| **D-M10** | Domaines de connaissance **libres avec poids** ; information et répartition de curation, sans effet sur `CC_MULT`. | `KnowledgeSubset.domains` : validé (Σ = 100), jamais lu par le moteur. |
| **D-M11** | Pas de réutilisation de connaissance entre produits en v1 (`reusePct` en v2). | Aucun terme croisé dans `knowledge.ts`. |
| **D-M12** | Infrastructure du hub **par produit** par défaut ; option `byBaseEtp`. | `hub.infraAllocation` ; `allocateCents` (conservation au centime). |

### Précisions d'implémentation de P1 (ambiguïtés levées)

- **Précédence des couches** : valeurs communes < hub (activation, part d'infrastructure) < surcharges de la liste blanche < sous-ensemble de connaissance du produit < `teamIn`. Une couche égale à la lecture du commun n'est pas écrite : un produit sans surcharge conserve l'objet `dom` du commun (aller-retour F22 sans perte).
- **`khInfraMonthly` et `horizon`** ne sont jamais surchargeables, y compris par `dom.values` : `setOverride` lève une erreur, `resolveProduct` ignore l'entrée si le document la contient, `validate` la signale.
- **Mois de retour du portefeuille** : premier mois calendaire, à partir du premier mouvement de trésorerie (mois 1 du premier produit ou premier mois de préparation du KT), où le cumul est ≥ 0. Sans cette borne, une vague démarrant au mois 7 « reviendrait » au mois 1 (cumul nul). Pour un produit au mois 0 c'est la règle du moteur (A1) ; décaler de *k* décale le retour de *k* (A3).
- **`ktLeadMonths`** : le coût KT (`khSetupCost`, étalé comme la mise en place du moteur sur `setupProfileMonths` mois) est retiré de `mois0 + t` et placé à `mois0 − k + t` ; *k* est plafonné à `mois0` (jamais avant le mois calendaire 1, diagnostic `kt-lead-clamped`). La série `ktSetup` est un sous-ensemble de `setup`. Sans hub, rien ne bouge.
- **Troncature** : un produit est coupé à l'horizon calendaire du portefeuille ; au-delà de son propre horizon il ne contribue plus (zéro). Le `costReduction` du portefeuille somme les composantes de chaque produit sur son propre horizon.
- **Imputation `byBaseEtp`** : parts calculées entre les produits planifiés, non archivés, dont le cas effectif exploite réellement le hub (contexte d'engagement compris) ; effectif d'entrée = Σ ETP de `teamIn` ; parts en centimes (plus grand reste), un seul utilisateur paie le coût complet. Un produit hors du partage affiche le coût complet (sans effet s'il n'utilise pas le hub).
- **Vitesse** : moyenne des `velocityUpliftPct` des produits planifiés pondérée par l'effectif d'entrée ; adoption mensuelle pondérée de même (produit non démarré = 0).

### Précisions d'implémentation de P2

- **Architecture** : le portefeuille est la source de vérité du store ; `doc` en est dérivé (cas effectif du produit actif). Les commandes existantes sont inchangées ; une *couche d'adressage* (`store/address/`) réécrit leurs correctifs vers le portefeuille dans un seul `produceWithPatches`. Détail dans ARCHITECTURE.md § 4-5.
- **Noms de commandes** : `product.setActive` et `product.setEditScope` (non annulables, hors historique et hors diffusion multi-onglets) ; `activeProductId` est enregistré avec le fichier (D-M6), `editScope` ne l'est jamais.
- **Règle F22 d'enregistrement** : v1 si et seulement si le fichier se rouvre au même portefeuille (un produit, une vague, ni surcharge ni sous-ensemble, noms et décalage par défaut) ; sinon `agentcase.portfolio.v1`. L'enregistrement automatique garde toujours le portefeuille exact.
- **Sélection de la portée** : « ce produit seulement » écrit dans `overrides` sans jamais toucher le commun ; une clé déjà surchargée est modifiée en surcharge quelle que soit la portée ; les clés hors liste blanche vont toujours au commun.
- **Tests** : A1/A9 au niveau du store (107 fixtures, chemin d'ouverture réel), A5 (couche d'adressage), A6 (registre sur 3 produits / 2 vagues + propriété `fast-check` mêlant commandes de cas, produit, vague, surcharge, portée), persistance, obsolescence à deux niveaux, nettoyage (`sanitize`).
