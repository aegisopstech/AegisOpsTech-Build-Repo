document.getElementById('year').textContent = new Date().getFullYear();

// header: solid after scroll
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('solid', window.scrollY > 12);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// mobile menu
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }
});

// solution tabs
const tabs = document.querySelectorAll('.tabs button');
tabs.forEach((btn) =>
  btn.addEventListener('click', () => {
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.id !== 'tab-' + btn.dataset.tab));
  })
);

// scroll reveal
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 })
  : null;
document.querySelectorAll('.card, .uc, .layer, .head, .steps li').forEach((el) => {
  el.classList.add('reveal');
  io ? io.observe(el) : el.classList.add('in');
});

// agent log: reveal lines one by one when in view
const term = document.getElementById('term');
const lines = [...document.querySelectorAll('#term-body [data-l]')];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce || !io) {
  lines.forEach((l) => l.classList.add('show'));
} else {
  const termObs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    termObs.disconnect();
    lines.forEach((l, i) => setTimeout(() => l.classList.add('show'), i * 650));
  }, { threshold: 0.35 });
  termObs.observe(term);
}

// contact form
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button');
  const data = Object.fromEntries(new FormData(form));

  if (!data.name || !data.email || !data.message) {
    statusEl.className = 'err';
    statusEl.textContent = 'Please fill in your name, email and message.';
    return;
  }

  btn.disabled = true;
  statusEl.className = '';
  statusEl.textContent = 'Sending...';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Something went wrong.');
    form.reset();
    statusEl.className = 'ok';
    statusEl.textContent = 'Thanks. Your message has been sent and we will be in touch.';
  } catch (err) {
    statusEl.className = 'err';
    statusEl.textContent = err.message || 'Could not send. Please try again.';
  } finally {
    btn.disabled = false;
  }
});
