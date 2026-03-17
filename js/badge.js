// ─── Badge 2D — corde physique réaliste ───
(function () {
  const cardWrap  = document.getElementById('badgeCardWrap');
  const ropeCard  = document.getElementById('badgeCard');
  const ropePath  = document.getElementById('badgeRopePath');
  if (!cardWrap || !ropePath) return;

  const columnEl = cardWrap.parentElement;
  if (!columnEl) return;

  // ── Paramètres physiques ──────────────────────────────────────────
  const ROPE      = 160;   // longueur corde (px)
  const GRAVITY   = 1800;  // px/s²
  const DAMP_VEL  = 0.012; // amortissement vitesse par frame (coeff)
  const IDLE_AMP  = 0.055; // amplitude idle (rad ≈ 3°)
  const IDLE_FREQ = 0.35;  // fréquence idle (Hz)
  const LIFT_SPRING = 140; // rappel du rebond vers la longueur normale
  const LIFT_DAMP   = 16;  // amortissement du rebond
  const MAX_LIFT    = 18;  // compression visuelle max de la corde (px)

  // ── État ──────────────────────────────────────────────────────────
  // Position badge relative au pivot (pivot = (0,0), repos = (0, ROPE))
  let bx = 0, by = ROPE;
  let vx = 0, vy = 0;
  let cardAngle = 0;
  let ropeLift = 0, ropeLiftVel = 0;
  let mode = 'idle'; // 'idle' | 'drag' | 'physics'
  let idleT = 0, lastTs = null;
  let prevBx = 0, prevBy = ROPE, prevDragTs = 0;
  let pivotX = 0, pivotY = 0; // pivot en coordonnées de la colonne
  let animId = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function syncSecondaryMotion(dt) {
    const angleDeg = Math.atan2(bx, by) * 180 / Math.PI;
    const inertialTilt = clamp(vx * 0.004, -4, 4);
    const targetAngle = clamp(angleDeg + inertialTilt, -18, 18);
    const follow = mode === 'drag' ? 16 : 10;
    cardAngle += (targetAngle - cardAngle) * Math.min(1, follow * dt);

    ropeLiftVel += (-ropeLift * LIFT_SPRING - ropeLiftVel * LIFT_DAMP) * dt;
    ropeLift += ropeLiftVel * dt;
    ropeLift = clamp(ropeLift, -4, MAX_LIFT);

    if (Math.abs(ropeLift) < 0.05 && Math.abs(ropeLiftVel) < 1) {
      ropeLift = 0;
      ropeLiftVel = 0;
    }
  }

  // ── Cache pivot (recalcul au resize) ─────────────────────────────
  function cachePivot() {
    pivotX = columnEl.clientWidth / 2;
    // L'ancrage part légèrement au-dessus de la bordure haute du cadre
    // pour donner l'impression que la sangle sort du cadre sans point visible.
    pivotY = -12;
  }
  cachePivot();
  window.addEventListener('resize', cachePivot);

  // ── Rendu : position badge + tracé corde ─────────────────────────
  function render() {
    const displayScale = clamp((ROPE - ropeLift) / ROPE, 0.86, 1.03);
    const displayBx = bx * displayScale;
    const displayBy = by * displayScale;

    // Position badge-card-wrap : top-center = pivot + (bx, by)
    cardWrap.style.transform =
      'translate(calc(-50% + ' + (pivotX - columnEl.offsetWidth / 2 + displayBx) + 'px), ' +
      (pivotY + displayBy) + 'px)';
    ropeCard.style.transform = 'rotate(' + cardAngle + 'deg)';

    // Chemin corde : bezier quadratique avec affaissement naturel
    const x0 = pivotX, y0 = pivotY;                    // départ pivot
    const x1 = pivotX + displayBx, y1 = pivotY + displayBy; // arrivée badge (top)

    // Affaissement vers le bas proportionnel au déplacement horizontal
    const chord  = Math.sqrt(displayBx * displayBx + displayBy * displayBy);
    const horiz  = chord > 0 ? Math.abs(displayBx) / chord : 0;
    const sag    = ROPE * 0.22 * horiz;

    const cpx = (x0 + x1) / 2;
    const cpy = (y0 + y1) / 2 + sag;

    ropePath.setAttribute('d',
      'M ' + x0 + ' ' + y0 +
      ' Q ' + cpx + ' ' + cpy +
      ' '  + x1  + ' ' + y1);
  }

  // ── Boucle principale ─────────────────────────────────────────────
  function loop(ts) {
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.033) : 0.016;
    lastTs = ts;

    if (mode === 'idle') {
      idleT += dt;
      const theta = IDLE_AMP * Math.sin(idleT * IDLE_FREQ * Math.PI * 2);
      bx = ROPE * Math.sin(theta);
      by = ROPE * Math.cos(theta);

    } else if (mode === 'physics') {
      // Gravité
      vy += GRAVITY * dt;
      // Amortissement
      const damp = Math.pow(1 - DAMP_VEL, dt * 60);
      vx *= damp; vy *= damp;
      // Intégration
      bx += vx * dt;
      by += vy * dt;

      // Contrainte corde (pendule — toujours à longueur ROPE)
      const dist = Math.sqrt(bx * bx + by * by);
      if (dist > 0.1) {
        const nx = bx / dist, ny = by / dist;
        // Projette la vitesse sur la tangente (annule la composante radiale sortante)
        const radial = vx * nx + vy * ny;
        if (radial > 0) { vx -= radial * nx; vy -= radial * ny; }
        bx = nx * ROPE; by = ny * ROPE;
      }

      // Détection repos
      if (Math.abs(bx) < 1.5 && Math.abs(by - ROPE) < 1.5 &&
          Math.abs(vx) < 8  && Math.abs(vy) < 8) {
        bx = 0; by = ROPE; vx = 0; vy = 0;
        idleT = 0; mode = 'idle';
      }
    }
    // mode 'drag' : bx/by mis à jour par onMove

    syncSecondaryMotion(dt);
    render();
    animId = requestAnimationFrame(loop);
  }

  // ── Drag ─────────────────────────────────────────────────────────
  function clientToBadge(cx, cy) {
    const col = columnEl.getBoundingClientRect();
    const mx  = cx - col.left - pivotX;
    const my  = cy - col.top  - pivotY;
    const d   = Math.sqrt(mx * mx + my * my);
    const clamped = Math.min(d, ROPE);
    return d > 0 ? { x: mx / d * clamped, y: my / d * clamped }
                 : { x: 0, y: ROPE };
  }

  function startDrag(cx, cy) {
    mode = 'drag'; lastTs = null;
    const p = clientToBadge(cx, cy);
    prevBx = p.x; prevBy = p.y; prevDragTs = performance.now();
    vx = 0; vy = 0;
    ropeLift = 0;
    ropeLiftVel = 0;
    document.body.style.cursor = 'grabbing';
    ropeCard.style.boxShadow =
      '0 28px 70px rgba(0,0,0,0.75), 0 0 0 1px rgba(99,102,241,0.4), 0 0 30px rgba(99,102,241,0.2)';
    ropeCard.style.borderColor = 'rgba(99,102,241,0.5)';
  }

  function onMove(cx, cy) {
    const now = performance.now();
    const p   = clientToBadge(cx, cy);
    const dt  = (now - prevDragTs) / 1000;
    if (dt > 0.008) {
      vx = (p.x - prevBx) / dt;
      vy = (p.y - prevBy) / dt;
      prevBx = p.x; prevBy = p.y; prevDragTs = now;
    }
    bx = p.x; by = p.y;
  }

  function endDrag() {
    const releaseEnergy = clamp(
      Math.hypot(bx, by - ROPE) / 90 + Math.hypot(vx, vy) / 1200,
      0,
      1
    );
    if (releaseEnergy > 0.05) {
      ropeLiftVel = Math.max(ropeLiftVel, 90 + releaseEnergy * 190);
    }
    mode = 'physics'; lastTs = null;
    document.body.style.cursor = '';
    ropeCard.style.boxShadow = '';
    ropeCard.style.borderColor = '';
  }

  // ── Listeners ────────────────────────────────────────────────────
  cardWrap.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove',   e => { if (mode === 'drag') onMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup',     ()  => { if (mode === 'drag') endDrag(); });

  cardWrap.addEventListener('touchstart', e => {
    e.preventDefault();
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (mode === 'drag') onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchend', () => { if (mode === 'drag') endDrag(); });

  // ── Démarrage ────────────────────────────────────────────────────
  animId = requestAnimationFrame(loop);
})();
