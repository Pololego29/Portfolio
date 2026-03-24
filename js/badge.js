(function () {
  const cardWrap = document.getElementById('badgeCardWrap');
  const ropeCard = document.getElementById('badgeCard');
  const ropePath = document.getElementById('badgeRopePath');
  const ropeTwistPath = document.getElementById('badgeRopeTwistPath');
  const ropeFiberPath = document.getElementById('badgeRopeFiberPath');
  if (!cardWrap || !ropeCard || !ropePath || !ropeTwistPath || !ropeFiberPath) return;

  const columnEl = cardWrap.parentElement;
  if (!columnEl) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ROPE = 118;
  const MAX_DRAG_STRETCH = 112;
  const MAX_SIM_STRETCH = 165;
  const GRAVITY = 1780;
  const AIR_DAMP = 0.0065;
  const RADIAL_SPRING = 42;
  const RADIAL_DAMP = 6.4;
  const IDLE_AMP = 0.11;
  const IDLE_FREQ = 0.26;
  const RELEASE_SNAP = 7.2;
  const RECENTER_PULL = 1.8;
  const RUBBER_BAND = 0.24;
  const EYELET_OFFSET = 12;

  let bx = 0;
  let by = ROPE;
  let vx = 0;
  let vy = 0;
  let cardAngle = 0;
  let mode = 'idle';
  let idleT = 0;
  let lastTs = 0;
  let prevBx = 0;
  let prevBy = ROPE;
  let prevDragTs = 0;
  let pivotX = 0;
  let pivotY = -12;
  let animId = null;
  let releaseTimer = null;
  let lastTrailTs = 0;
  let lastStretchStep = 0;

  let particleLayer = columnEl.querySelector('.badge-particles');
  if (!particleLayer) {
    particleLayer = document.createElement('div');
    particleLayer.className = 'badge-particles';
    particleLayer.setAttribute('aria-hidden', 'true');
    columnEl.appendChild(particleLayer);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hypot(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function cachePivot() {
    pivotX = columnEl.clientWidth / 2;
    pivotY = -18;
  }

  function setWrapState(state) {
    cardWrap.classList.remove('is-dragging', 'is-releasing');
    if (state) cardWrap.classList.add(state);
  }

  function clearReleaseState() {
    if (releaseTimer) {
      window.clearTimeout(releaseTimer);
      releaseTimer = null;
    }
  }

  function getBadgePoint(verticalBias) {
    const cardRect = ropeCard.getBoundingClientRect();
    const columnRect = columnEl.getBoundingClientRect();
    return {
      x: cardRect.left - columnRect.left + cardRect.width / 2,
      y: cardRect.top - columnRect.top + cardRect.height * verticalBias
    };
  }

  function spawnParticle(originX, originY, dx, dy, size, life, ring) {
    if (prefersReducedMotion || !particleLayer) return;

    const spark = document.createElement('span');
    spark.className = `badge-spark${ring ? ' is-ring' : ''}`;
    spark.style.setProperty('--x', `${originX.toFixed(1)}px`);
    spark.style.setProperty('--y', `${originY.toFixed(1)}px`);
    spark.style.setProperty('--dx', `${dx.toFixed(1)}px`);
    spark.style.setProperty('--dy', `${dy.toFixed(1)}px`);
    spark.style.setProperty('--size', `${size.toFixed(1)}px`);
    spark.style.setProperty('--life', `${life}ms`);
    particleLayer.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  }

  function spawnBurst(originX, originY, count, energy, withRing) {
    if (prefersReducedMotion) return;

    if (withRing) {
      spawnParticle(originX, originY, 0, -14 - energy * 8, 22 + energy * 10, 720, true);
    }

    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const speed = 14 + Math.random() * (18 + energy * 26);
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed - Math.random() * (6 + energy * 8);
      const size = 5 + Math.random() * (6 + energy * 4);
      const life = 520 + Math.round(Math.random() * 220);
      spawnParticle(originX, originY, dx, dy, size, life, false);
    }
  }

  function render() {
    const dist = Math.max(1, hypot(bx, by));
    const stretch = Math.max(0, dist - ROPE);
    const pull = clamp(stretch / MAX_DRAG_STRETCH, 0, 1);
    const glow = clamp(pull + hypot(vx, vy) / 1600, 0, 1.15);
    const drop = clamp(Math.max(0, by - ROPE) / MAX_DRAG_STRETCH, 0, 1.25);

    cardWrap.style.setProperty('--badge-pull', pull.toFixed(3));
    cardWrap.style.setProperty('--badge-glow', glow.toFixed(3));
    cardWrap.style.setProperty('--badge-drop', drop.toFixed(3));
    cardWrap.style.transform =
      `translate(calc(-50% + ${pivotX - columnEl.offsetWidth / 2 + bx}px), ${pivotY + by}px)`;

    const scaleX = 1 - pull * 0.032;
    const scaleY = 1 + pull * 0.072;
    ropeCard.style.transform = `rotate(${cardAngle.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;

    const x0 = pivotX;
    const y0 = pivotY;
    const x1 = pivotX + bx;
    const y1 = pivotY + by + EYELET_OFFSET;
    const horiz = Math.abs(bx) / dist;
    const sag = ROPE * 0.16 * horiz + stretch * 0.92 + drop * 18;
    const cpx = (x0 + x1) / 2;
    const cpy = (y0 + y1) / 2 + sag;
    const d = `M ${x0} ${y0} Q ${cpx} ${cpy} ${x1} ${y1}`;

    ropePath.setAttribute('d', d);
    ropeTwistPath.setAttribute('d', d);
    ropeFiberPath.setAttribute('d', d);
    ropePath.style.filter = `drop-shadow(0 4px ${6 + stretch * 0.08}px rgba(0, 0, 0, 0.28))`;
    ropeCard.style.boxShadow = `
      0 ${22 + stretch * 0.18}px ${54 + stretch * 0.34}px rgba(0,0,0,0.28),
      0 0 ${18 + glow * 20}px rgba(99,102,241,${0.12 + glow * 0.1}),
      inset 0 1px 0 rgba(255,255,255,0.12)
    `;
  }

  function updateSecondaryMotion(dt) {
    const dist = Math.max(1, hypot(bx, by));
    const stretch = Math.max(0, dist - ROPE);
    const angleDeg = Math.atan2(bx, Math.max(by, 1)) * 180 / Math.PI;
    const downPull = Math.max(0, by - ROPE);
    const inertialTilt = clamp(vx * 0.0045 + stretch * 0.09 + downPull * 0.012, -10, 10);
    const targetAngle = clamp(angleDeg + inertialTilt, -26, 26);
    const follow = mode === 'drag' ? 22 : 10;
    cardAngle += (targetAngle - cardAngle) * Math.min(1, follow * dt);
  }

  function physicsStep(dt) {
    const dist = Math.max(1, hypot(bx, by));
    const nx = bx / dist;
    const ny = by / dist;
    const stretch = dist - ROPE;
    const radialVelocity = vx * nx + vy * ny;
    const radialAccel = -stretch * RADIAL_SPRING - radialVelocity * RADIAL_DAMP;

    vx += nx * radialAccel * dt;
    vy += GRAVITY * dt + ny * radialAccel * dt;

    const damp = Math.pow(1 - AIR_DAMP, dt * 60);
    vx *= damp;
    vy *= damp;

    bx += vx * dt;
    by += vy * dt;

    const limited = hypot(bx, by);
    const maxDist = ROPE + MAX_SIM_STRETCH;
    if (limited > maxDist) {
      const ratio = maxDist / limited;
      bx *= ratio;
      by *= ratio;
      vx *= 0.9;
      vy *= 0.9;
    }

    if (
      Math.abs(bx) < 1.5 &&
      Math.abs(by - ROPE) < 1.5 &&
      Math.abs(vx) < 8 &&
      Math.abs(vy) < 8
    ) {
      bx = 0;
      by = ROPE;
      vx = 0;
      vy = 0;
      idleT = 0;
      mode = 'idle';
      setWrapState(null);
    }
  }

  function loop(ts) {
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.033) : 0.016;
    lastTs = ts;

    if (mode === 'idle') {
      idleT += dt;
      const theta = IDLE_AMP * Math.sin(idleT * IDLE_FREQ * Math.PI * 2);
      bx = ROPE * Math.sin(theta);
      by = ROPE * Math.cos(theta);
    } else if (mode === 'physics') {
      physicsStep(dt);
    }

    updateSecondaryMotion(dt);
    render();
    animId = window.requestAnimationFrame(loop);
  }

  function clientToBadge(clientX, clientY) {
    const columnRect = columnEl.getBoundingClientRect();
    const mx = clientX - columnRect.left - pivotX;
    const my = clientY - columnRect.top - pivotY;
    const dist = hypot(mx, my);

    let maxDist = ROPE;
    if (my > ROPE * 0.54) {
      maxDist += MAX_DRAG_STRETCH;
    } else if (my > 0) {
      maxDist += MAX_DRAG_STRETCH * 0.62;
    } else {
      maxDist += MAX_DRAG_STRETCH * 0.22;
    }

    if (dist <= 0.001) return { x: 0, y: ROPE };

    const overshoot = Math.max(0, dist - maxDist);
    const rubberized = overshoot > 0
      ? maxDist + overshoot * RUBBER_BAND
      : dist;
    const finalDist = Math.min(rubberized, ROPE + MAX_DRAG_STRETCH * 1.24);

    return {
      x: (mx / dist) * finalDist,
      y: (my / dist) * finalDist
    };
  }

  function maybeSpawnTrail() {
    if (prefersReducedMotion) return;

    const stretch = Math.max(0, hypot(bx, by) - ROPE);
    const now = performance.now();
    const step = Math.floor(stretch / 10);

    if (stretch < 12) {
      lastStretchStep = 0;
      return;
    }

    if (step <= lastStretchStep || now - lastTrailTs < 70) return;

    lastStretchStep = step;
    lastTrailTs = now;

    const point = getBadgePoint(0.22);
    spawnBurst(point.x, point.y, 2, clamp(stretch / MAX_DRAG_STRETCH, 0.2, 0.9), false);
  }

  function startDrag(clientX, clientY) {
    mode = 'drag';
    lastTs = 0;
    idleT = 0;
    const point = clientToBadge(clientX, clientY);

    bx = point.x;
    by = point.y;
    prevBx = point.x;
    prevBy = point.y;
    prevDragTs = performance.now();
    vx = 0;
    vy = 0;
    lastStretchStep = 0;

    clearReleaseState();
    setWrapState('is-dragging');
    document.body.style.cursor = 'grabbing';

    render();
    const badgePoint = getBadgePoint(0.2);
    spawnBurst(badgePoint.x, badgePoint.y, 3, 0.35, true);
  }

  function onMove(clientX, clientY) {
    const now = performance.now();
    const point = clientToBadge(clientX, clientY);
    const dt = (now - prevDragTs) / 1000;

    if (dt > 0.008) {
      vx = (point.x - prevBx) / dt;
      vy = (point.y - prevBy) / dt;
      prevBx = point.x;
      prevBy = point.y;
      prevDragTs = now;
    }

    bx = point.x;
    by = point.y;
    maybeSpawnTrail();
  }

  function endDrag() {
    const stretch = Math.max(0, hypot(bx, by) - ROPE);
    const downPull = Math.max(0, by - ROPE);
    const releaseEnergy = clamp(stretch / MAX_DRAG_STRETCH + hypot(vx, vy) / 1200, 0, 1.5);

    vy -= downPull * RELEASE_SNAP + releaseEnergy * 120;
    vx += -bx * RECENTER_PULL;
    vx = clamp(vx, -1100, 1100);
    vy = clamp(vy, -1850, 1550);

    mode = 'physics';
    lastTs = 0;
    document.body.style.cursor = '';
    setWrapState('is-releasing');
    clearReleaseState();
    releaseTimer = window.setTimeout(() => setWrapState(null), 560);

    if (stretch > 8) {
      render();
      const point = getBadgePoint(0.26);
      spawnBurst(point.x, point.y, 8, releaseEnergy, true);
    }
  }

  cachePivot();
  render();
  window.addEventListener('resize', cachePivot);

  cardWrap.addEventListener('mousedown', event => {
    event.preventDefault();
    startDrag(event.clientX, event.clientY);
  });

  window.addEventListener('mousemove', event => {
    if (mode === 'drag') onMove(event.clientX, event.clientY);
  });

  window.addEventListener('mouseup', () => {
    if (mode === 'drag') endDrag();
  });

  cardWrap.addEventListener(
    'touchstart',
    event => {
      event.preventDefault();
      const touch = event.touches[0];
      startDrag(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  window.addEventListener(
    'touchmove',
    event => {
      if (mode !== 'drag') return;
      event.preventDefault();
      const touch = event.touches[0];
      onMove(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  window.addEventListener('touchend', () => {
    if (mode === 'drag') endDrag();
  });

  animId = window.requestAnimationFrame(loop);
})();
