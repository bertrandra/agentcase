# AgentCase 20 — Guide de démarrage : portefeuille multi-produits

> Public : analystes et responsables de dossier qui construisent un business case pour **plusieurs produits** transformés par **vagues**.
> **The application UI is entirely in English** (v20.1): the prose of this guide stays in French, but every label in bold or italic is the exact English label shown in the interface (glossary: [GLOSSARY_EN.md](GLOSSARY_EN.md)).
> Les intitulés en gras sont ceux de l'interface. Spécification complète : [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md) ;
> architecture : [ARCHITECTURE.md](ARCHITECTURE.md) § « Portfolio ».

## 0. Pour essayer tout de suite

Ouvrez le fichier d'exemple [`examples/AgentCase_Portfolio_Example.json`](examples/AgentCase_Portfolio_Example.json) avec le bouton d'ouverture
de la barre haute (ou **📥 Import / Export** → *Open an HTML or JSON snapshot…*). Il contient quatre produits :

| Product | Wave | Particularité |
|---|---|---|
| Core platform | Wave 1 (mois 0) | équipe de 3 ETP, périmètre commun |
| Payments | Wave 1, décalage de 2 mois | 24 ETP, catalogue réglementaire seulement pour lui (surcharge), sous-ensemble de connaissance propre |
| Mobile app | Wave 2 (mois 6) | 16 ETP, contexte d'engagement surchargé, préparation du transfert 3 mois avant la vague |
| Archive (not scheduled) | aucune | **unscheduled** : exclu de la consolidation, avec un avertissement |

Le Knowledge Hub est commun (infrastructure 3 000 €/mois, imputée au prorata de l'effectif d'entrée) et la corrélation ρ vaut 0,3.
Le fichier est un portefeuille (`agentcase.portfolio.v1`). Un fichier « cas unique » d'une version précédente s'ouvre toujours : il devient
un portefeuille d'un produit « Product 1 » dans une « Wave 1 » au mois 0, avec **exactement les mêmes chiffres**.

## 1. Ajouter un produit

Tant qu'il n'y a qu'un produit, rien ne change à l'écran (pas de sélecteur, pas de groupe de menu). Avec la persona **Business journey**,
le groupe 📦 Portfolio et l'étape « Portfolio » de sa séquence guidée n'apparaissent eux aussi qu'à partir de deux produits. Pour passer en multi-produits :

1. **🏠 Welcome** → encadré « Portfolio » → bouton **Add a product** (ou, plus tard, section **📦 Products** → champ *Name of the new product* →
   **Add a product**).
2. La barre haute affiche alors deux listes : **👁 Show** (ce que vous regardez : **Portfolio**, une vague ou un produit) et **✏️ Change** (où vont vos
   modifications : **All products**, ou un produit).
3. Le nouveau produit **hérite de toutes les valeurs communes** ; seule son **équipe d'entrée** lui est propre.
4. Dans **📦 Products** : *Duplicate* (copie équipe et surcharges), *Archive / Restore*, *Delete*, note, **décalage** en mois (*Offset (months)*), bouton *Activate*.
   Un portefeuille compte de 1 à 50 produits ; le dernier produit ne peut pas être supprimé.

## 2. L'équipe d'entrée de chaque produit

Les sections d'équipe affichent **Team of: *produit actif***. L'équipe n'est **jamais héritée ni partagée** : choisissez le produit dans le sélecteur
**Show** (entrée « *nom* (*vague*) ») ou dans la liste **Change** (« *nom* »), puis saisissez son équipe (compétence, grade, localisation, ETP) comme pour un cas unique. Les autres produits ne bougent pas.
Une personne ne peut pas être affectée à deux produits (limite connue, § 9).

## 3. Périmètre commun et surcharges

- Le **périmètre** (artefacts SDLC et réglementaires, normes, phases) et les paramètres cibles sont des **valeurs communes**. Quand vous les modifiez
  avec **Change: All products**, tous les produits qui **héritent** suivent.
