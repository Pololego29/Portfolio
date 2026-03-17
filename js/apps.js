/* ═══════════════════════════════════════════════
   APP CARDS — 3D tilt on hover
   ═══════════════════════════════════════════════ */

function setupAppCards() {
  const appCards = document.querySelectorAll('.app-card');
  if (!appCards.length || prefersReducedMotion) return;

  appCards.forEach(card => {
    /* Tilt towards cursor */
    card.addEventListener('pointermove', event => {
      const rect  = card.getBoundingClientRect();
      const x     = (event.clientX - rect.left)  / rect.width;
      const y     = (event.clientY - rect.top)   / rect.height;
      const tiltY = (x - 0.5) * 10;
      const tiltX = (0.5 - y) * 10;

      card.classList.add('is-hovered');
      card.style.setProperty('--tilt-x',  `${tiltX.toFixed(2)}deg`);
      card.style.setProperty('--tilt-y',  `${tiltY.toFixed(2)}deg`);
      card.style.setProperty('--hover-x', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--hover-y', `${(y * 100).toFixed(1)}%`);
    });

    /* Reset on leave */
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-hovered');
      card.style.setProperty('--tilt-x',  '0deg');
      card.style.setProperty('--tilt-y',  '0deg');
      card.style.setProperty('--hover-x', '50%');
      card.style.setProperty('--hover-y', '50%');
    });
  });
}
