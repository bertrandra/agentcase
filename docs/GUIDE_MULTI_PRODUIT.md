# AgentCase 20 — Guide de démarrage : portefeuille multi-produits

> Public : analystes et responsables de dossier qui construisent un business case pour **plusieurs produits** transformés par **vagues**.
> Les intitulés en gras sont ceux de l'interface. Spécification complète : [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md) ;
> architecture : [ARCHITECTURE.md](ARCHITECTURE.md) § « Portfolio ».

## 0. Pour essayer tout de suite

Ouvrez le fichier d'exemple [`examples/AgentCase_Portfolio_Example.json`](examples/AgentCase_Portfolio_Example.json) avec le bouton d'ouverture
de la barre haute (ou **📥 Import / Export** → *Open an HTML or JSON snapshot…*). Il contient quatre produits :

| Produit | Vague | Particularité |
|---|---|---|
| Core platform | Vague 1 (mois 0) | équipe de 3 ETP, périmètre commun |
| Payments | Vague 1, décalage de 2 mois | 24 ETP, catalogue réglementaire seulement pour lui (surcharge), sous-ensemble de connaissance propre |
| Mobile app | Vague 2 (mois 6) | 16 ETP, contexte d'engagement surchargé, préparation du transfert 3 mois avant la vague |
| Archive (not scheduled) | aucune | **non planifié** : exclu de la consolidation, avec un avertissement |

Le Knowledge Hub est commun (infrastructure 3 000 €/mois, imputée au prorata de l'effectif d'entrée) et la corrélation ρ vaut 0,3.
Le fichier est un portefeuille (`agentcase.portfolio.v1`). Un fichier « cas unique » d'une version précédente s'ouvre toujours : il devient
un portefeuille d'un produit « Produit 1 » dans une « Vague 1 » au mois 0, avec **exactement les mêmes chiffres**.

## 1. Ajouter un produit

Tant qu'il n'y a qu'un produit, rien ne change à l'écran (pas de sélecteur, pas de groupe de menu). Pour passer en multi-produits :

1. **🏠 Welcome** → encadré « Portefeuille » → bouton **Ajouter un produit** (ou, plus tard, section **📦 Produits** → champ *Nom du nouveau produit* →
   **Ajouter un produit**).