- Pour qu'un produit diffère : choisissez ce produit dans **Change** (il devient le produit édité), ouvrez la section concernée et modifiez-la. Une puce **overridden** apparaît (**inherited** tant que le produit suit le commun)
  (la valeur commune est dans l'infobulle). La surcharge porte sur la **clé entière** (une liste d'artefacts est remplacée en bloc).
- **Revert to common** supprime la surcharge ; **Apply to all products** écrit la valeur du produit au niveau commun et retire les surcharges identiques.
- La section **🧬 Overrides** liste, par produit, les clés surchargées (*Common value* / *Product value*) avec ces deux actions.
- Restent communs, par décision : tarifs, modèle et coefficients, taux d'actualisation, horizon.

### 3.1 Les listes « Show » et « Change », et l'édition sur place

La barre haute (dès deux produits) porte deux listes, lisibles d'un coup d'œil :

| Liste | Question | Choix |
|---|---|---|
| **👁 Show** | *Ce que vous regardez* | **Portfolio**, une vague (« Wave 1 ») ou un produit (« Payroll (Wave 1) », « Billing (unscheduled) », « … (archived) ») |
| **✏️ Change** | *Où vont vos modifications* | **All products** (les **valeurs partagées** ; l'équipe d'entrée reste celle du produit actif) ou un produit (il devient le produit édité ; vos modifications créent des **surcharges** pour lui seul) |

**Règle « Change suit Show »** : choisir un **produit** dans **Show** l'affiche *et* le met dans **Change** (vous modifiez ce produit) ; choisir
**Portfolio** ou une **vague** dans **Show** remet **Change** sur **All products**. Vous pouvez ensuite choisir un produit dans **Change** sans
quitter la vue Portfolio / Wave. Les deux choix sont annoncés (« Showing Payroll », « Changing all products »), ni annulables ni enregistrés.

**Vue Portfolio ou Wave.** Une section de saisie garde en haut sa **synthèse agrégée** (lecture seule, une ligne par produit, bouton
**Edit this product** qui bascule la vue) et devient **modifiable sur place** juste en dessous (cadre **Changing …**) :

- **Change = un produit** : la vraie section de ce produit, comme dans sa vue Product, sous le titre « Changing *nom* only » et le bandeau
  « Changing *nom* only — the results above and elsewhere still show the Portfolio » ; les résultats restent ceux de la vue choisie.
- **Change = All products** : titre « Changing all products (shared values) » ; la section affiche les **valeurs partagées** (ce dont tout produit
  hérite) et chaque modification va au commun, en une étape annulable, même pour une clé que le produit actif surcharge. À côté de chaque champ
  qu'un ou plusieurs produits surchargent : « *N* products override this: A, B — they keep their value » et un bouton **Back to shared: *produit***
  par produit. Les chiffres de cet éditeur sont calculés avec l'équipe du produit actif.
- Données propres à un produit : l'équipe d'entrée (« The team is per product — pick a product in Change to change it ») et, dans **🧠 Knowledge hub**,
  les domaines et la préparation du transfert ne s'éditent pas pour **All products**.

**Vue Product.** La liste **Change** fonctionne aussi : choisir un autre produit l'affiche (la vue suit le produit édité). Avec **All products**, une clé que
ce produit surcharge déjà reste modifiée **sur sa surcharge** (les autres vont au commun) ; pour changer le commun quel que soit le produit,
passez par la vue Portfolio.

## 4. Vagues

Section **🌊 Waves** : une colonne par vague, puis **Unscheduled**.

