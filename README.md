# Randomizer — Tirage au sort

Application web statique de tirage au sort pour la classe, à plusieurs onglets : **Noms** (liste importable, historique, confettis), **Dés** (styles Points / Chiffres / Doigts, 1 à 6 dés) **Images** (tirage d'une image d'un dossier, animation en carrousel) et **Sons** (sons d'un dossier mélangés puis écoutés un à un).

Pour l'historique complet du projet, les décisions prises et ce qu'il reste à faire, voir [`NOTES.md`](./NOTES.md).

## Structure

```
index.html                    Page principale
css/outil.css                 UI de référence Apps1D76 (copie à l'identique, ne pas modifier)
scripts/outil.js              UI de référence Apps1D76 : thème clair/sombre, réglages partagés
css/style.css                 Styles propres à l'outil (utilisent les variables de outil.css)
scripts/randomizer.js         Logique de l'application
assets/dice-hands/1.png..6.png  Illustrations des dés "Doigts"
icon.png                      Icône / favicon
NOTES.md                      Mémoire du projet (historique, décisions, suite)
```

## Onglet Images : notice des formats acceptés

Choisir un dossier (bouton « Choisir un dossier ») ou plusieurs fichiers (« Choisir des images »), puis « Lancer » : les images défilent en carrousel et s'arrêtent sur l'image tirée, affichée en grand avec son nom.

| Prise en charge | Formats |
|---|---|
| Tous les navigateurs | JPG / JPEG, PNG, GIF, WebP, SVG, BMP, ICO |
| Selon le navigateur | AVIF (navigateurs récents) · HEIC / HEIF, photos d'iPhone (Safari seulement) · TIFF (Safari seulement) |
| Non pris en charge | Photos RAW (CR2, NEF…), PSD, PDF, vidéos |

- Formats conseillés : **JPG ou PNG**, au moins 400 px de côté. Les petites images sont agrandies (donc floues).
- Les sous-dossiers sont inclus ; les fichiers qui ne sont pas des images et les fichiers cachés (`.DS_Store`…) sont ignorés. 300 images au maximum.
- Chaque image est testée au chargement : un fichier illisible (format non pris en charge par le navigateur, fichier abîmé) est listé dans le compte rendu avec la raison, et écarté du tirage.
- La légende est le nom du fichier sans l'extension, `_` remplacé par des espaces : `chat_noir.jpg` → « chat noir ». Elle peut être masquée (option « Afficher le nom de l'image »).
- Photos d'iPhone en HEIC : les convertir en JPG, ou régler l'iPhone sur *Réglages → Appareil photo → Formats → Le plus compatible*.
- Les images restent sur l'appareil (rien n'est envoyé) et ne sont pas conservées : il faut les rechoisir après un rechargement de la page.
- Sur iPad et iPhone, le choix d'un dossier n'est pas possible : utiliser « Choisir des images ».
- Options : durée du tirage (3 à 7 s), retirer l'image tirée (« Réinitialiser » remet toutes les images en jeu), historique partagé avec les autres onglets.

## Onglet Sons : mode d'emploi et formats acceptés

1. Choisir un dossier (« Choisir un dossier ») ou plusieurs fichiers (« Choisir des sons ») : les sons sont **mélangés au hasard**.
2. « Écouter le son » lance le son en cours ; pendant la lecture, le bouton met en pause puis reprend. Une fois le son fini, « Réécouter » le rejoue. Le haut-parleur s'anime au rythme du son.
3. « Son suivant » / « Son précédent » parcourent le tirage. La barre du bas montre la progression (son en cours, sons déjà écoutés) : un clic sur une case y va directement.
4. Décocher « Afficher le nom du son » pour faire deviner le bruit.
5. « Remélanger » refait un nouvel ordre et repart du début ; « Vider » retire les sons.

Clavier : `Espace` = écouter / pause, `←` `→` = son précédent / suivant.

| Prise en charge | Formats |
|---|---|
| Tous les navigateurs | MP3, WAV, M4A / AAC |
| Selon le navigateur | OGG, OPUS, WEBM (pas sur les anciens iPad / iPhone) · FLAC (navigateurs récents) |
| Non pris en charge | WMA, MIDI, AIFF (hors Safari), vidéos |

- Format conseillé : **MP3**. Sous-dossiers inclus, 200 sons au maximum ; les fichiers illisibles sont signalés et écartés.
- Nom affiché = nom du fichier : `des_applaudissements.mp3` → « des applaudissements ».
- Les sons restent sur l'appareil (rien n'est envoyé) et sont à rechoisir après un rechargement de la page. Sur iPad et iPhone, utiliser « Choisir des sons ».

## Utiliser en local

Aucune dépendance ni build : servez le dossier avec n'importe quel serveur statique.

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## Déployer

Le projet est 100% statique (HTML/CSS/JS) : il peut être déployé tel quel sur GitHub Pages, Netlify, Vercel, ou n'importe quel hébergeur de fichiers statiques.
