/* /api/navette-admin — espace de l'association (protégé par mot de passe)
   Variable d'environnement : NAVETTE_ADMIN_PASSWORD

   GET                          → état + liste des réservations
   POST { action: 'capacite', valeur }  → change la capacité du bus
   POST { action: 'annuler', id }       → annule une réservation
   POST { action: 'effacer' }           → efface toutes les réservations */
const crypto = require('crypto');
const { rateLimited, env } = require('./_lib');
const { isConfigured } = require('./_store');
const navette = require('./_navette');

function passwordOk(given) {
  const expected = env('NAVETTE_ADMIN_PASSWORD');
  if (!expected || !given) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');

  if (!env('NAVETTE_ADMIN_PASSWORD')) {
    return res.status(503).json({ message: "L'espace association n'est pas encore activé (mot de passe non configuré dans Vercel)." });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: "La base de données des réservations n'est pas encore connectée." });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!passwordOk(given)) {
    // Freine les essais de mots de passe : 10 erreurs max par quart d'heure
    if (rateLimited('admin:' + ip, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ message: 'Trop de tentatives. Réessayez dans un quart d’heure.' });
    }
    return res.status(401).json({ message: 'Mot de passe incorrect.' });
  }

  try {
    if (req.method === 'GET') {
      const [status, reservations] = await Promise.all([navette.getStatus(), navette.list()]);
      return res.status(200).json({ status, reservations });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ message: 'Méthode non autorisée.' });
    }

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || typeof body !== 'object') return res.status(400).json({ message: 'Requête invalide.' });

    if (body.action === 'capacite') {
      const r = await navette.setCapacity(body.valeur);
      if (!r.ok) return res.status(422).json({ message: r.message });
      return res.status(200).json({ message: `Capacité enregistrée : ${r.status.capacite} places.`, status: r.status });
    }
    if (body.action === 'annuler') {
      const done = await navette.cancel(String(body.id || ''));
      if (!done) return res.status(404).json({ message: 'Réservation introuvable (déjà annulée ?).' });
      return res.status(200).json({ message: 'Réservation annulée, ses places sont de nouveau disponibles.', status: await navette.getStatus() });
    }
    if (body.action === 'effacer') {
      const status = await navette.purge();
      return res.status(200).json({ message: 'Toutes les réservations ont été effacées.', status });
    }
    return res.status(400).json({ message: 'Action inconnue.' });
  } catch (err) {
    console.error('[navette-admin]', err.message);
    return res.status(502).json({ message: 'La base de données ne répond pas. Réessayez dans un instant.' });
  }
};
