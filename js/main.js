/* ═══════════════════════════════════════════════
   MAIN — Entry point, shared constants
   ═══════════════════════════════════════════════ */

/* Shared constant — read once, used by all modules */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── Boot sequence ─── */
setupNavbar();
setupMenu();
setupScrollAnimations();
setupTypingReveal();
setupAppCards();
setupHolographicCard();
setupActiveNav();
startLoadingIntro();

/* Edge case: page was already loaded before script executed */
if (document.readyState === 'complete') {
  animateLoadingCompletion();
}
