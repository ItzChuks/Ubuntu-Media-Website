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
document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
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
