# SI T'ES SHOW — site de l'association

Site statique (HTML, CSS, JavaScript sans dépendance), hébergé sur Vercel, avec trois petites fonctions serveur pour les formulaires.

## Structure

| Fichier / dossier | Rôle |
|---|---|
| `index.html` | Page d'accueil : Hero, À l'affiche, L'association, partenaires, Rejoindre l'aventure, Contact |
| `inscription-ateliers.html` | Formulaire « Je participe » des Ateliers du rire |
| `candidature-tremplin.html` | Formulaire « Je candidate » du Tremplin d'humour |
| `mentions-legales.html` | Mentions légales et politique de confidentialité |
| `config.js` | **Contenus modifiables** : lien HelloAsso, Facebook, chiffres, galerie, témoignages |
| `styles.css` | Design system (variables en tête de fichier), mobile first |
| `script.js` | Menu, sections alimentées par `config.js`, envoi des formulaires |
| `api/` | Fonctions Vercel : `contact.js`, `inscription.js`, `candidature.js` (logique commune dans `_lib.js`) |
| `assets/img/` | Images optimisées (WebP) — `partenaires/` pour les logos |
| `assets/fonts/` | Polices auto-hébergées (Bricolage Grotesque, DM Sans) |
| `images/` | Fichiers sources d'origine (non publiés) |

## Activer l'envoi des formulaires

Les formulaires envoient un e-mail via [Resend](https://resend.com). Aucune donnée n'est stockée.

1. Créer un compte Resend et une clé API.
2. Dans Vercel → projet → **Settings → Environment Variables**, ajouter :
   - `RESEND_API_KEY` : la clé Resend ;
   - `CONTACT_TO` : l'adresse qui reçoit les formulaires (plusieurs adresses séparées par des virgules) ;
   - `MAIL_FROM` *(recommandé)* : un expéditeur sur un domaine vérifié dans Resend, ex. `SI T'ES SHOW <site@mondomaine.fr>`.
3. Redéployer.

Sans domaine vérifié, Resend n'envoie qu'à l'adresse du compte Resend lui-même : dans ce cas, créer le compte Resend avec l'adresse de `CONTACT_TO`.

Tant que la clé n'est pas configurée, les formulaires affichent un message invitant à passer par Facebook.

Protection anti-spam : champ piège invisible, délai minimal de remplissage, limite d'envois par adresse IP, validation complète côté serveur.

## Mettre à jour les contenus (`config.js`)

- **Billetterie** : `liens.billetterieJojoBernard`. Laisser `''` désactive le bouton.
- **Chiffres** : la section s'affiche à partir de 3 chiffres réels.
- **Galerie** : déposer les photos dans `assets/img/galerie/` puis les déclarer.
- **Témoignages** : uniquement des témoignages réels, avec l'accord des personnes.

## À compléter

- Mentions légales : adresse du siège, numéro RNA ou SIRET, responsable de la publication.
- Photo du Hero en haute définition (l'actuelle fait 409 px de large).
- Si un nom de domaine est acheté : remplacer `maquette-si-t-es-show.vercel.app` dans les balises `canonical`/`og:`, `sitemap.xml` et `robots.txt`.
