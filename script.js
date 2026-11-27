/* SI T'ES SHOW — interactions du site (sans dépendance) */
(() => {
  const config = window.SITE_CONFIG || {};
  const liens = config.liens || {};

  /* ---------- Menu mobile ---------- */
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');

  const setMenu = (open) => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    nav.classList.toggle('is-open', open);
  };

  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (nav?.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
  });

  /* ---------- Liens configurables (billetterie, Facebook) ---------- */
  document.querySelectorAll('[data-config-href]').forEach((el) => {
    const url = liens[el.dataset.configHref];
    if (url) {
      el.href = url;
    } else {
      // Lien absent : on désactive proprement plutôt que d'inventer une destination
      el.removeAttribute('href');
      el.removeAttribute('target');
      el.setAttribute('aria-disabled', 'true');
      if (el.classList.contains('button')) el.insertAdjacentHTML('beforeend', '<span class="sr-only"> — bientôt disponible</span>');
    }
  });

  /* ---------- Sections alimentées par config.js ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const chiffres = (config.chiffres || []).filter((c) => c && String(c.valeur).trim());
  const statsList = document.querySelector('[data-stats]');
  if (statsList && chiffres.length >= 3) {
    statsList.innerHTML = chiffres.map((c) =>
      `<li><span class="stat-value">${esc(c.valeur)}</span><span class="stat-label">${esc(c.libelle)}</span></li>`).join('');
    statsList.closest('section').hidden = false;
  }

  const galerie = (config.galerie || []).filter((g) => g && g.src);
  const galleryGrid = document.querySelector('[data-gallery]');
  if (galleryGrid && galerie.length) {
    const cls = { large: 'is-wide', haute: 'is-tall' };
    galleryGrid.innerHTML = galerie.map((g) =>
      `<figure class="${cls[g.format] || ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async">${g.legende ? `<figcaption>${esc(g.legende)}</figcaption>` : ''}</figure>`).join('');
    galleryGrid.closest('section').hidden = false;
  }

  const temoignages = (config.temoignages || []).filter((t) => t && t.citation && t.auteur);
  const quotesList = document.querySelector('[data-quotes]');
  if (quotesList && temoignages.length) {
    quotesList.innerHTML = temoignages.map((t) =>
      `<li><figure class="quote"><blockquote><p>${esc(t.citation)}</p></blockquote><figcaption><strong>${esc(t.auteur)}</strong>${t.role ? `, ${esc(t.role)}` : ''}</figcaption></figure></li>`).join('');
    quotesList.closest('section').hidden = false;
  }

  /* ---------- Carrousel des partenaires ---------- */
  // Copie les logos (masqués aux lecteurs d'écran) pour une boucle continue,
  // même sur très grand écran. Sans mouvement réduit, le CSS anime la piste.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) document.querySelectorAll('[data-marquee]').forEach((marquee) => {
    const track = marquee.querySelector('.partner-track');
    const originals = [...track.children];
    const cloneSet = () => originals.forEach((li) => {
      const copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('img').forEach((img) => { img.alt = ''; });
      track.appendChild(copy);
    });
    // Une « moitié » doit couvrir au moins la largeur visible
    let sets = 1;
    while (track.scrollWidth < marquee.clientWidth && sets < 6) { cloneSet(); sets += 1; }
    const half = [...track.children];
    half.forEach((li) => {
      const copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('img').forEach((img) => { img.alt = ''; });
      track.appendChild(copy);
    });
    // Vitesse constante (~40 px/s), quelle que soit la largeur
    marquee.style.setProperty('--marquee-duration', `${Math.round(track.scrollWidth / 2 / 40)}s`);
    marquee.classList.add('is-running');
  });

  /* ---------- « En savoir plus » sur l'association ---------- */
  const aboutBtn = document.querySelector('[data-toggle-about]');
  const aboutMore = document.getElementById('about-more');
  aboutBtn?.addEventListener('click', () => {
    const open = aboutBtn.getAttribute('aria-expanded') !== 'true';
    aboutBtn.setAttribute('aria-expanded', String(open));
    aboutMore.hidden = !open;
    aboutBtn.querySelector('[data-label]').textContent = open ? 'Réduire' : 'En savoir plus';
  });

  /* ---------- Rejoindre l'aventure : pré-remplit l'objet du contact ---------- */
  document.querySelectorAll('[data-subject]').forEach((a) => {
    a.addEventListener('click', () => {
      const select = document.getElementById('c-objet');
      if (select) select.value = a.dataset.subject;
    });
  });

  /* ---------- Année du copyright ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Apparition discrète des titres ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Formulaires ---------- */
  const messages = {
    valueMissing: (el) => (el.type === 'checkbox' ? 'Cette case doit être cochée pour continuer.'
      : el.tagName === 'SELECT' ? 'Choisissez une option.' : 'Ce champ est obligatoire.'),
    typeMismatch: (el) => (el.type === 'email' ? 'Entrez une adresse e-mail valide, par exemple nom@exemple.fr.'
      : el.type === 'url' ? 'Entrez un lien complet, commençant par https://' : 'Format invalide.'),
    tooShort: (el) => `Écrivez au moins ${el.minLength} caractères.`,
    tooLong: (el) => `Maximum ${el.maxLength} caractères.`,
    patternMismatch: (el) => el.dataset.patternMessage || 'Format invalide.'
  };

  const errorFor = (el) => {
    if (el.validity.valid) return '';
    for (const key of Object.keys(messages)) if (el.validity[key]) return messages[key](el);
    return 'Valeur invalide.';
  };

  const showError = (el, text) => {
    const box = document.getElementById(el.getAttribute('aria-describedby')?.split(' ').find((id) => id.endsWith('-err')));
    if (box) box.textContent = text;
    if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  };

  // Champs obligatoires sous condition, ex. data-required-when="age=Moins de 18 ans"
  document.querySelectorAll('[data-required-when]').forEach((el) => {
    const [name, expected] = el.dataset.requiredWhen.split('=');
    const source = el.form?.elements[name];
    if (!source) return;
    const label = el.form.querySelector(`label[for="${el.id}"] .optional`);
    const sync = () => {
      const on = source.value === expected;
      el.required = on;
      if (label) label.hidden = on;
      if (!on) showError(el, '');
    };
    source.addEventListener('change', sync);
    sync();
  });

  document.querySelectorAll('form[data-form]').forEach((form) => {
    const startedAt = Date.now();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const fields = [...form.querySelectorAll('input, select, textarea')].filter((el) => el.name && el.name !== 'site_web');

    // Affiche une erreur dès qu'on quitte un champ, et l'efface pendant la correction
    fields.forEach((el) => {
      el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') showError(el, errorFor(el)); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid')) showError(el, errorFor(el)); });
      el.addEventListener('change', () => { if (el.getAttribute('aria-invalid')) showError(el, errorFor(el)); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';

      let firstInvalid = null;
      fields.forEach((el) => {
        const msg = errorFor(el);
        showError(el, msg);
        if (msg && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const data = {};
      new FormData(form).forEach((value, key) => {
        data[key] = typeof value === 'string' ? value.trim() : value;
      });
      form.querySelectorAll('input[type="checkbox"]').forEach((cb) => { data[cb.name] = cb.checked; });
      data._elapsed = Date.now() - startedAt;

      submit.setAttribute('aria-busy', 'true');
      submit.disabled = true;

      try {
        const res = await fetch(form.getAttribute('action'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const body = await res.json().catch(() => ({}));

        if (res.ok) {
          form.classList.add('is-done');
          status.classList.add('is-success');
          status.textContent = body.message || 'Merci, votre envoi a bien été reçu.';
          status.setAttribute('tabindex', '-1');
          status.focus();
          return;
        }

        if (body.errors) {
          Object.entries(body.errors).forEach(([name, msg]) => {
            const el = form.elements[name];
            if (el) showError(el, msg);
          });
        }
        status.classList.add('is-error');
        status.textContent = body.message || "L'envoi n'a pas abouti. Vérifiez les champs signalés puis réessayez.";
      } catch {
        status.classList.add('is-error');
        status.textContent = "L'envoi n'a pas abouti : vérifiez votre connexion Internet puis réessayez.";
      } finally {
        submit.removeAttribute('aria-busy');
        submit.disabled = false;
      }
    });
  });

  /* ---------- Réservation de la Navette du rire ---------- */
  const dialog = document.getElementById('navette-dialog');
  const bookingForm = dialog?.querySelector('form[data-booking]');
  if (dialog && bookingForm) {
    const openers = document.querySelectorAll('[data-open-navette]');
    const seatsLine = document.querySelector('[data-seats-line]');
    const meter = dialog.querySelector('[data-seat-meter]');
    const placesInput = bookingForm.elements.places;
    const stepButtons = bookingForm.querySelectorAll('[data-step]');
    const status = bookingForm.querySelector('.form-status');
    const submit = bookingForm.querySelector('button[type="submit"]');
    const fields = [...bookingForm.querySelectorAll('input, select')].filter((el) => el.name && el.name !== 'site_web');
    let state = null;       // { capacite, reservees, restantes, complet, maxParReservation }
    let openedAt = 0;
    let bookingId = '';
    let lastOpener = null;

    const newId = () => (crypto.randomUUID ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
    const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
    const maxAllowed = () => (state ? Math.max(0, Math.min(state.maxParReservation || 10, state.restantes)) : 10);

    const syncStepper = () => {
      const max = maxAllowed();
      let n = parseInt(placesInput.value, 10);
      if (!Number.isFinite(n)) n = 1;
      n = Math.min(Math.max(n, 1), Math.max(max, 1));
      placesInput.value = n;
      placesInput.max = Math.max(max, 1);
      stepButtons[0].disabled = n <= 1;
      stepButtons[1].disabled = n >= max;
      dialog.querySelector('[data-max-places]').textContent = Math.max(max, 1);
    };

    const render = () => {
      if (!state) return;
      const { capacite, restantes, complet } = state;
      // Carte de l'affiche
      if (seatsLine) {
        seatsLine.hidden = false;
        seatsLine.textContent = complet ? 'Complet : plus aucune place disponible.' : `${plural(restantes, 'place')} disponible${restantes > 1 ? 's' : ''} sur ${capacite}`;
        seatsLine.classList.toggle('is-full', complet);
      }
      openers.forEach((el) => {
        const label = el.querySelector('[data-navette-label]');
        if (label) label.textContent = complet ? 'Complet' : 'Je réserve ma place';
        if (el.tagName === 'BUTTON') el.disabled = complet;
      });
      // Fenêtre de réservation
      meter.hidden = false;
      meter.querySelector('[data-seats-left]').textContent = restantes;
      meter.querySelector('[data-seats-text]').textContent = restantes > 1 ? 'places disponibles' : restantes === 1 ? 'place disponible' : 'place disponible : complet';
      meter.querySelector('[data-seats-total]').textContent = capacite;
      meter.querySelector('[data-seats-bar]').style.width = `${Math.min(100, ((capacite - restantes) / capacite) * 100)}%`;
      if (!bookingForm.classList.contains('is-done')) {
        submit.disabled = complet;
        bookingForm.querySelector('.form-fields').hidden = complet;
        if (complet) {
          status.className = 'form-status is-error';
          status.textContent = 'La navette est complète : toutes les places ont été réservées.';
        }
      }
      syncStepper();
    };

    const loadStatus = async () => {
      try {
        const res = await fetch('/api/navette', { headers: { Accept: 'application/json' }, cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || 'Réservations indisponibles.');
        state = body;
        render();
        return true;
      } catch (err) {
        state = null;
        if (seatsLine) seatsLine.hidden = true;
        meter.hidden = true;
        if (!bookingForm.classList.contains('is-done')) {
          status.className = 'form-status is-error';
          status.textContent = err.message;
          submit.disabled = true;
        }
        return false;
      }
    };

    const open = async (opener) => {
      lastOpener = opener;
      if (bookingForm.classList.contains('is-done')) {
        // Nouvelle réservation après une réservation réussie
        bookingForm.reset();
        bookingForm.classList.remove('is-done');
        fields.forEach((el) => showError(el, ''));
      }
      status.textContent = '';
      status.className = 'form-status';
      submit.disabled = false;
      bookingForm.querySelector('.form-fields').hidden = false;
      bookingId = newId();
      openedAt = Date.now();
      dialog.showModal();
      await loadStatus();
    };

    openers.forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); open(el); }));
    dialog.querySelector('[data-close-navette]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // clic sur le fond
    dialog.addEventListener('close', () => { (lastOpener?.tagName === 'BUTTON' ? lastOpener : openers[openers.length - 1])?.focus(); });

    stepButtons.forEach((btn) => btn.addEventListener('click', () => {
      placesInput.value = (parseInt(placesInput.value, 10) || 1) + Number(btn.dataset.step);
      syncStepper();
      showError(placesInput, '');
    }));
    placesInput.addEventListener('change', syncStepper);

    fields.forEach((el) => {
      el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') showError(el, errorFor(el)); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid')) showError(el, errorFor(el)); });
      el.addEventListener('change', () => { if (el.getAttribute('aria-invalid')) showError(el, errorFor(el)); });
    });

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';
      syncStepper();

      let firstInvalid = null;
      fields.forEach((el) => {
        let msg = errorFor(el);
        if (el === placesInput && (msg || parseInt(el.value, 10) > maxAllowed())) {
          msg = `Choisissez entre 1 et ${Math.max(maxAllowed(), 1)} places.`;
        }
        showError(el, msg);
        if (msg && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      const data = {};
      new FormData(bookingForm).forEach((value, key) => { data[key] = typeof value === 'string' ? value.trim() : value; });
      data.consentement = bookingForm.elements.consentement.checked;
      data.places = parseInt(data.places, 10);
      data._elapsed = Date.now() - openedAt;
      data._id = bookingId;

      submit.setAttribute('aria-busy', 'true');
      submit.disabled = true;
      try {
        const res = await fetch(bookingForm.getAttribute('action'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const body = await res.json().catch(() => ({}));
        if (body.status) { state = body.status; render(); }

        if (res.ok) {
          bookingForm.classList.add('is-done');
          status.className = 'form-status is-success';
          status.textContent = body.message || 'Votre réservation est enregistrée.';
          status.setAttribute('tabindex', '-1');
          status.focus();
          return;
        }
        if (body.errors) {
          Object.entries(body.errors).forEach(([name, msg]) => {
            const el = bookingForm.elements[name];
            if (el && msg) showError(el, msg);
          });
        }
        status.className = 'form-status is-error';
        status.textContent = body.message || "La réservation n'a pas abouti. Vérifiez les champs signalés puis réessayez.";
        // Après un refus (complet, trop de places…), un nouvel essai est un nouvel envoi
        if (res.status === 409 || res.status === 422) bookingId = newId();
      } catch {
        status.className = 'form-status is-error';
        status.textContent = "La réservation n'a pas abouti : vérifiez votre connexion Internet puis réessayez.";
      } finally {
        submit.removeAttribute('aria-busy');
        submit.disabled = Boolean(state?.complet) && !bookingForm.classList.contains('is-done');
      }
    });

    // Affiche les places restantes sur la carte dès le chargement
    loadStatus();
  }
})();
