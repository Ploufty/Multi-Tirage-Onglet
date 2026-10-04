# Contribuer à Multi-Tirages

Merci de votre intérêt ! Les contributions sont les bienvenues.

## Signaler un problème ou proposer une idée

Ouvrez un **ticket** dans la section Tickets du projet sur la Forge. Indiquez si possible :

- l'appareil et le navigateur (avec sa version) ;
- les étapes pour reproduire le problème ;
- une capture d'écran si c'est utile.

Ne joignez jamais de vrais noms d'élèves ni de données personnelles.

## Proposer une modification (merge request)

1. Créez une branche à partir de `main`.
2. Lancez l'application en local (voir le [README](README.md)) et testez vos changements dans les quatre onglets,
   sur grand écran et sur un écran de téléphone.
3. Respectez le style existant : `scripts/randomizer.js` est en JavaScript ES5 sans dépendance, `css/style.css` utilise
   les variables de `css/outil.css`.
4. Ne modifiez pas `css/outil.css` ni `scripts/outil.js` (interface commune), sauf accord préalable.
5. Ajoutez une ligne au `CHANGELOG.md` et ouvrez la merge request en décrivant ce qui change.
