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
})();
