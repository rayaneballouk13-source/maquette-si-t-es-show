/* SI T'ES SHOW — espace association : réservations de la Navette du rire */
(() => {
  const API = '/api/navette-admin';
  const KEY = 'navette-admin';
  const $ = (sel) => document.querySelector(sel);
  const login = $('[data-admin-login]');
  const panel = $('[data-admin-panel]');
  const status = $('[data-admin-status]');
  const rows = $('[data-admin-rows]');
  let password = '';
  let data = { status: null, reservations: [] };

  try { password = sessionStorage.getItem(KEY) || ''; } catch { /* stockage indisponible */ }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const numero = (id) => String(id).replace(/-/g, '').slice(0, 6).toUpperCase();
  const dateFr = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const say = (text, kind = 'success') => {
    status.className = `form-status ${text ? `is-${kind}` : ''}`;
    status.textContent = text || '';
  };

  async function api(method, body) {
    const res = await fetch(API, {
      method,
      headers: { Authorization: `Bearer ${password}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) logout('Mot de passe incorrect.');
    if (!res.ok) throw new Error(json.message || 'Erreur inattendue.');
    return json;
  }

  function render() {
    const { status: s, reservations } = data;
    $('[data-a="reservees"]').textContent = s.reservees;
    $('[data-a="restantes"]').textContent = s.restantes;
    $('[data-a="capacite"]').textContent = s.capacite;
    $('[data-a="nb"]').textContent = reservations.length;
    const cap = $('#a-cap');
    if (document.activeElement !== cap) cap.value = s.capacite;
    cap.min = Math.max(1, s.reservees);

    const parArret = {};
    reservations.forEach((r) => { parArret[r.arret] = (parArret[r.arret] || 0) + Number(r.places); });
    $('[data-admin-stops]').innerHTML = ['Saint-Waast', 'Dutemple', 'Faubourg de Lille']
      .map((a) => `<li><span>${esc(a)}</span><strong>${parArret[a] || 0} place${(parArret[a] || 0) > 1 ? 's' : ''}</strong></li>`).join('');

    rows.innerHTML = reservations.slice().reverse().map((r) => `
      <tr>
        <td>${esc(dateFr(r.creeLe))}</td>
        <td><code>${esc(numero(r.id))}</code></td>
        <td>${esc(r.prenom)} ${esc(r.nom)}</td>
        <td><strong>${esc(r.places)}</strong></td>
        <td>${esc(r.arret)}</td>
        <td><a href="tel:${esc(String(r.telephone).replace(/[^+\d]/g, ''))}">${esc(r.telephone)}</a></td>
        <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
        <td class="admin-cell-actions">
          <button class="admin-link" type="button" data-cancel="${esc(r.id)}">Annuler</button>
          <span class="admin-confirm" hidden>
            Annuler ${esc(r.places)} place${r.places > 1 ? 's' : ''} ?
            <button class="admin-link is-danger" type="button" data-cancel-yes="${esc(r.id)}">Oui, annuler</button>
            <button class="admin-link" type="button" data-cancel-no>Non</button>
          </span>
        </td>
      </tr>`).join('');
    $('[data-admin-empty]').hidden = reservations.length > 0;
  }

  async function refresh() {
    data = await api('GET');
    render();
  }

  function showPanel(on) {
    login.hidden = on;
    panel.hidden = !on;
  }

  function logout(message) {
    password = '';
    try { sessionStorage.removeItem(KEY); } catch { /* rien */ }
    showPanel(false);
    const err = $('#a-pass-err');
    err.textContent = message || '';
    $('#a-pass').toggleAttribute('aria-invalid', Boolean(message));
  }

  login.addEventListener('submit', async (e) => {
    e.preventDefault();
    password = login.elements.password.value;
    if (!password) { $('#a-pass-err').textContent = 'Entrez le mot de passe.'; return; }
    const btn = login.querySelector('button');
    btn.disabled = true;
    try {
      await refresh();
      try { sessionStorage.setItem(KEY, password); } catch { /* rien */ }
      login.reset();
      $('#a-pass-err').textContent = '';
      showPanel(true);
      say('');
    } catch (err) {
      if (password) $('#a-pass-err').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('[data-admin-capacity]').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', { action: 'capacite', valeur: Number($('#a-cap').value) });
      say(r.message);
      await refresh();
    } catch (err) { say(err.message, 'error'); }
  });

  rows.addEventListener('click', async (e) => {
    const cell = e.target.closest('td');
    if (e.target.matches('[data-cancel]')) {
      e.target.hidden = true;
      cell.querySelector('.admin-confirm').hidden = false;
      cell.querySelector('[data-cancel-yes]').focus();
    } else if (e.target.matches('[data-cancel-no]')) {
      cell.querySelector('.admin-confirm').hidden = true;
      cell.querySelector('[data-cancel]').hidden = false;
      cell.querySelector('[data-cancel]').focus();
    } else if (e.target.matches('[data-cancel-yes]')) {
      e.target.disabled = true;
      try {
        const r = await api('POST', { action: 'annuler', id: e.target.dataset.cancelYes });
        say(r.message);
        await refresh();
      } catch (err) { say(err.message, 'error'); e.target.disabled = false; }
    }
  });

  $('[data-admin-refresh]').addEventListener('click', async () => {
    try { await refresh(); say('Liste à jour.'); } catch (err) { say(err.message, 'error'); }
  });

  $('[data-admin-export]').addEventListener('click', () => {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Numéro', 'Prénom', 'Nom', 'Places', 'Point de ramassage', 'Téléphone', 'E-mail'];
    const lines = data.reservations.map((r) => [dateFr(r.creeLe), numero(r.id), r.prenom, r.nom, r.places, r.arret, r.telephone, r.email].map(cell).join(';'));
    const csv = '﻿' + [header.map(cell).join(';'), ...lines].join('\r\n'); // BOM : accents corrects dans Excel
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `reservations-navette-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('[data-admin-purge]').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (e.target.elements.confirmation.value.trim().toUpperCase() !== 'EFFACER') {
      say('Tapez EFFACER pour confirmer la suppression.', 'error');
      return;
    }
    try {
      const r = await api('POST', { action: 'effacer' });
      e.target.reset();
      say(r.message);
      await refresh();
    } catch (err) { say(err.message, 'error'); }
  });

  $('[data-admin-logout]').addEventListener('click', () => logout(''));

  // Reconnexion automatique pendant la session du navigateur
  if (password) {
    refresh().then(() => showPanel(true)).catch((err) => { if (password) logout(err.message); });
  }
})();
