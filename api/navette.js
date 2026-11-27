/* GET  /api/navette → places disponibles
   POST /api/navette → réserver des places dans la Navette du rire */
const { validate, rateLimited, renderEmail, sendEmail, env } = require('./_lib');
const { isConfigured } = require('./_store');
const navette = require('./_navette');

const schema = {
  title: 'Réservation — La Navette du rire',
  fields: [
    { name: 'prenom', label: 'Prénom', required: true, max: 60 },
    { name: 'nom', label: 'Nom', required: true, max: 60 },
    { name: 'email', label: 'E-mail', type: 'email', required: true, max: 160 },
    { name: 'telephone', label: 'Téléphone', type: 'tel', required: true, max: 25 },
    { name: 'arret', label: 'Point de ramassage', required: true, options: navette.ARRETS },
    { name: 'places', label: 'Nombre de places', required: true, max: 2 },
    { name: 'consentement', label: 'Consentement au traitement des données', type: 'checkbox', required: true }
  ],
  check(clean, errors) {
    const n = Number(clean.places);
    if (!errors.places && !(Number.isInteger(n) && n >= 1 && n <= navette.MAX_PAR_RESERVATION)) {
      errors.places = `Choisissez entre 1 et ${navette.MAX_PAR_RESERVATION} places.`;
    }
  }
};

const ID_RE = /^[a-z0-9-]{16,64}$/i;
const NOT_READY = "Les réservations ne sont pas encore ouvertes. Revenez un peu plus tard ou contactez-nous via le formulaire de contact.";

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    if (!isConfigured()) return res.status(503).json({ message: NOT_READY });
    try {
      return res.status(200).json(await navette.getStatus());
    } catch (err) {
      console.error('[navette]', err.message);
      return res.status(502).json({ message: 'Impossible de charger les places disponibles. Réessayez dans un instant.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ message: 'Requête invalide.' });

  // Anti-spam, comme les autres formulaires du site
  if (body.site_web) return res.status(200).json({ message: 'Votre réservation est enregistrée.' });
  if (typeof body._elapsed !== 'number' || body._elapsed < 3000) {
    return res.status(400).json({ message: "L'envoi a été bloqué par la protection anti-spam. Patientez quelques secondes puis réessayez." });
  }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
  if (rateLimited('navette:' + ip, 8)) {
    return res.status(429).json({ message: 'Trop de réservations envoyées en peu de temps. Réessayez dans quelques minutes.' });
  }

  if (typeof body.places === 'number') body.places = String(body.places);
  const { errors, clean } = validate(schema, body);
  if (!ID_RE.test(String(body._id || ''))) errors._id = 'Identifiant de réservation invalide.';
  if (Object.keys(errors).length) {
    return res.status(422).json({ message: 'Certains champs sont à corriger.', errors });
  }

  if (!isConfigured()) return res.status(503).json({ message: NOT_READY });

  const data = {
    prenom: clean.prenom, nom: clean.nom, email: clean.email, telephone: clean.telephone,
    arret: clean.arret, places: Number(clean.places)
  };

  let result;
  try {
    result = await navette.reserve(String(body._id), data);
  } catch (err) {
    console.error('[navette]', err.message);
    return res.status(502).json({ message: "La réservation n'a pas pu être enregistrée. Réessayez dans un instant." });
  }

  if (!result.ok) {
    const { restantes } = result.status;
    if (result.code === 'complet') {
      const message = restantes === 0
        ? 'La navette est complète : il ne reste plus aucune place.'
        : `Il ne reste que ${restantes} place${restantes > 1 ? 's' : ''}. Réduisez le nombre de places demandées.`;
      return res.status(409).json({ message, status: result.status, errors: restantes ? { places: message } : undefined });
    }
    return res.status(409).json({ message: 'Cette réservation est déjà en cours d’envoi. Patientez quelques secondes.', status: result.status });
  }

  const r = result.reservation;
  const numero = r.id.replace(/-/g, '').slice(0, 6).toUpperCase();

  // Prévient l'association par e-mail (sans bloquer la réservation si l'envoi échoue)
  if (env('RESEND_API_KEY') && env('CONTACT_TO')) {
    const mailSchema = { ...schema, title: `${schema.title} — n° ${numero}`, fields: schema.fields.filter((f) => f.type !== 'checkbox') };
    const { html, text } = renderEmail(mailSchema, { ...data, places: String(data.places) });
    const { restantes } = result.status;
    await sendEmail({
      subject: `[Navette du rire] ${data.places} place${data.places > 1 ? 's' : ''} — ${data.prenom} ${data.nom} (reste ${restantes})`,
      html: html + `<p style="font-family:Arial,sans-serif;color:#666">Places restantes : ${restantes} sur ${result.status.capacite}.</p>`,
      text: `${text}\n\nPlaces restantes : ${restantes} sur ${result.status.capacite}.`,
      replyTo: data.email
    }).catch((err) => console.error('[navette] e-mail', err.message));
  }

  return res.status(200).json({
    message: `C'est réservé ! ${data.places} place${data.places > 1 ? 's' : ''} au nom de ${data.prenom} ${data.nom}, départ de ${data.arret}. Votre numéro de réservation : ${numero}.`,
    numero,
    status: result.status
  });
};
