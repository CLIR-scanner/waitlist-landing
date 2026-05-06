const BE_URL = 'https://focused-imagination-production-49c9.up.railway.app';
const COHORTS = ['us-allergy', 'us-ka', 'us-veg'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COHORT_LABELS = {
  'us-allergy': 'Allergy family',
  'us-ka':      'Korean American',
  'us-veg':     'Vegan / vegetarian',
};

// DOM refs
const form           = document.getElementById('waitlist-form');
const formSection    = document.getElementById('form-section');
const successSection = document.getElementById('success-section');
const submitBtn      = document.getElementById('submit-btn');
const emailInput     = document.getElementById('f-email');
const emailErr       = document.getElementById('f-email-err');
const cohortErr      = document.getElementById('f-cohort-err');
const sourceInput    = document.getElementById('f-source');
const sourceErr      = document.getElementById('f-source-err');
const formErr        = document.getElementById('f-form-err');
const submitLabel    = document.getElementById('submit-label');
const formErrText    = document.getElementById('f-form-err-text');
const gotItBtn       = document.getElementById('got-it-btn');
const successTitle       = document.getElementById('success-title');
const successSubtitle    = document.getElementById('success-subtitle');
const successCohortWrap  = document.getElementById('success-cohort-wrap');
const successCohortLabel = document.getElementById('success-cohort');

function getLocale() {
  const lang = (navigator.language || 'en').split('-')[0];
  return ['en', 'ko', 'zh', 'ja', 'es', 'fr'].includes(lang) ? lang : 'en';
}

function validate(email, cohorts, source) {
  const errors = {};
  if (!email || email.length > 254 || !EMAIL_RE.test(email))
    errors.email = 'Please enter a valid email.';
  if (cohorts.length === 0)
    errors.cohort = 'Please choose at least one cohort.';
  if (source.length > 64)
    errors.source = 'Source is too long (max 64 characters).';
  return errors;
}

function clearErrors() {
  emailErr.textContent = '';
  emailErr.hidden = true;
  emailInput.setAttribute('aria-invalid', 'false');
  cohortErr.textContent = '';
  cohortErr.hidden = true;
  sourceErr.textContent = '';
  sourceErr.hidden = true;
  sourceInput.removeAttribute('aria-invalid');
  formErrText.textContent = '';
  formErr.hidden = true;
}

function showFieldErrors(errors) {
  if (errors.email) {
    emailErr.textContent = errors.email;
    emailErr.hidden = false;
    emailInput.setAttribute('aria-invalid', 'true');
  }
  if (errors.cohort) {
    cohortErr.textContent = errors.cohort;
    cohortErr.hidden = false;
  }
  if (errors.source) {
    sourceErr.textContent = errors.source;
    sourceErr.hidden = false;
    sourceInput.setAttribute('aria-invalid', 'true');
  }
}

function syncRadioCards() {
  document.querySelectorAll('.radio-card').forEach(card => {
    const input = card.querySelector('input[type="checkbox"]');
    card.dataset.selected = input.checked ? 'true' : 'false';
  });
}

function setSubmitting(on) {
  if (on) {
    submitBtn.disabled = true;
    submitLabel.textContent = 'Submitting…';
    if (!document.getElementById('__btn-spinner')) {
      const sp = document.createElement('span');
      sp.className = 'spinner';
      sp.setAttribute('aria-hidden', 'true');
      sp.id = '__btn-spinner';
      submitBtn.prepend(sp);
    }
  } else {
    submitBtn.disabled = false;
    const sp = document.getElementById('__btn-spinner');
    if (sp) sp.remove();
    submitLabel.textContent = 'Join waitlist';
  }
  form.querySelectorAll('input').forEach(el => { el.disabled = on; });
}

function showSuccess(alreadyRegistered, cohorts) {
  if (alreadyRegistered) {
    successTitle.textContent    = "You’re already on our list.";
    successSubtitle.textContent = "We’ll be in touch soon.";
    successCohortWrap.hidden    = true;
  } else {
    successTitle.textContent    = "You’re on the list.";
    successSubtitle.textContent = "We’ll send your invite to your email within a few days.";
    successCohortLabel.textContent = cohorts.map(c => COHORT_LABELS[c] || c).join(' · ');
    successCohortWrap.hidden    = false;
  }
  formSection.hidden    = true;
  successSection.hidden = false;
}

function showGenericError() {
  formErrText.textContent ='Something went wrong. Please try again.';
  formErr.hidden = false;
}

// ── Event listeners ──

emailInput.addEventListener('input', () => {
  emailErr.textContent = '';
  emailErr.hidden = true;
  emailInput.setAttribute('aria-invalid', 'false');
  if (!formErr.hidden) formErr.hidden = true;
});

sourceInput.addEventListener('input', () => {
  sourceErr.textContent = '';
  sourceErr.hidden = true;
  sourceInput.removeAttribute('aria-invalid');
});

document.querySelectorAll('input[name="cohort"]').forEach(radio => {
  radio.addEventListener('change', () => {
    cohortErr.textContent = '';
    cohortErr.hidden = true;
    syncRadioCards();
  });
});

gotItBtn.addEventListener('click', () => {
  successSection.hidden = true;
  formSection.hidden    = false;
  form.reset();
  syncRadioCards();
  clearErrors();
  setSubmitting(false);
  emailInput.focus();
});

// ── Form submit ──

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email   = emailInput.value.trim().toLowerCase();
  const cohorts = [...form.querySelectorAll('input[name="cohort"]:checked')].map(el => el.value);
  const source  = sourceInput.value.trim();

  clearErrors();
  const errors = validate(email, cohorts, source);

  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    if (errors.email) emailInput.focus();
    else if (errors.cohort) form.querySelector('input[name="cohort"]')?.focus();
    else if (errors.source) sourceInput.focus();
    return;
  }

  setSubmitting(true);

  try {
    const body = { email, cohort: cohorts, locale: getLocale() };
    if (source) body.source = source;

    const r = await fetch(`${BE_URL}/waitlist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (r.status === 201) {
      showSuccess(false, cohorts);
    } else if (r.status === 200) {
      showSuccess(true, cohorts);
    } else if (r.status === 400) {
      setSubmitting(false);
      const data = await r.json().catch(() => ({}));
      formErrText.textContent =data?.message || 'Please check your input and try again.';
      formErr.hidden = false;
    } else if (r.status === 429) {
      setSubmitting(false);
      formErrText.textContent ='Too many requests. Please wait a minute and try again.';
      formErr.hidden = false;
    } else {
      setSubmitting(false);
      showGenericError();
    }
  } catch {
    setSubmitting(false);
    showGenericError();
  }
});
