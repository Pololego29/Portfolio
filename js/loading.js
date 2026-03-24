/* ═══════════════════════════════════════════════
   LOADING SCREEN
   ═══════════════════════════════════════════════ */

const loadingScreen  = document.getElementById('loadingScreen');
const loadingBar     = document.getElementById('loadingBar');
const loadingPercent = document.getElementById('loadingPercent');

let loadingValue = 0;
let loadingDone  = false;

/* Update progress bar & percentage text */
function updateLoadingUI(value) {
  if (!loadingBar || !loadingPercent) return;

  const safeValue = Math.max(0, Math.min(100, value));
  loadingBar.style.width = `${safeValue}%`;
  loadingPercent.textContent = `${Math.round(safeValue)}%`;
}

/* Hide loading screen and reveal page */
function finishLoading() {
  if (loadingDone) return;
  loadingDone = true;

  updateLoadingUI(100);

  window.setTimeout(() => {
    if (loadingScreen) loadingScreen.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    document.body.classList.add('site-ready');
  }, prefersReducedMotion ? 140 : 620);

  window.setTimeout(() => {
    if (loadingScreen) loadingScreen.setAttribute('aria-hidden', 'true');
  }, prefersReducedMotion ? 700 : 1380);
}

/* Animate from current value to 100 */
function animateLoadingCompletion() {
  const startValue = loadingValue;
  const duration   = prefersReducedMotion ? 120 : 480;
  const startTime  = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    loadingValue = startValue + (100 - startValue) * progress;
    updateLoadingUI(loadingValue);

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    } else {
      loadingValue = 100;
      finishLoading();
    }
  }

  window.requestAnimationFrame(tick);
}

/* Fake incremental progress, then finish on window load */
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
    loadingValue = Math.min(loadingValue + Math.floor(Math.random() * 5) + 2, 93);
    updateLoadingUI(loadingValue);
  }, 135);

  window.addEventListener(
    'load',
    () => {
      window.clearInterval(timer);
      animateLoadingCompletion();
    },
    { once: true }
  );
}
