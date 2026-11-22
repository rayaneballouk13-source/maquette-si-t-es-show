const { createHandler } = require('./_lib');

const ATELIERS = ['Saint-Waast', 'Dutemple', 'Faubourg de Lille', 'Bruay-sur-Escaut', 'Je ne sais pas encore'];
const AGES = ['Moins de 18 ans', '18 à 25 ans', '26 à 59 ans', '60 ans et plus'];

const schema = {
  title: 'Inscription — Ateliers du rire',
  subject: (d) => `[Ateliers du rire] Inscription de ${d.prenom} ${d.nom} — ${d.atelier}`,
  success: "Merci, votre inscription aux Ateliers du rire est bien enregistrée. L'association vous recontactera par e-mail avec les dates et les informations pratiques.",
  fields: [
    { name: 'prenom', label: 'Prénom', required: true, max: 60 },
    { name: 'nom', label: 'Nom', required: true, max: 60 },
    { name: 'email', label: 'E-mail', type: 'email', required: true, max: 160 },
    { name: 'telephone', label: 'Téléphone', type: 'tel', max: 25 },
    { name: 'atelier', label: 'Atelier souhaité', required: true, options: ATELIERS },
    { name: 'age', label: "Tranche d'âge", required: true, options: AGES },
    { name: 'responsable', label: 'Responsable légal', max: 100 },
    { name: 'message', label: 'Message', max: 1500 },
    { name: 'consentement', label: 'Consentement au traitement des données', type: 'checkbox', required: true }
  ],
  check(d, errors) {
    if (d.age === 'Moins de 18 ans' && !d.responsable && !errors.responsable) {
      errors.responsable = "Pour un participant mineur, indiquez le nom d'un responsable légal.";
    }
  }
};

module.exports = createHandler(schema);
module.exports.schema = schema;
