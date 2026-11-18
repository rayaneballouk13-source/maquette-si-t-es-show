# SI T'ES SHOW — site vitrine

Site en HTML, CSS et JavaScript simples. Aucune installation : ouvrir `index.html` dans un navigateur pour le voir.

## Mettre en ligne avec GitHub Pages

1. Créer un dépôt GitHub, puis **Add file → Upload files**.
2. Glisser **le contenu** du dossier (`index.html`, `styles.css`, `script.js`, le dossier `assets`), pas le dossier lui-même.
3. **Settings → Pages → Deploy from a branch → `main` / root**, puis enregistrer.

Le site peut aussi être importé dans Vercel depuis le dépôt, sans commande de build.

## À remplacer avant la mise en ligne

- Les 3 boutons des événements, le bouton « En savoir plus » et « Contact » pointent pour l'instant vers la page Facebook. Remplacer par les vrais liens (Google Forms, billetterie…) dans `index.html`.
- Les 7 emplacements de partenaires : remplacer chaque bloc `partner-placeholder` par `<img src="assets/nom-du-logo.png" alt="Nom du partenaire">`.
- Photo du hero (`assets/hero-stage.jpg`) : basse résolution, à remplacer par une photo plus grande.