2. La barre haute affiche alors **Produit** (le produit actif), **Périmètre** (périmètre d'affichage) et **Modifier : Tous les produits / Ce produit seulement**.
3. Le nouveau produit **hérite de toutes les valeurs communes** ; seule son **équipe d'entrée** lui est propre.
4. Dans **📦 Produits** : *Dupliquer* (copie équipe et surcharges), *Archiver / Restaurer*, *Supprimer*, note, **décalage** en mois, bouton *Activer*.
   Un portefeuille compte de 1 à 50 produits ; le dernier produit ne peut pas être supprimé.

## 2. L'équipe d'entrée de chaque produit

Les sections d'équipe affichent **Équipe de : *produit actif***. L'équipe n'est **jamais héritée ni partagée** : choisissez le produit dans le sélecteur
**Vue** (entrée « Produit : … »), puis saisissez son équipe (compétence, grade, localisation, ETP) comme pour un cas unique. Les autres produits ne bougent pas.
Une personne ne peut pas être affectée à deux produits (limite connue, § 9).

## 3. Périmètre commun et surcharges

- Le **périmètre** (artefacts SDLC et réglementaires, normes, phases) et les paramètres cibles sont des **valeurs communes**. Quand vous les modifiez
  avec **Modifier : Tous les produits**, tous les produits qui **héritent** suivent.
- Pour qu'un produit diffère : sélectionnez **Ce produit seulement**, ouvrez la section concernée et modifiez-la. Une puce **surchargé** apparaît
  (la valeur commune est dans l'infobulle). La surcharge porte sur la **clé entière** (une liste d'artefacts est remplacée en bloc).
- **Revenir au commun** supprime la surcharge ; **Appliquer à tous les produits** écrit la valeur du produit au niveau commun et retire les surcharges identiques.
- La section **🧬 Surcharges** liste, par produit, les clés surchargées (*Valeur commune* / *Valeur du produit*) avec ces deux actions.
- Restent communs, par décision : tarifs, modèle et coefficients, taux d'actualisation, horizon.

## 4. Vagues

Section **🌊 Vagues** : une colonne par vague, puis **Non planifié**.

1. **Ajouter une vague** (*Nom de la nouvelle vague*, *Démarrage de la nouvelle vague (mois)*) ; renommer, réordonner, supprimer, changer le **Démarrage (mois)**.
2. Placez un produit dans une vague par **glisser-déposer**, par les flèches ← / → sur la carte, ou par le menu **Déplacer vers la vague…** (clavier et lecteurs d'écran).
3. Le **décalage** d'un produit (mois) étale son démarrage dans la vague sans créer de vague. Le mois 0 d'un produit = démarrage de la vague + décalage.
4. Un produit appartient à **une seule** vague. Un produit **non planifié** est exclu de la consolidation (grisé, avertissement dans les diagnostics).

## 5. Knowledge transfer

Le **Knowledge Hub** est commun au portefeuille ; chaque produit en utilise un **sous-ensemble**.

- Section **🧠 Knowledge hub** (avec 2 produits ou plus, elle édite le sous-ensemble du produit actif) : activation, les 9 réponses de maturité (état initial),
  niveau cible, charge de curation, base du coût de mise en place, **Domaines de connaissance** (libellé + poids, total = 100 %) et
  **Préparation du transfert (mois avant la vague)**, qui avance le coût de mise en place de *k* mois avant le mois 0 du produit.
- Carte **Knowledge Hub du portefeuille (commun à tous les produits)** : activation par défaut, *Infrastructure du hub (€/mois)* et
  **Imputation de l'infrastructure** (*par produit* ou *au prorata de l'effectif d'entrée* ; la somme des parts égale toujours le coût du hub).
- Section **🔁 Knowledge transfer** : une ligne par produit (CC initial, cible, domaines, mise en place, coût annuel, jours de KT évités, préparation), totaux,
  filtre *Filtrer par vague*, et **Effet du hub** par vague (écart avec et sans hub).
- Les chiffres d'un produit ne dépendent que de **son** sous-ensemble.

## 6. Consolidation et périmètre d'affichage

- Section **📈 Consolidation** : trésorerie cumulée du portefeuille et de chaque vague, tableaux par vague et par produit, flux par année calendaire.
  Le portefeuille est **exactement la somme** des produits décalés dans le temps ; la VAN est la **VAN calendaire** (actualisée depuis le mois 1 du portefeuille).
- Sélecteur unique **Vue** : **Portefeuille**, **Vague : …** ou **Produit : …**. Choisir un produit l'affiche *et* l'édite ; avec le portefeuille ou une vague en vue, « Édition : produit » rappelle quel produit les sections modifient. La barre d'indicateurs, le Gantt (une barre par vague,
  produits dépliables), Decision Intelligence et le rapport suivent cette vue. Elle n'est pas enregistrée dans le fichier.
- Ctrl+Z / Ctrl+Y annulent aussi bien une équipe, une surcharge, un déplacement de produit qu'une date de vague.

## 7. Stress du portefeuille

Section **🎲 Stress portefeuille** : réglez *Tirages par produit*, *Graine* et **Corrélation entre produits ρ** (0 = indépendants, 1 = mêmes chocs), puis
**▶ Lancer la simulation**. Vous obtenez P10 / P50 / P90, CVaR, P(net < 0), la **réduction du risque** (diversification) par vague et par produit.
Si le portefeuille change après la simulation, un marqueur « Le portefeuille a changé depuis la dernière simulation » apparaît. Avec le périmètre
Portefeuille ou Vague, **Decision Intelligence** applique la règle du verdict à cette distribution. Les scénarios et la sensibilité restent par produit.

## 8. Exporter

Section **📥 Import / Export** :

- **⬇️ Export / Import current settings** → *Export all* : le classeur de paramètres ajoute `PortfolioSettings`, `Products`, `Waves`, `TeamIn`, `Overrides`,
  `KnowledgeSubsets` et `KnowledgeDomains` ; l'import remplace tout le portefeuille en **une seule étape annulable**.
- **📊 Results workbook** : feuilles *Portfolio*, une par vague, *Knowledge transfer*, *Portfolio stress* (si une simulation existe) et, pour chaque produit, ses feuilles de résultats.
- **📄 Export critical-delivery report** avec *Report scope* (Portefeuille, Vague ou Produit).
- **💾 Save HTML**, **🗂️ Snapshot Manager** : le fichier ou la photo contient tout le portefeuille. Un portefeuille qui revient à un cas simple est enregistré comme avant
  (`agentcase.snapshot.v1`).

Les noms de fichiers portent la version : `AgentCase_v20_0_Parameters_….xlsx`.

## 9. Limites connues

Pas de tableau de scénarios de portefeuille (les six scénarios restent par produit), pas de dépendances entre vagues, pas d'équipes partagées entre produits,
pas de réutilisation de connaissance d'un produit à l'autre, tarifs et coefficients communs, *Appliquer à tous* non proposé pour les champs du sous-ensemble de connaissance.
