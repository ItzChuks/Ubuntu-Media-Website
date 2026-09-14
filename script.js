// reel progress bar
const progress = document.getElementById('reel-progress');
function updateProgress(){
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  if(progress) progress.style.width = (isFinite(scrolled) ? scrolled : 0) + '%';
}
document.addEventListener('scroll', updateProgress, { passive:true });
updateProgress();

// nav background on scroll
const nav = document.getElementById('siteNav');
function toggleNav(){
  if(!nav) return;
  if(window.scrollY > 40){ nav.classList.add('scrolled'); }
  else{ nav.classList.remove('scrolled'); }
}
document.addEventListener('scroll', toggleNav, { passive:true });
toggleNav();

// active nav link, based on body[data-page]
const currentPage = document.body.getAttribute('data-page');
document.querySelectorAll('.nav-links a[data-page], .mobile-links a[data-page]').forEach(a => {
  if(a.getAttribute('data-page') === currentPage){ a.classList.add('active'); }
});

// cursor glow in hero / cta sections
function attachGlow(sectionId, glowId){
  const section = document.getElementById(sectionId);
  const glow = document.getElementById(glowId);
  if(!section || !glow) return;
  section.addEventListener('mousemove', (e) => {
    const r = section.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    glow.style.setProperty('--gx', x + '%');
    glow.style.setProperty('--gy', y + '%');
  });
}
attachGlow('hero','heroGlow');
attachGlow('contact','ctaGlow');

// mobile menu toggle
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');
if(navToggle && mobileMenu){
  const closeMenu = () => {
    mobileMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open');
  };
  const openMenu = () => {
    mobileMenu.classList.add('open');
    navToggle.setAttribute('aria-expanded','true');
    document.body.classList.add('menu-open');
  };
  navToggle.addEventListener('click', () => {
    if(mobileMenu.classList.contains('open')){ closeMenu(); } else { openMenu(); }
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if(window.innerWidth > 860) closeMenu(); });
}

// generic loading feedback for primary call-to-action buttons/links —
// gives immediate visual response while the browser navigates or opens
// a mailto/external link. Admin dashboard buttons handle their own
// loading state (see ui.js / admin.js) and aren't touched here.
document.querySelectorAll('a.btn, a.nav-cta, a.mobile-cta').forEach((a) => {
  a.addEventListener('click', () => {
    if(a.classList.contains('is-loading')) return;
    a.classList.add('is-loading');
    const href = a.getAttribute('href') || '';
    if(href.startsWith('mailto:') || href.startsWith('tel:') || a.target === '_blank'){
      setTimeout(() => a.classList.remove('is-loading'), 1400);
    }
    // for a normal same-site navigation the class simply disappears
    // with the page on unload — no timer needed.
  });
});
