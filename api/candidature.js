const { createHandler } = require('./_lib');

const EXPERIENCES = ['Jamais encore sur scène', 'Quelques passages sur scène', 'Je joue régulièrement'];

const schema = {
  title: "Candidature — Tremplin d'humour Les Oscaars du rire",
  subject: (d) => `[Tremplin] Candidature de ${d.nom_scene || `${d.prenom} ${d.nom}`}`,
  success: "Merci, votre candidature au Tremplin d'humour est bien envoyée. L'association l'étudiera et vous répondra par e-mail.",
  fields: [
    { name: 'prenom', label: 'Prénom', required: true, max: 60 },
    { name: 'nom', label: 'Nom', required: true, max: 60 },
    { name: 'nom_scene', label: 'Nom de scène', max: 80 },
    { name: 'email', label: 'E-mail', type: 'email', required: true, max: 160 },
    { name: 'telephone', label: 'Téléphone', type: 'tel', required: true, max: 25 },
    { name: 'ville', label: 'Ville', required: true, max: 80 },
    { name: 'experience', label: 'Expérience de la scène', required: true, options: EXPERIENCES },
    { name: 'presentation', label: 'Présentation et univers', required: true, min: 30, max: 2000 },
    { name: 'video', label: 'Lien vers une vidéo', type: 'url', max: 300 },
    { name: 'amateur', label: "Pratique l'humour en amateur", type: 'checkbox', required: true },
    { name: 'region', label: 'Réside dans les Hauts-de-France', type: 'checkbox', required: true },
    { name: 'consentement', label: 'Consentement au traitement des données', type: 'checkbox', required: true }
  ]
};

module.exports = createHandler(schema);
module.exports.schema = schema;
