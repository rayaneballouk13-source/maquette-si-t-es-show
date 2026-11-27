/* =========================================================
   SI T'ES SHOW — logique des réservations de la Navette du rire

   Capacité : 55 places par défaut (provisoire).
   Pour la changer : page admin-navette.html (recommandé),
   ou variable d'environnement NAVETTE_CAPACITE.

   Garantie anti-surréservation : le compteur de places est
   incrémenté de façon atomique par la base (INCRBY). Si le total
   dépasse la capacité, l'opération est annulée aussitôt : deux
   personnes qui réservent au même instant ne peuvent jamais
   dépasser la capacité. Une clé unique par envoi empêche aussi
   d'enregistrer deux fois la même réservation (double clic).
   ========================================================= */
const { redis, pipeline } = require('./_store');

const CAPACITE_PAR_DEFAUT = 55;
const MAX_PAR_RESERVATION = 10;
const CAPACITE_MAX = 500;
const ARRETS = ['Saint-Waast', 'Dutemple', 'Faubourg de Lille'];

const K = {
  capacite: 'navette:capacite',
  places: 'navette:places',
  reservations: 'navette:reservations',
  envoi: (id) => `navette:envoi:${id}`
};

const toInt = (v, fallback = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

function defaultCapacity() {
  const fromEnv = toInt(process.env.NAVETTE_CAPACITE, 0);
  return fromEnv > 0 ? fromEnv : CAPACITE_PAR_DEFAUT;
}

async function getStatus() {
  const [cap, places] = await pipeline([['GET', K.capacite], ['GET', K.places]]);
  const capacite = toInt(cap, 0) > 0 ? toInt(cap) : defaultCapacity();
  const reservees = Math.max(0, toInt(places));
  const restantes = Math.max(0, capacite - reservees);
  return { capacite, reservees, restantes, complet: restantes === 0, maxParReservation: MAX_PAR_RESERVATION };
}

/* Enregistre une réservation. Renvoie { ok, code?, status, reservation? } */
async function reserve(id, data) {
  const n = data.places;

  // 1. Un même envoi (double clic, nouvel essai réseau) ne compte qu'une fois
  const fresh = await redis('SET', K.envoi(id), '1', 'NX', 'EX', '86400');
  if (fresh !== 'OK') {
    const existing = await redis('HGET', K.reservations, id);
    return { ok: Boolean(existing), code: 'deja', status: await getStatus(), reservation: existing ? JSON.parse(existing) : null };
  }

  // 2. Réserve les places de façon atomique, puis vérifie la capacité
  const { capacite } = await getStatus();
  const total = toInt(await redis('INCRBY', K.places, n));
  if (total > capacite) {
    await pipeline([['DECRBY', K.places, n], ['DEL', K.envoi(id)]]);
    return { ok: false, code: 'complet', status: await getStatus() };
  }

  // 3. Enregistre le détail ; en cas d'échec, on libère les places
  const reservation = { id, ...data, creeLe: new Date().toISOString() };
  try {
    await redis('HSET', K.reservations, id, JSON.stringify(reservation));
  } catch (err) {
    await pipeline([['DECRBY', K.places, n], ['DEL', K.envoi(id)]]).catch(() => {});
    throw err;
  }
  return { ok: true, status: await getStatus(), reservation };
}

async function list() {
  const raw = await redis('HGETALL', K.reservations);
  const items = [];
  // Upstash renvoie HGETALL sous forme de liste [clé, valeur, clé, valeur…]
  if (Array.isArray(raw)) {
    for (let i = 1; i < raw.length; i += 2) {
      try { items.push(JSON.parse(raw[i])); } catch { /* ligne illisible ignorée */ }
    }
  } else if (raw && typeof raw === 'object') {
    for (const v of Object.values(raw)) {
      try { items.push(JSON.parse(v)); } catch { /* ignorée */ }
    }
  }
  return items.sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)));
}

/* Annule une réservation et libère ses places */
async function cancel(id) {
  const existing = await redis('HGET', K.reservations, id);
  if (!existing) return false;
  const removed = toInt(await redis('HDEL', K.reservations, id));
  if (removed !== 1) return false; // déjà annulée par un autre appel
  const places = toInt(JSON.parse(existing).places);
  if (places > 0) await redis('DECRBY', K.places, places);
  return true;
}

/* Change la capacité du bus (jamais en dessous des places déjà réservées) */
async function setCapacity(value) {
  const capacite = toInt(value, 0);
  if (capacite < 1 || capacite > CAPACITE_MAX) return { ok: false, message: `La capacité doit être comprise entre 1 et ${CAPACITE_MAX}.` };
  const { reservees } = await getStatus();
  if (capacite < reservees) return { ok: false, message: `${reservees} places sont déjà réservées : la capacité ne peut pas être inférieure.` };
  await redis('SET', K.capacite, capacite);
  return { ok: true, status: await getStatus() };
}

/* Efface toutes les réservations (après l'événement, pour le RGPD) */
async function purge() {
  const ids = (await list()).map((r) => r.id);
  await pipeline([['DEL', K.reservations], ['SET', K.places, '0'], ...ids.map((id) => ['DEL', K.envoi(id)])]);
  return getStatus();
}

module.exports = { getStatus, reserve, list, cancel, setCapacity, purge, ARRETS, MAX_PAR_RESERVATION };
