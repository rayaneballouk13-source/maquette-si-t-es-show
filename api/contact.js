const { createHandler } = require('./_lib');

const OBJETS = [
  'Question sur un événement',
  'Devenir bénévole',
  'Je suis artiste',
  'Participer à une activité',
  "Soutenir l'association",
  'Presse et partenariats',
  'Autre demande'
];

const schema = {
  title: 'Nouveau message de contact',
  subject: (d) => `[Site] ${d.objet} — ${d.nom}`,
  success: 'Merci, votre message a bien été envoyé. Nous vous répondrons par e-mail.',
  fields: [
    { name: 'nom', label: 'Nom et prénom', required: true, max: 100 },
    { name: 'email', label: 'E-mail', type: 'email', required: true, max: 160 },
    { name: 'objet', label: 'Objet', required: true, options: OBJETS },
    { name: 'message', label: 'Message', required: true, min: 10, max: 3000 },
    { name: 'consentement', label: 'Consentement au traitement des données', type: 'checkbox', required: true }
  ]
};

module.exports = createHandler(schema);
module.exports.schema = schema;
