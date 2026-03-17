/* ═══════════════════════════════════════════════
   ANIMATIONS — Scroll reveal + Typing effect
   ═══════════════════════════════════════════════ */

/* ─── Scroll-triggered reveal ─── */
function setupScrollAnimations() {
  /* Auto-add .reveal to elements that don't have fade-up */
  const autoRevealSelectors = [
    '.stat-item',
    '.tag',
    '.project-link',
    '.contact-item',
    '.timeline-item',
    '.goal-highlight'
  ];

  autoRevealSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, index) => {
      if (el.classList.contains('fade-up') || el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      el.style.transitionDelay = `${Math.min(index * 0.06, 0.24)}s`;
    });
  });

  const animatedElements = document.querySelectorAll('.fade-up, .reveal');

  /* Skip animations if user prefers reduced motion */
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

/* ─── Typing reveal for description text ─── */
function setupTypingReveal() {
  const selectors = [
    '.skill-desc',
    '.project-desc',
    '.timeline-desc',
    '.goal-desc',
    '.app-desc',
    '.contact-card > p'
  ];

  const typingElements = document.querySelectorAll(selectors.join(', '));
  if (!typingElements.length) return;

  if (prefersReducedMotion) {
    typingElements.forEach(el => el.classList.add('type-complete'));
    return;
  }

  /* Animate text character by character */
  function typeElement(el) {
    if (el.dataset.typeDone === 'true') return;

    const source    = el.dataset.typeSource || '';
    const totalChars = source.length;
    const stepSize  = totalChars > 180 ? 3 : totalChars > 110 ? 2 : 1;
    const delay     = totalChars > 180 ? 10 : totalChars > 110 ? 14 : 18;
    let index = 0;

    el.dataset.typeDone = 'true';
    el.classList.add('type-writing');
    el.textContent = '';

    function tick() {
      index = Math.min(index + stepSize, totalChars);
      el.textContent = source.slice(0, index);

      if (index < totalChars) {
        window.setTimeout(tick, delay);
      } else {
        el.classList.remove('type-writing');
        el.classList.add('type-complete');
        el.style.minHeight = '';
      }
    }

    tick();
  }

  /* Stash original text and reserve height */
  typingElements.forEach(el => {
    const source = el.textContent.replace(/\s+/g, ' ').trim();
    if (!source) return;

    el.dataset.typeSource = source;
    el.dataset.typeDone   = 'false';

    const height = el.getBoundingClientRect().height;
    if (height > 0) el.style.minHeight = `${height}px`;

    el.textContent = '';
  });

  /* Trigger on intersection */
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        typeElement(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.3, rootMargin: '0px 0px -12% 0px' }
  );

  typingElements.forEach(el => observer.observe(el));
}