1. **Add a wave** (*Name of the new wave*, *Start of the new wave (month)*) ; renommer, réordonner, supprimer, changer le **Start (month)**.
2. Placez un produit dans une vague par **glisser-déposer**, par les flèches ← / → sur la carte, ou par le menu **Move to wave…** (clavier et lecteurs d'écran).
3. Le **décalage** d'un produit (mois) étale son démarrage dans la vague sans créer de vague. Le mois 0 d'un produit = démarrage de la vague + décalage.
4. Un produit appartient à **une seule** vague. Un produit **unscheduled** est exclu de la consolidation (grisé, avertissement dans les diagnostics).

## 5. Knowledge transfer

Le **Knowledge Hub** est commun au portefeuille ; chaque produit en utilise un **sous-ensemble**.

- Section **🧠 Knowledge hub** (avec 2 produits ou plus, elle édite le sous-ensemble du produit actif ; en vue Portfolio / Wave avec **All products**, le hub commun) : activation, les 9 réponses de maturité (état initial),
  niveau cible, charge de curation, base du coût de mise en place, **Knowledge domains** (libellé + poids, total = 100 %) et
  **Knowledge transfer preparation (months before the wave)**, qui avance le coût de mise en place de *k* mois avant le mois 0 du produit.
- Carte **Portfolio Knowledge Hub (common to all products)** : activation par défaut, *Hub infrastructure (€/month)* et
  **Infrastructure allocation** (*Full cost per product* ou *In proportion to the entry headcount* ; la somme des parts égale toujours le coût du hub).
- Section **🔁 Knowledge transfer** : une ligne par produit (CC initial, cible, domaines, mise en place, coût annuel, jours de KT évités, préparation), totaux,
  filtre *Filter by wave*, et **Hub effect** par vague (écart avec et sans hub).
- Les chiffres d'un produit ne dépendent que de **son** sous-ensemble.

## 6. Consolidation et périmètre d'affichage

- Section **📈 Consolidation** : trésorerie cumulée du portefeuille et de chaque vague, tableaux par vague et par produit, flux par année calendaire.
  Le portefeuille est **exactement la somme** des produits décalés dans le temps ; la VAN est la **Calendar NPV** (actualisée depuis le mois 1 du portefeuille).
- Liste unique **👁 Show** : **Portfolio**, une vague ou un produit. Choisir un produit l'affiche *et* l'édite (**Change** passe sur lui) ; choisir le portefeuille ou une vague remet **Change** sur **All products** (§ 3.1). La barre d'indicateurs, le Gantt (une barre par vague,
  produits dépliables), Decision Intelligence et le rapport suivent cette vue. Elle n'est pas enregistrée dans le fichier.
- Ctrl+Z / Ctrl+Y annulent aussi bien une équipe, une surcharge, un déplacement de produit qu'une date de vague.

## 7. Stress du portefeuille

Section **🎲 Portfolio stress** : réglez *Draws per product*, *Seed* et **Correlation between products ρ** (0 = indépendants, 1 = mêmes chocs), puis
**▶ Run the simulation**. Vous obtenez P10 / P50 / P90, CVaR, P(net < 0), la **Risk reduction** (diversification) par vague et par produit.
Si le portefeuille change après la simulation, un marqueur « The portfolio changed since the last simulation » apparaît. Avec la vue
Portfolio ou Wave, **Decision Intelligence** applique la règle du verdict à cette distribution. Les scénarios et la sensibilité restent par produit.

## 8. Exporter

Section **📥 Import / Export** :

- **⬇️ Export / Import current settings** → *Export all* : le classeur de paramètres ajoute `PortfolioSettings`, `Products`, `Waves`, `TeamIn`, `Overrides`,
  `KnowledgeSubsets` et `KnowledgeDomains` ; l'import remplace tout le portefeuille en **une seule étape annulable**.
- **📊 Results workbook** : feuilles *Portfolio*, une par vague, *Knowledge transfer*, *Portfolio stress* (si une simulation existe) et, pour chaque produit, ses feuilles de résultats.
- **📄 Export critical-delivery report** avec *Report scope* (Portfolio, Wave: … ou Product: …).
- **💾 Save HTML**, **🗂️ Snapshot Manager** : le fichier ou la photo contient tout le portefeuille. Un portefeuille qui revient à un cas simple est enregistré comme avant
  (`agentcase.snapshot.v1`).

