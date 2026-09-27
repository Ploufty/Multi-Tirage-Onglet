# Images des dés « Doigts »

Les 6 dessins de mains affichés par le style « Doigts » (valeurs 1 à 6), et `icon.png`, la
petite icône du bouton « Type de dé ».

## Fichiers attendus

```
1.png  2.png  3.png  4.png  5.png  6.png
```

Les noms doivent être exactement ceux-là : l'appli les charge par leur nom.

## Consignes pour de nouveaux dessins

- **Format source** : PNG carré en haute définition (au moins 1200 × 1200 px), ou SVG.
- **Fond transparent**, mains **remplies de blanc** et **cernées de noir**. Ainsi elles restent
  lisibles sur le dé blanc, sur le bouton bleu actif et en mode sombre.
- **Même style pour les 6** : même épaisseur de trait et même taille de main.
- Pas besoin de soigner le cadrage ni le poids : la préparation s'en charge.

## Préparation (automatique)

Après avoir déposé de nouveaux originaux, lancer depuis la racine du dépôt :

```bash
NODE_PATH="$(npm root -g)" node .claude/skills/run-multi-tirage-onglet/prepare-hands.cjs
```

Le script remplace chaque image par une version prête pour l'appli :

- **600 × 600 px** : de quoi rester net sur le plus grand dé (300 px) des écrans haute
  définition et des TBI ;
- dessin **recadré et centré**, avec la **même marge (6 %)** pour les 6 : toutes les mains
  paraissent à la même échelle ;
- **trait uniformisé** : un dessin au trait plus fin que les autres est épaissi ;
- **PNG niveaux de gris + transparence**, compression maximale : environ 50 à 60 Ko par image.

Il (re)crée aussi **`icon.png`** à partir de la main 5 : contour seul (sans le remplissage
blanc), trait épaissi pour rester net à 32 px. L'appli l'utilise comme pochoir coloré avec la
couleur du bouton : foncée au repos, blanche quand le bouton est actif, claire en mode sombre.
Utiliser directement le dessin donnerait un pavé blanc à cette taille.

Il ignore les images déjà en 600 × 600 px, car les retraiter les rendrait floues. Les
originaux restent disponibles dans l'historique Git, par exemple :
`git show ddd96b7:assets/dice-hands/1.png > 1.png` (originaux de septembre 2026, 1254 × 1254 px).

L'outil de test (`driver.cjs code`) vérifie que les 6 images font 600 × 600 px et moins de 150 Ko.
