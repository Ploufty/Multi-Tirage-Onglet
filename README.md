# Randomizer — Tirage au sort

Application web statique de tirage au sort pour la classe, à plusieurs onglets : **Noms** (liste importable, historique, confettis) et **Dés** (styles Points / Chiffres / Doigts, 1 à 6 dés). D'autres onglets (Images, Sons) sont prévus.

Pour l'historique complet du projet, les décisions prises et ce qu'il reste à faire, voir [`NOTES.md`](./NOTES.md).

## Structure

```
index.html                    Page principale
css/style.css                 Styles
scripts/randomizer.js         Logique de l'application
assets/dice-hands/1.png..6.png  Illustrations des dés "Doigts"
icon.png                      Icône / favicon
NOTES.md                      Mémoire du projet (historique, décisions, suite)
```

## Utiliser en local

Aucune dépendance ni build : servez le dossier avec n'importe quel serveur statique.

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## Déployer

Le projet est 100% statique (HTML/CSS/JS) : il peut être déployé tel quel sur GitHub Pages, Netlify, Vercel, ou n'importe quel hébergeur de fichiers statiques.
