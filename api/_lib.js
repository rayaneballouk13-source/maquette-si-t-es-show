/* =========================================================
   SI T'ES SHOW — logique commune des formulaires (serveur)
   Les fichiers commençant par « _ » ne sont pas exposés
   comme fonctions par Vercel.

   Variables d'environnement (Vercel → Settings → Environment Variables) :
     RESEND_API_KEY  clé API Resend (obligatoire pour l'envoi)
     CONTACT_TO      adresse qui reçoit les formulaires
     MAIL_FROM       expéditeur vérifié dans Resend
                     (par défaut : SI T'ES SHOW <onboarding@resend.dev>)
   Aucune donnée n'est stockée : chaque envoi part uniquement par e-mail.
   ========================================================= */

// Lit une variable en acceptant aussi son nom en minuscules (saisie Vercel)
const env = (name) => process.env[name] || process.env[name.toLowerCase()] || '';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+()\d\s.-]{6,25}$/;
const URL_RE = /^https?:\/\/[^\s<>"]+\.[^\s<>"]+$/i;

/* Limitation simple du nombre d'envois par IP (par instance) */
const hits = new Map();
function rateLimited(ip, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Valide les données reçues selon le schéma du formulaire */
function validate(schema, body) {
  const errors = {};
  const clean = {};
  for (const f of schema.fields) {
    let v = body[f.name];
    if (f.type === 'checkbox') {
      v = v === true || v === 'on' || v === 'true';
      if (f.required && !v) errors[f.name] = 'Cette case doit être cochée pour continuer.';
      clean[f.name] = v;
      continue;
    }
    v = typeof v === 'string' ? v.trim() : '';
    if (!v) {
      if (f.required) errors[f.name] = f.options ? 'Choisissez une option.' : 'Ce champ est obligatoire.';
      clean[f.name] = '';
      continue;
    }
    if (f.max && v.length > f.max) errors[f.name] = `Maximum ${f.max} caractères.`;
    else if (f.min && v.length < f.min) errors[f.name] = `Écrivez au moins ${f.min} caractères.`;
    else if (f.type === 'email' && !EMAIL_RE.test(v)) errors[f.name] = 'Adresse e-mail invalide.';
    else if (f.type === 'tel' && !PHONE_RE.test(v)) errors[f.name] = 'Numéro de téléphone invalide.';
    else if (f.type === 'url' && !URL_RE.test(v)) errors[f.name] = 'Lien invalide : il doit commencer par https://';
    else if (f.options && !f.options.includes(v)) errors[f.name] = 'Option invalide.';
    clean[f.name] = v;
  }
  if (typeof schema.check === 'function') schema.check(clean, errors);
  return { errors, clean };
}

function renderEmail(schema, clean) {
  const rows = schema.fields
    .filter((f) => f.type !== 'checkbox' || clean[f.name])
    .map((f) => {
      const raw = f.type === 'checkbox' ? 'Oui' : clean[f.name] || '—';
      const value = escapeHtml(raw).replace(/\n/g, '<br>');
      return `<tr><th align="left" valign="top" style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;font-weight:600;width:38%">${escapeHtml(f.label)}</th><td style="padding:8px 12px;border-bottom:1px solid #eee">${value}</td></tr>`;
    }).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#141110;max-width:640px">
    <h2 style="margin:0 0 4px;color:#c4161c">${escapeHtml(schema.title)}</h2>
    <p style="margin:0 0 16px;color:#666">Reçu depuis le site SI T'ES SHOW. Répondez directement à cet e-mail pour écrire à la personne.</p>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table></div>`;
  const text = schema.fields
    .filter((f) => f.type !== 'checkbox' || clean[f.name])
    .map((f) => `${f.label} : ${f.type === 'checkbox' ? 'Oui' : clean[f.name] || '—'}`).join('\n');
  return { html, text };
}

async function sendEmail({ subject, html, text, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env('MAIL_FROM') || "SI T'ES SHOW <onboarding@resend.dev>",
      to: env('CONTACT_TO').split(',').map((s) => s.trim()).filter(Boolean),
      reply_to: replyTo,
      subject,
      html,
      text
    })
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/* Fabrique le gestionnaire Vercel pour un formulaire */
function createHandler(schema) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ message: 'Méthode non autorisée.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ message: 'Requête invalide.' });
    }

    // Anti-spam 1 : champ piège rempli → on fait semblant d'accepter
    if (body.site_web) return res.status(200).json({ message: schema.success });
    // Anti-spam 2 : formulaire envoyé trop vite pour un humain
    if (typeof body._elapsed !== 'number' || body._elapsed < 3000) {
      return res.status(400).json({ message: "L'envoi a été bloqué par la protection anti-spam. Patientez quelques secondes puis réessayez." });
    }
    // Anti-spam 3 : trop d'envois depuis la même adresse
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
    if (rateLimited(ip)) {
      return res.status(429).json({ message: 'Trop de messages envoyés en peu de temps. Réessayez dans quelques minutes.' });
    }

    const { errors, clean } = validate(schema, body);
    if (Object.keys(errors).length) {
      return res.status(422).json({ message: 'Certains champs sont à corriger.', errors });
    }

    if (!env('RESEND_API_KEY') || !env('CONTACT_TO')) {
      console.error('[formulaire] RESEND_API_KEY ou CONTACT_TO manquant');
      return res.status(503).json({ message: "Le formulaire n'est pas encore activé. Contactez-nous en attendant via notre page Facebook." });
    }

    try {
      const { html, text } = renderEmail(schema, clean);
      await sendEmail({
        subject: schema.subject(clean),
        html,
        text,
        replyTo: clean.email
      });
      return res.status(200).json({ message: schema.success });
    } catch (err) {
      console.error('[formulaire]', err.message);
      return res.status(502).json({ message: "L'envoi n'a pas abouti. Réessayez dans quelques minutes ou écrivez-nous via Facebook." });
    }
  };
}

module.exports = { createHandler, validate, rateLimited, escapeHtml, renderEmail, sendEmail, env };
