(function () {
  'use strict';

  /* ════════════════════════════════════════════
     CANVAS SETUP
  ════════════════════════════════════════════ */
  const canvas = document.createElement('canvas');
  canvas.id = 'arrow-canvas';
  Object.assign(canvas.style, {
    position:      'fixed',
    inset:         '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    zIndex:        '45',
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ════════════════════════════════════════════
     BLOCK CACHE  (bounding rects of targets)
  ════════════════════════════════════════════ */
  let blocks = [];
  const TARGET_SELECTORS = [
    '.skill-card', '.project-card', '.stat-item',
    '.about-block', '.timeline-item', '.app-card',
    '.contact-card', '.holo-card',
  ];

  function refreshBlocks() {
    blocks = [];
    TARGET_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < H) {
          blocks.push({ x: r.left, y: r.top, w: r.width, h: r.height });
        }
      });
    });
  }

  /* ════════════════════════════════════════════
     PALETTE
  ════════════════════════════════════════════ */
  const COLORS = [
    '#60a5fa', // bleu
    '#34d399', // vert
    '#a78bfa', // violet
    '#f59e0b', // ambre
    '#38bdf8', // cyan
    '#f472b6', // rose
    '#e2e8f0', // blanc cassé
  ];
  function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

  /* ════════════════════════════════════════════
     IMPACT SPARKS
  ════════════════════════════════════════════ */
  const sparks = [];

  function spawnSparks(x, y, impactAngle, count, color) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 1.1;
      const speed  = 55 + Math.random() * 130;
      sparks.push({
        x, y,
        vx:    Math.cos(impactAngle + Math.PI + spread) * speed,
        vy:    Math.sin(impactAngle + Math.PI + spread) * speed - 20,
        life:  1,
        decay: 1.6 + Math.random() * 1.4,
        size:  1.4 + Math.random() * 2.8,
        color: Math.random() < 0.5 ? color : '#fff',
      });
    }
  }

  function updateSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vy += 240 * dt;
      s.x  += s.vx * dt;
      s.y  += s.vy * dt;
      s.life -= s.decay * dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life * s.life);
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.1, s.size * s.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ════════════════════════════════════════════
     ARROW CLASS
  ════════════════════════════════════════════ */
  class Arrow {
    constructor() {
      this.fromRight = Math.random() > 0.5;

      // Spawn position : côté gauche ou droit, hauteur aléatoire
      this.x = this.fromRight ? W + 40 : -40;
      this.y = H * 0.08 + Math.random() * H * 0.82;

      // Vitesse
      const speed = 480 + Math.random() * 420;
      this.vx = this.fromRight ? -speed : speed;
      this.vy = (Math.random() - 0.5) * 90;

      // Gravité faible pour garder une trajectoire tendue
      this.gravity = 140 + Math.random() * 100;

      // Apparence
      this.len      = 54 + Math.random() * 24;
      this.thick    = 2.2 + Math.random() * 0.8;
      this.color    = randColor();

      // État
      this.stuck      = false;
      this.stuckAge   = 0;
      this.stuckLife  = 1800 + Math.random() * 2400; // ms avant de disparaître
      this.bounces    = 0;
      this.maxBounces = Math.random() < 0.35 ? 1 : 0; // 35% rebondissent une fois
      this.alpha      = 1;
      this.dead       = false;

      // Angle figé quand plantée
      this._lockedAngle = null;
    }

    /* Angle courant --------------------------------- */
    get angle() {
      return this._lockedAngle !== null
        ? this._lockedAngle
        : Math.atan2(this.vy, this.vx);
    }

    /* Pointe de la flèche (tête) -------------------- */
    tip() {
      const a = this.angle;
      return {
        x: this.x + Math.cos(a) * this.len * 0.5,
        y: this.y + Math.sin(a) * this.len * 0.5,
      };
    }

    /* ── Update ──────────────────────────────────── */
    update(dt) {
      if (this.stuck) {
        this.stuckAge += dt * 1000;
        if (this.stuckAge > this.stuckLife) {
          this.alpha -= dt * 1.4;
          if (this.alpha <= 0) this.dead = true;
        }
        return;
      }

      // Physique
      this.vy += this.gravity * dt;
      this.x  += this.vx * dt;
      this.y  += this.vy * dt;

      // Sortie d'écran
      if (this.x < -150 || this.x > W + 150 || this.y > H + 100 || this.y < -200) {
        this.dead = true;
        return;
      }

      // ── Détection collision ──
      const t = this.tip();
      for (const b of blocks) {
        if (t.x > b.x && t.x < b.x + b.w && t.y > b.y && t.y < b.y + b.h) {

          const hitAngle = Math.atan2(this.vy, this.vx);

          if (this.bounces < this.maxBounces) {
            /* REBOND -------------------------------- */
            spawnSparks(t.x, t.y, hitAngle, 6, this.color);

            // Choisir l'axe à inverser selon la direction dominante
            if (Math.abs(this.vx) > Math.abs(this.vy) * 0.9) {
              this.vx *= -0.48;
              this.vy *= 0.72;
            } else {
              this.vy *= -0.48;
              this.vx *= 0.72;
            }
            this.bounces++;

          } else {
            /* PLANTÉ -------------------------------- */
            spawnSparks(t.x, t.y, hitAngle, 10, this.color);

            this._lockedAngle = hitAngle;
            // Repositionner : pointe 12px dans la surface
            const embed = 12;
            this.x = t.x - Math.cos(hitAngle) * (this.len * 0.5 - embed);
            this.y = t.y - Math.sin(hitAngle) * (this.len * 0.5 - embed);
            this.stuck = true;
            this.vx = 0;
            this.vy = 0;
          }
          break;
        }
      }
    }

    /* ── Draw ────────────────────────────────────── */
    draw() {
      const a   = this.angle;
      const len = this.len;

      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.translate(this.x, this.y);
      ctx.rotate(a);

      /* Halo de vitesse (motion blur manuel) */
      if (!this.stuck) {
        const speed = Math.hypot(this.vx, this.vy);
        const blur  = Math.min(speed / 80, 12);
        ctx.shadowColor = this.color;
        ctx.shadowBlur  = blur;
      }

      /* ── Fût (shaft) ─── */
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = this.thick;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(-len * 0.50, 0);
      ctx.lineTo( len * 0.36, 0);
      ctx.stroke();

      /* Reflet clair sur le fût */
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = this.thick * 0.35;
      ctx.beginPath();
      ctx.moveTo(-len * 0.48, -this.thick * 0.3);
      ctx.lineTo( len * 0.32, -this.thick * 0.3);
      ctx.stroke();

      /* ── Tête (arrowhead) ─── */
      ctx.shadowBlur  = this.stuck ? 6 : 16;
      ctx.fillStyle   = this.color;
      ctx.beginPath();
      ctx.moveTo( len * 0.52,  0);
      ctx.lineTo( len * 0.30, -5);
      ctx.lineTo( len * 0.30,  5);
      ctx.closePath();
      ctx.fill();

      /* Highlight sur la tête */
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo( len * 0.50,  0);
      ctx.lineTo( len * 0.38, -2.2);
      ctx.lineTo( len * 0.30, -4.5);
      ctx.closePath();
      ctx.fill();

      /* ── Empennage (fletching) ─── */
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = 1.4;
      ctx.shadowBlur  = 4;
      ctx.globalAlpha = Math.max(0, this.alpha) * 0.7;
      // Plume haut
      ctx.beginPath();
      ctx.moveTo(-len * 0.30, 0);
      ctx.quadraticCurveTo(-len * 0.40, -5, -len * 0.50, -8);
      ctx.stroke();
      // Plume bas
      ctx.beginPath();
      ctx.moveTo(-len * 0.30, 0);
      ctx.quadraticCurveTo(-len * 0.40,  5, -len * 0.50,  8);
      ctx.stroke();

      ctx.restore();
    }
  }

  /* ════════════════════════════════════════════
     SPAWN SCHEDULER  (rythme aléatoire)
  ════════════════════════════════════════════ */
  const arrows = [];

  function scheduleNext() {
    const delay = 700 + Math.random() * 2000;
    setTimeout(() => {
      // Ne pas spammer si trop de flèches en vol
      if (arrows.filter(a => !a.stuck).length < 6) {
        arrows.push(new Arrow());
      }
      scheduleNext();
    }, delay);
  }

  /* ════════════════════════════════════════════
     RENDER LOOP
  ════════════════════════════════════════════ */
  let lastTs = 0;

  function loop(ts) {
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;

    ctx.clearRect(0, 0, W, H);

    updateSparks(dt);

    for (let i = arrows.length - 1; i >= 0; i--) {
      const arr = arrows[i];
      arr.update(dt);
      if (arr.dead) { arrows.splice(i, 1); continue; }
      arr.draw();
    }

    requestAnimationFrame(loop);
  }

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */
  resize();
  window.addEventListener('resize', () => { resize(); refreshBlocks(); });
  window.addEventListener('scroll', refreshBlocks, { passive: true });
  setInterval(refreshBlocks, 600);

  // Attendre que la page soit chargée pour lire les blocs
  if (document.readyState === 'complete') {
    refreshBlocks();
    setTimeout(scheduleNext, 1200);
  } else {
    window.addEventListener('load', () => {
      refreshBlocks();
      setTimeout(scheduleNext, 1200);
    });
  }

  requestAnimationFrame(loop);
})();
