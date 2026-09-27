# Mémoire du projet — Randomizer

Ce fichier sert de mémoire persistante du projet, pensé pour survivre à une migration vers un nouveau repo (par exemple via export ZIP, qui ne conserve pas l'historique Git). Il résume tout le travail effectué depuis le début, les décisions prises et ce qui reste à faire. À la reprise du travail — nouveau repo ou nouvelle session — commencer par lire ce fichier en entier.

Dernière mise à jour : 27/09/2026.

## Ce qu'est le projet

Une application web statique (HTML/CSS/JS pur, aucune dépendance, aucun backend) de tirage au sort pour la classe. Développée pour Etienne Liaudet, dans le cadre de la Mission numérique 76.

Fichiers principaux :
```
index.html
css/style.css
scripts/randomizer.js
assets/dice-hands/1.png ... 6.png   (illustrations de mains fournies par l'utilisateur)
icon.png                             (favicon)
README.md
NOTES.md                             (ce fichier)
```

Aucun build, aucune dépendance : s'ouvre en servant le dossier avec n'importe quel serveur statique (`python3 -m http.server`, GitHub Pages, Netlify, etc.).

## Historique du projet (dans l'ordre)

1. **Point de départ** : le projet était un widget pour le logiciel de tableau interactif OpenBoard (fichier `config.xml`, structure widget). Chemins cassés (`css/style.css` et `scripts/randomizer.js` référencés par `index.html` mais absents des bons dossiers) → l'appli ne fonctionnait pas du tout à l'ouverture.
2. **Pivot demandé par l'utilisateur** : abandon total d'OpenBoard. Suppression de `config.xml` et de toute référence à OpenBoard. Transformation en site web statique classique, déployable n'importe où.
3. Corrections : chemins réorganisés (`css/`, `scripts/`), favicon, README avec instructions de lancement.
4. **Refonte responsive** : l'interface utilisait un canvas de taille fixe (860×480) zoomé/centré en JS pour s'adapter à l'écran — mauvais rendu sur mobile (texte minuscule, bandes vides). Remplacé par une vraie mise en page fluide (flexbox, tailles en `clamp()`, points de rupture).
5. **Fonctionnalités ajoutées sur l'onglet Noms** :
   - Option "retirer le nom tiré de la liste" après un tirage (case à cocher).
   - Historique des derniers tirages ("Derniers tirages"), affichable/masquable, avec bouton "Effacer". Remplace un compteur de tirages simple, abandonné car jugé moins utile.
   - Effets visuels (confettis) : option activable/désactivable. Animation retravaillée plusieurs fois pour un rendu plus fluide (trajectoire en arc façon feu d'artifice, formes/tailles variées, délais échelonnés par particule).
   - Pied de page discret : "Un outil de la [Mission numérique 76](https://prim76.ac-normandie.fr/numerique) développé par Etienne Liaudet" (le lien est sur "Mission numérique 76", pas sur "prim76").
6. **Passe de qualité complète** (revue demandée explicitement par l'utilisateur) :
   - Bug trouvé et corrigé : le toggle confettis n'était jamais sauvegardé/restauré (aucun écouteur, aucune lecture au chargement).
   - Le curseur de durée du tirage utilisait le rendu natif du navigateur (disproportionné) → remplacé par un style personnalisé (piste fine, curseur rond).
   - Bug récurrent identifié : plusieurs éléments utilisaient l'attribut HTML `hidden`, mais leurs propres règles CSS (`display: flex` ou `display: contents`) l'écrasaient silencieusement, les rendant visibles alors qu'ils auraient dû être masqués. Corrigé une fois pour toutes avec une règle globale `[hidden] { display: none !important; }` plutôt que des correctifs au cas par cas.
7. **Passage multi-onglets** (nouvelle branche `claude/multi-tirage-onglets`, créée à partir de la branche précédente `claude/project-review-n5owya` — cette dernière contient les étapes 1 à 6 et a été fusionnée dans `main` seulement jusqu'à l'étape 3 via une pull request ; les étapes 4 à 6 ne sont a priori QUE sur `claude/project-review-n5owya`/`claude/multi-tirage-onglets`, pas sur `main` — **à vérifier/fusionner avant la migration si on veut tout garder**).
   - Ajout d'une barre d'onglets : **Noms** et **Dés** (Images et Sons prévus mais pas commencés).
   - Historique généralisé pour accepter plusieurs types de tirages (`{ label, kind, time }` au lieu de `{ name, time }`), avec un liseré de couleur différent par type dans la liste.
   - Les contrôles propres à l'onglet Noms (import/vider/retirer-de-la-liste) se masquent automatiquement hors de cet onglet.
8. **Onglet Dés — plusieurs itérations de design** :
   - v1 : simple, stepper +/- pour le nombre de dés, `<select>` pour le nombre de faces, dés numériques uniquement.
   - Refonte inspirée d'un générateur de dés en ligne (lutin-malin.fr, dont l'utilisateur a fourni le code source complet) : sélecteur de **style de dé** (Points / Chiffres / Doigts) sous forme de pastilles-icônes, rangées de pastilles numérotées pour le nombre de dés (1 à 6) et la valeur max (2 à 6 pour Points/Doigts, 4/6/8/10/12/20 pour Chiffres), bouton de lancer repositionné en bas à droite. **Palette de couleurs propre conservée** (bleu/blanc), pas celle du site de référence (jaune/bleu).
   - Style "Doigts" : d'abord dessiné en CSS (formes géométriques simulant des doigts), puis **remplacé par les vraies illustrations de mains fournies par l'utilisateur** (`assets/dice-hands/1.png` à `6.png`, PNG transparents, dessin au trait noir). Le remplacement doit ne concerner QUE le style Doigts (vérifié par test : 0 `<img>` en mode Points/Chiffres).
   - Rendu des tuiles de dés : plusieurs changements suite aux retours —
     1. d'abord dégradé bleu,
     2. puis blanc + bordure noire fine + ombre légère (pour mieux faire ressortir les dessins de mains),
     3. puis blanc + **bordure bleue outline** (couleur d'accent de l'app, `#2563eb`) + ombre plus marquée (version actuelle).
   - Taille des tuiles : d'abord fixe (64px), jugée trop petite → calculée dynamiquement en JS selon l'espace disponible et le nombre de dés sélectionné (1-2 dés = grandes tuiles, jusqu'à 6 = plus petites mais lisibles).
   - Animation de lancer : d'abord un simple défilement aléatoire des valeurs, puis enrichi d'un effet de **chute avec rebond échelonné** (inspiré du site de référence), plus un petit "pop" à l'atterrissage.
   - Bouton "Lancer" de l'onglet Noms repositionné (curseur de durée à gauche, bouton à droite) pour être **au même endroit** que celui de l'onglet Dés.
9. **Fonctionnalités transverses ajoutées** (inspirées du même site de référence, points validés explicitement par l'utilisateur — le point "impression de fiches" du même site a été explicitement écarté, ne pas l'ajouter) :
   - **Plein écran** : bouton dédié + raccourci clavier `F`, utilise l'API Fullscreen native avec repli CSS (`fakeFullscreen`) si elle est refusée par le navigateur.
   - **Raccourcis clavier** : `Espace`/`Entrée` lance le tirage de l'onglet actif, `Échap` quitte le plein écran. Désactivés quand le focus est dans un champ de saisie (pour ne pas gêner la frappe dans la liste de noms).
   - **Bandeau de notification transitoire** (toast) pour les confirmations : import de liste réussi, liste vidée, historique effacé.

## Décisions explicites de l'utilisateur (ne pas revenir dessus sans lui redemander)

- **Pas de persistance des images/sons entre sessions** pour les futurs onglets Images/Sons : réimport à chaque fois accepté, pas d'IndexedDB prévu.
- **Pas d'import "depuis un dossier en ligne via manifeste"** pour Images/Sons : idée explicitement écartée par l'utilisateur.
- **Pas de fonctionnalité d'impression de fiches** (contrairement au site de référence lutin-malin.fr) : explicitement écartée.
- Toujours garder la **palette de couleurs propre à l'app** (bleu `#2563eb` / blanc) quand on s'inspire d'un autre site — ne jamais reprendre leurs couleurs.

## État au moment de la migration

- Branche de travail : `claude/multi-tirage-onglets` (contient tout l'historique ci-dessus à partir de l'étape 7).
- Onglets fonctionnels : **Noms**, **Dés** (3 styles : Points, Chiffres, Doigts).
- Onglets prévus mais **pas commencés** : **Images**, **Sons**.
- Cette branche n'a pas encore été fusionnée dans `main`.

## Ce qu'il reste à faire (demandé par l'utilisateur)

1. Revoir le graphisme général de l'appli (pas seulement les dés) — passe de cohérence visuelle globale à faire, périmètre exact à clarifier avec l'utilisateur au démarrage de la prochaine session.
2. Harmoniser encore la taille/le visuel des dés (au-delà des ajustements déjà faits ci-dessus) — demander à l'utilisateur ce qui le gêne précisément avant de retoucher à l'aveugle.
3. Construire les onglets **Images** (import multi-fichiers local, tirage aléatoire, affichage) et **Sons** (import de dossier via `webkitdirectory`, avec repli par sélection multiple de fichiers pour les navigateurs qui ne le supportent pas comme Safari ; lecture via `<audio>`).

## Suggestions pour la reprise (avis de l'assistant, pas des demandes de l'utilisateur)

- Avant d'ajouter Images/Sons, envisager de factoriser le code partagé (historique, confettis, structure d'onglet, notifications) : `scripts/randomizer.js` commence à être long et mélange plusieurs domaines fonctionnels dans un seul fichier.
- Une fois les 4 onglets en place, prévoir une passe d'accessibilité (contrastes, focus clavier, aria-live) plutôt que de la traiter au fil de l'eau.
- Fusionner `claude/multi-tirage-onglets` dans `main` une fois l'ensemble jugé stable par l'utilisateur — actuellement `main` est en retard par rapport à cette branche.

## Comment reprendre le travail après import du ZIP dans un nouveau repo

1. Lire ce fichier en entier (fait si tu lis ceci).
2. Vérifier l'état réel des fichiers du repo (ils font foi, pas seulement ce résumé — décrire un état théorique n'est utile que si le code correspond).
3. Redémarrer un serveur local (`python3 -m http.server`) et ouvrir l'app dans un navigateur pour confirmer l'état avant de continuer.
4. Reprendre sur les 3 points de la section "Ce qu'il reste à faire" ci-dessus, dans l'ordre qui convient à l'utilisateur.
