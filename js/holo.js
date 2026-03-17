/* ═══════════════════════════════════════════════
   HOLOGRAPHIC CARD — 3D tilt + rainbow effects
   ═══════════════════════════════════════════════ */

function setupHolographicCard() {
  const holoCard  = document.getElementById('holoCard');
  const holoFoil  = document.getElementById('holoFoil');
  const holoShine = document.getElementById('holoShine');
  const holoGlare = document.getElementById('holoGlare');

  if (!holoCard || prefersReducedMotion) return;

  let rotX = 0;
  let rotY = 0;
  let leaveFrame = null;

  /* Update CSS custom properties for pointer-driven effects */
  function setPointerVisuals(x, y) {
    const mx    = `${(x * 100).toFixed(1)}%`;
    const my    = `${(y * 100).toFixed(1)}%`;
    const angle = ((Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 360) % 360;

    holoCard.style.setProperty('--mx', mx);
    holoCard.style.setProperty('--my', my);
    holoCard.style.setProperty('--pointer-angle', `${angle.toFixed(1)}deg`);

    /* Move foil background position */
    if (holoFoil) {
      holoFoil.style.backgroundPosition = `50% 50%, ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`;
    }

    /* Conic shine follows cursor */
    if (holoShine) {
      holoShine.style.backgroundPosition = `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`;
    }

    /* Glare follows cursor */
    if (holoGlare) {
      holoGlare.style.backgroundPosition = `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`;
    }
  }

  /* Apply 3D perspective transform */
  function applyTransform(rx, ry, scale) {
    holoCard.style.transform =
      `perspective(820px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  }

  /* ─── Mouse events ─── */
  holoCard.addEventListener('mousemove', event => {
    const rect = holoCard.getBoundingClientRect();
    const x = (event.clientX - rect.left)  / rect.width;
    const y = (event.clientY - rect.top)   / rect.height;

    rotX = (y - 0.5) * -28;
    rotY = (x - 0.5) *  28;
    applyTransform(rotX, rotY, 1.07);
    setPointerVisuals(x, y);
  });

  holoCard.addEventListener('mouseenter', () => {
    if (leaveFrame) cancelAnimationFrame(leaveFrame);
    holoCard.classList.add('is-hovered');
  });

  holoCard.addEventListener('mouseleave', () => {
    holoCard.classList.remove('is-hovered');
    setPointerVisuals(0.5, 0.5);

    /* Spring back to neutral */
    function springBack() {
      rotX *= 0.78;
      rotY *= 0.78;
      const scale = 1 + (Math.abs(rotX) + Math.abs(rotY)) / 1200;
      applyTransform(rotX, rotY, scale);

      if (Math.abs(rotX) > 0.06 || Math.abs(rotY) > 0.06) {
        leaveFrame = requestAnimationFrame(springBack);
      } else {
        applyTransform(0, 0, 1);
      }
    }

    leaveFrame = requestAnimationFrame(springBack);
  });
}
