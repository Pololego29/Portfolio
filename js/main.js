const body = document.body;

const navbar      = document.getElementById('navbar');
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');

const loadingScreen  = document.getElementById('loadingScreen');
const loadingBar     = document.getElementById('loadingBar');
const loadingPercent = document.getElementById('loadingPercent');
const loadingStatus  = document.getElementById('loadingStatus');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loadingSteps = [
  { limit: 24, label: 'Initialisation de l interface' },
  { limit: 52, label: 'Chargement des sections' },
  { limit: 78, label: 'Activation des animations' },
  { limit: 96, label: 'Finalisation du portfolio' }
];

let loadingValue = 0;
let loadingDone  = false;

function updateLoadingUI(value) {
  if (!loadingBar || !loadingPercent || !loadingStatus) return;
  const safeValue = Math.max(0, Math.min(100, value));
  const currentStep =
    loadingSteps.find(step => safeValue <= step.limit) || loadingSteps[loadingSteps.length - 1];
  loadingBar.style.width   = `${safeValue}%`;
  loadingPercent.textContent = `${safeValue}%`;
  loadingStatus.textContent  = currentStep.label;
}

function finishLoading() {
  if (loadingDone) return;
  loadingDone = true;
  updateLoadingUI(100);
  if (loadingStatus) loadingStatus.textContent = 'Portfolio pret';

  window.setTimeout(() => {
    if (loadingScreen) loadingScreen.classList.add('is-hidden');
    body.classList.remove('is-loading');
    body.classList.add('site-ready');
  }, prefersReducedMotion ? 120 : 420);

  window.setTimeout(() => {
    if (loadingScreen) loadingScreen.setAttribute('aria-hidden', 'true');
  }, 1100);
}

function startLoadingIntro() {
  if (!loadingScreen || prefersReducedMotion) {
    finishLoading();
    return;
  }
  const timer = window.setInterval(() => {
    if (loadingDone) { window.clearInterval(timer); return; }
    loadingValue = Math.min(loadingValue + Math.floor(Math.random() * 9) + 4, 94);
    updateLoadingUI(loadingValue);
  }, 120);

  window.addEventListener('load', () => {
    window.clearInterval(timer);
    loadingValue = 100;
    finishLoading();
  }, { once: true });
}

function setupMenu() {
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });
}

function setupScrollAnimations() {
  const autoRevealSelectors = ['.tl-item', '.goal-tag', '.contact-link-item', '.app-card'];

  autoRevealSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.classList.contains('fade-up') || element.classList.contains('reveal')) return;
      element.classList.add('reveal');
      element.style.transitionDelay = `${Math.min(index * 0.06, 0.24)}s`;
    });
  });

  const animatedElements = document.querySelectorAll('.fade-up, .reveal');

  if (prefersReducedMotion) {
    animatedElements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
  );

  animatedElements.forEach(el => observer.observe(el));
}

function setupActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-links a');
  if (!sections.length || !navLinks.length) return;

  // Use IntersectionObserver to track which section is most visible
  let ticking = false;

  const updateActive = () => {
    const sectionIds = ['hero', 'about', 'projects', 'skills', 'contact',
                        'parcours', 'objectifs', 'apps'];
    for (let i = sectionIds.length - 1; i >= 0; i--) {
      const el = document.getElementById(sectionIds[i]);
      if (el && el.getBoundingClientRect().top <= 180) {
        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-links a[href="#${sectionIds[i]}"]`);
        if (activeLink) activeLink.classList.add('active');
        break;
      }
    }
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateActive(); ticking = false; });
  }, { passive: true });

  updateActive();
}

// Smooth scroll for navbar links
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      // Close mobile menu if open
      if (hamburger) hamburger.classList.remove('open');
      if (mobileMenu) mobileMenu.classList.remove('open');
    });
  });
}

// Init
setupMenu();
setupScrollAnimations();
setupActiveNav();
setupSmoothScroll();
startLoadingIntro();

if (document.readyState === 'complete') {
  finishLoading();
}
