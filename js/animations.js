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
    '.experience-desc',
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

/* ─── Timeline journey ─── */
function setupTimelineJourney() {
  const timeline = document.getElementById('journeyTimeline');
  if (!timeline) return;

  const items = Array.from(timeline.querySelectorAll('.timeline-item'));
  if (!items.length) return;

  let rafId = null;

  function getDotCenter(item) {
    const dot = item.querySelector('.timeline-dot');
    if (!dot) return 0;

    const timelineRect = timeline.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    return dotRect.top - timelineRect.top + dotRect.height / 2;
  }

  function updateJourney() {
    rafId = null;

    const centers = items.map(getDotCenter);
    if (!centers.length) return;

    const timelineRect = timeline.getBoundingClientRect();
    const focusLine = Math.min(window.innerHeight * 0.42, window.innerHeight - 120);
    const focusInTimeline = focusLine - timelineRect.top;

    let travelerY = centers[0];
    let activeIndex = 0;

    if (focusInTimeline <= centers[0]) {
      travelerY = centers[0];
      activeIndex = 0;
    } else if (focusInTimeline >= centers[centers.length - 1]) {
      travelerY = centers[centers.length - 1];
      activeIndex = centers.length - 1;
    } else {
      for (let i = 0; i < centers.length - 1; i += 1) {
        const start = centers[i];
        const end = centers[i + 1];
        if (focusInTimeline < start || focusInTimeline > end) continue;

        const t = (focusInTimeline - start) / Math.max(1, end - start);
        travelerY = start + (end - start) * t;
        activeIndex = t < 0.5 ? i : i + 1;
        break;
      }
    }

    timeline.style.setProperty('--timeline-progress', `${Math.max(0, travelerY)}px`);
    timeline.style.setProperty('--timeline-traveler-y', `${travelerY}px`);

    items.forEach((item, index) => {
      item.classList.toggle('is-past', index < activeIndex);
      item.classList.toggle('is-active', index === activeIndex);
    });
  }

  function requestUpdate() {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(updateJourney);
  }

  if (prefersReducedMotion) {
    items.forEach((item, index) => {
      item.classList.toggle('is-past', index < items.length - 1);
      item.classList.toggle('is-active', index === items.length - 1);
    });
    timeline.style.setProperty('--timeline-progress', `${getDotCenter(items[items.length - 1])}px`);
    timeline.style.setProperty('--timeline-traveler-y', `${getDotCenter(items[items.length - 1])}px`);
    return;
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  requestUpdate();
}
