const body = document.body;

const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

const loadingScreen = document.getElementById('loadingScreen');
const loadingBar = document.getElementById('loadingBar');
const loadingPercent = document.getElementById('loadingPercent');
const loadingStatus = document.getElementById('loadingStatus');

const holoCard = document.getElementById('holoCard');
const holoShine = document.getElementById('holoShine');
const holoGlare = document.getElementById('holoGlare');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loadingSteps = [
  { limit: 24, label: 'Initialisation de l interface' },
  { limit: 52, label: 'Chargement des sections' },
  { limit: 78, label: 'Activation des animations' },
  { limit: 96, label: 'Finalisation du portfolio' }
];

let loadingValue = 0;
let loadingDone = false;

function updateLoadingUI(value) {
  if (!loadingBar || !loadingPercent || !loadingStatus) return;

  const safeValue = Math.max(0, Math.min(100, value));
  const currentStep =
    loadingSteps.find(step => safeValue <= step.limit) || loadingSteps[loadingSteps.length - 1];

  loadingBar.style.width = `${safeValue}%`;
  loadingPercent.textContent = `${safeValue}%`;
  loadingStatus.textContent = currentStep.label;
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
    if (loadingDone) {
      window.clearInterval(timer);
      return;
    }

    loadingValue = Math.min(loadingValue + Math.floor(Math.random() * 9) + 4, 94);
    updateLoadingUI(loadingValue);
  }, 120);

  window.addEventListener(
    'load',
    () => {
      window.clearInterval(timer);
      loadingValue = 100;
      finishLoading();
    },
    { once: true }
  );
}

function setupNavbar() {
  if (!navbar) return;

  const syncNavbar = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };

  syncNavbar();
  window.addEventListener('scroll', syncNavbar, { passive: true });
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
  const autoRevealSelectors = [
    '.stat-item',
    '.tag',
    '.project-link',
    '.contact-item',
    '.timeline-item',
    '.goal-highlight'
  ];

  autoRevealSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.classList.contains('fade-up') || element.classList.contains('reveal')) return;
      element.classList.add('reveal');
      element.style.transitionDelay = `${Math.min(index * 0.06, 0.24)}s`;
    });
  });

  const animatedElements = document.querySelectorAll('.fade-up, .reveal');

  if (prefersReducedMotion) {
    animatedElements.forEach(element => element.classList.add('visible'));
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

  animatedElements.forEach(element => observer.observe(element));
}

function setupHolographicCard() {
  if (!holoCard || !holoShine || !holoGlare || prefersReducedMotion) return;

  holoCard.addEventListener('mousemove', event => {
    const rect = holoCard.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -18;
    const rotateY = (x - 0.5) * 18;

    holoCard.style.transform =
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;

    const angle = Math.round(x * 360);
    holoShine.style.background = `conic-gradient(
      from ${angle}deg at ${x * 100}% ${y * 100}%,
      rgba(255,0,128,0) 0deg,
      rgba(255,100,0,0.2) 42deg,
      rgba(255,220,0,0.18) 82deg,
      rgba(0,255,150,0.18) 145deg,
      rgba(0,150,255,0.18) 210deg,
      rgba(150,0,255,0.18) 270deg,
      rgba(255,0,200,0.18) 320deg,
      rgba(255,0,128,0) 360deg
    )`;

    holoGlare.style.background =
      `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.3) 0%, transparent 60%)`;
  });

  holoCard.addEventListener('mouseenter', () => holoCard.classList.add('is-hovered'));

  holoCard.addEventListener('mouseleave', () => {
    holoCard.classList.remove('is-hovered');
    holoCard.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  });
}

function setupActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        navLinks.forEach(link => {
          link.style.color = '';
          link.style.background = '';
        });

        const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (!activeLink) return;

        activeLink.style.color = '#fff';
        activeLink.style.background = 'transparent';
      });
    },
    { threshold: 0.42 }
  );

  sections.forEach(section => observer.observe(section));
}

setupNavbar();
setupMenu();
setupScrollAnimations();
setupHolographicCard();
setupActiveNav();
startLoadingIntro();

if (document.readyState === 'complete') {
  finishLoading();
}