Les noms de fichiers portent la version : `AgentCase_v20_0_Parameters_….xlsx`.

### Cost model workbook

Dans l'onglet **📊 Results workbook**, l'option **💶 Cost model (monthly)** produit un classeur pour **recalculer le coût hors de l'application** :
*jours x tarif appliqué + autres coûts = coût de l'application*. Choisir le périmètre (*Cost model scope* : Portfolio, Wave: … ou Product: …, par défaut la vue **Show** de la barre du haut ;
avec un seul produit, seulement ce produit), puis **⬇️ Export cost model (.xlsx)**. Fichier : `AgentCase_v<version>_CostModel_<périmètre>_<horodatage UTC>.xlsx`.

Les colonnes sont les mois calendaires du portefeuille (M1 = premier mois du portefeuille, avec la date si une date de départ est définie), précédées d'une colonne **t0** (la référence
AS-IS : l'équipe d'entrée avant transformation, par mois) et suivies d'un **Total** (somme de M1 à Mn). Un produit ne compte qu'à partir de son mois 1 (début de vague + décalage) :
avant, les cellules sont **vides** (pas zéro) ; son setup de transfert de connaissance (KT) peut venir plus tôt. Les produits archivés ou sans vague sont exclus et listés en en-tête.

Trois onglets exactement :

1. **Values** : jours humains par mois (Portfolio, Wave, Product, Skill, Grade, Location) = FTE humain du moteur x jours ouvrés/12, répartis sur les lignes de l'équipe AS-IS au prorata de
   leur FTE ; sous-totaux produit, vague, portefeuille (formules `SUM`) ; côté agentique à titre d'information (*Agent (vFTE)*, *Agentic run team*) et lignes *Drivers* (adoption, automatisation) hors totaux de jours.
2. **Rate cards** : le tarif jour par lieu et grade (le `RATE` du cas), le mix de lieux cible et les TJM AS-IS / cible par produit, puis le **tarif appliqué** à chaque ligne et chaque mois.
   Le moteur valorise l'équipe TO-BE à **un seul TJM cible** : la ligne *Blending adjustment* (jours x (TJM cible − TJM AS-IS)) fait coïncider les totaux. *Team cost* = `SUMPRODUCT(jours; tarifs)` + ajustement ;
   la ligne *Difference* doit valoir 0.
3. **Other costs** : une ligne par poste (AgentOps, tokens, infrastructure, curation et infrastructure du Knowledge Hub, taxes de vérification / rework / conformité, KT évité en négatif, setup en trois lignes
   dont le KT placé `ktLeadMonths` avant le mois 0), puis **TOTAL TO-BE COST** = coût d'équipe (lien vers *Rate cards*) + lignes, comparé au total du moteur (coût AS-IS − économies nettes) avec une ligne
   *Difference* (0). Le pilote est un mémo indicatif (hors coût moteur). Sous le tableau : le facteur d'actualisation mensuel et le bloc **Parameters** (taux d'actualisation annuel et mensuel, horizon, jours ouvrés,
   catalogue de prix des tokens, réglages du hub, coefficients du contexte d'engagement…), chacun avec la section de l'application où il se modifie.

Pour recalculer : modifier un tarif (Rate cards) ou un nombre de jours (Values) et lire le total (Other costs) ; les sous-totaux, la ligne d'équipe et les contrôles se recalculent par formules.

## 9. Limites connues

Pas de tableau de scénarios de portefeuille (les six scénarios restent par produit), pas de dépendances entre vagues, pas d'équipes partagées entre produits,
pas de réutilisation de connaissance d'un produit à l'autre, tarifs et coefficients communs, *Apply to all products* non proposé pour les champs du sous-ensemble de connaissance.
