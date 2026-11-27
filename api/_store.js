/* =========================================================
   SI T'ES SHOW — base de données des réservations (Upstash Redis)
   Accès par l'API REST d'Upstash : aucune dépendance npm.

   Variables d'environnement, ajoutées automatiquement par Vercel
   quand on connecte une base Upstash Redis au projet (onglet Storage) :
     KV_REST_API_URL / KV_REST_API_TOKEN
     (ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
   ========================================================= */

const env = (name) => process.env[name] || process.env[name.toLowerCase()] || '';

function credentials() {
  const url = env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL');
  const token = env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN');
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

const isConfigured = () => Boolean(credentials());

async function call(path, body) {
  const creds = credentials();
  if (!creds) throw new Error('Base de données non configurée');
  const res = await fetch(creds.url + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`Base de données ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

/* Une commande : redis('GET', 'cle') → résultat */
async function redis(...command) {
  const data = await call('', command.map(String));
  if (data.error) throw new Error(`Base de données : ${data.error}`);
  return data.result;
}

/* Plusieurs commandes en un aller-retour : pipeline([['GET','a'], ['GET','b']]) → [ra, rb] */
async function pipeline(commands) {
  const data = await call('/pipeline', commands.map((c) => c.map(String)));
  return data.map((r) => {
    if (r.error) throw new Error(`Base de données : ${r.error}`);
    return r.result;
  });
}

module.exports = { redis, pipeline, isConfigured };
