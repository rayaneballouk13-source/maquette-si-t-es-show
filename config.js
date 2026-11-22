/* =========================================================
   SI T'ES SHOW — contenus modifiables sans toucher au code
   ---------------------------------------------------------
   Règle : n'ajoutez ici que des informations réelles.
   Une section vide reste automatiquement masquée sur le site.
   ========================================================= */
window.SITE_CONFIG = {
  liens: {
    facebook: 'https://www.facebook.com/share/1EKz69pP5z/?mibextid=wwXIfr',
    // Billetterie officielle du spectacle de Jojo Bernard (HelloAsso).
    // Laisser '' pour désactiver le bouton.
    billetterieJojoBernard: 'https://www.helloasso.com/associations/centre-social-de-la-region-d-ostricourt/evenements/jojo-bernard-tout-le-monde-il-est-beauf'
  },

  /* SI T'ES SHOW en quelques chiffres.
     La section s'affiche dès qu'il y a au moins 3 chiffres.
     Exemple : { valeur: '120', libelle: 'événements organisés' } */
  chiffres: [
    { valeur: '2006', libelle: 'année de création' }
    // { valeur: '', libelle: 'événements organisés' },
    // { valeur: '', libelle: 'participants' },
    // { valeur: '', libelle: 'artistes accompagnés' },
    // { valeur: '', libelle: 'communes concernées' }
  ],

  /* Nos événements en images.
     Déposer les photos dans assets/img/galerie/ puis les déclarer ici.
     format : 'large' (2 colonnes), 'haute' (2 lignes) ou '' (normal).
     Exemple : { src: 'assets/img/galerie/atelier-2026.webp', alt: 'Atelier du rire à Saint-Waast', legende: 'Atelier du rire, Saint-Waast', format: 'large' } */
  galerie: [],

  /* Ils parlent de nous — uniquement des témoignages réels, avec accord de la personne.
     Exemple : { citation: '…', auteur: 'Prénom N.', role: 'Participante aux Ateliers du rire' } */
  temoignages: []
};
