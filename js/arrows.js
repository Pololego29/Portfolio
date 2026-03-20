(function () {
  'use strict';

  /* ════════════════════════════════════════════
     CANVAS
  ════════════════════════════════════════════ */
  const canvas = document.createElement('canvas');
  canvas.id = 'arrow-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '45',
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ════════════════════════════════════════════
     MINECRAFT ARROW IMAGE
     Le sprite pointe en haut-droite ≈ -45° (-π/4)
  ════════════════════════════════════════════ */
  const MC_IMG   = new Image();
  MC_IMG.src     = 'img/fleche-minecraft.png';
  let mcImgReady = false;
  MC_IMG.onload  = () => { mcImgReady = true; };

  /* Pour que le sprite s'aligne sur l'angle de vol,
     on ajoute +π/4 en plus de la rotation de l'arrow. */
  const MC_ANGLE_OFFSET = Math.PI / 4;

  /* ════════════════════════════════════════════
     BLOCK CACHE
  ════════════════════════════════════════════ */
  let blocks = [];
  const TARGET_SELECTORS = [
    { selector: '.skill-card' },
    { selector: '.project-card' },
    { selector: '.stat-item' },
    { selector: '.about-block' },
    { selector: '.timeline-item' },
    { selector: '.app-card' },
    { selector: '.contact-card' },
    { selector: '.badge-card' },
    { selector: '.holo-card', shape: 'ellipse' },
  ];

  function getScrollY() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function getPageHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      H
    );
  }

  function refreshBlocks() {
    blocks = [];
    const scrollY = getScrollY();
    TARGET_SELECTORS.forEach(({ selector, shape = 'rect' }) => {
      document.querySelectorAll(selector).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 20) {
          if (shape === 'ellipse') {
            blocks.push({
              type: 'ellipse',
              cx: r.left + r.width * 0.5,
              cy: r.top + scrollY + r.height * 0.5,
              rx: Math.max(1, r.width * 0.5),
              ry: Math.max(1, r.height * 0.5),
            });
          } else {
            blocks.push({ type: 'rect', x: r.left, y: r.top + scrollY, w: r.width, h: r.height });
          }
        }
      });
    });
  }

  function getRectHit(block, x, y) {
    if (x <= block.x || x >= block.x + block.w || y <= block.y || y >= block.y + block.h) {
      return null;
    }

    const dTop = y - block.y;
    const dBottom = (block.y + block.h) - y;
    const dLeft = x - block.x;
    const dRight = (block.x + block.w) - x;
    const minDist = Math.min(dTop, dBottom, dLeft, dRight);

    if (minDist === dTop)    return { tx: x, ty: y, block, nx:  0, ny: -1, push: dTop + 5 };
    if (minDist === dBottom) return { tx: x, ty: y, block, nx:  0, ny:  1, push: dBottom + 5 };
    if (minDist === dLeft)   return { tx: x, ty: y, block, nx: -1, ny:  0, push: dLeft + 5 };
    return { tx: x, ty: y, block, nx: 1, ny: 0, push: dRight + 5 };
  }

  function getEllipseHit(block, x, y, fallbackAngle) {
    const dx = x - block.cx;
    const dy = y - block.cy;
    const normalized = (dx * dx) / (block.rx * block.rx) + (dy * dy) / (block.ry * block.ry);
    if (normalized >= 1) return null;

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
      return {
        tx: x,
        ty: y,
        block,
        nx: -Math.cos(fallbackAngle),
        ny: -Math.sin(fallbackAngle),
        push: 8,
      };
    }

    const scale = 1 / Math.sqrt(Math.max(normalized, 1e-6));
    const edgeX = block.cx + dx * scale;
    const edgeY = block.cy + dy * scale;

    let nx = (edgeX - block.cx) / (block.rx * block.rx);
    let ny = (edgeY - block.cy) / (block.ry * block.ry);
    const normalLen = Math.hypot(nx, ny) || 1;
    nx /= normalLen;
    ny /= normalLen;

    return {
      tx: x,
      ty: y,
      block,
      nx,
      ny,
      push: Math.hypot(edgeX - x, edgeY - y) + 6,
    };
  }

  function getBlockHit(block, x, y, fallbackAngle) {
    return block.type === 'ellipse'
      ? getEllipseHit(block, x, y, fallbackAngle)
      : getRectHit(block, x, y);
  }

  /* ════════════════════════════════════════════
     PALETTE
  ════════════════════════════════════════════ */
  const COLORS = ['#60a5fa','#34d399','#a78bfa','#f59e0b','#38bdf8','#f472b6','#e2e8f0'];
  function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

  /* ════════════════════════════════════════════
     SPARKS D'IMPACT
  ════════════════════════════════════════════ */
  const sparks = [];

  function spawnSparks(x, y, impactAngle, count, color) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 1.3;
      const speed  = 50 + Math.random() * 150;
      sparks.push({
        x, y,
        vx:    Math.cos(impactAngle + Math.PI + spread) * speed,
        vy:    Math.sin(impactAngle + Math.PI + spread) * speed - 28,
        life:  1,
        decay: 1.4 + Math.random() * 1.6,
        size:  1.5 + Math.random() * 3.2,
        color: Math.random() < 0.5 ? color : '#fff',
      });
    }
  }

  function updateSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vy   += 280 * dt;
      s.x    += s.vx * dt;
      s.y    += s.vy * dt;
      s.life -= s.decay * dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life * s.life);
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y - getScrollY(), Math.max(0.1, s.size * s.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ════════════════════════════════════════════
     CLASSE DE BASE — Arrow
  ════════════════════════════════════════════ */
  class Arrow {
    constructor() {
      this.fromRight = Math.random() > 0.5;
      this.x = this.fromRight ? W + 45 : -45;
      this.y = getScrollY() + H * 0.06 + Math.random() * H * 0.86;

      const speed = 500 + Math.random() * 460;
      this.vx = this.fromRight ? -speed : speed;
      this.vy = (Math.random() - 0.5) * 100;
      this.gravity = 130 + Math.random() * 110;

      this.len   = 56 + Math.random() * 26;
      this.color = randColor();

      this.stuck        = false;
      this.stuckAge     = 0;
      this.stuckLife    = 2000 + Math.random() * 2600;
      this.bounces      = 0;
      this.maxBounces   = 1; // premier impact = rebond, deuxième impact = planté
      this.alpha        = 1;
      this.dead         = false;

      this._lockedAngle    = null;
      this._noCollideUntil = 0;   // cooldown après rebond (ms)
      this._wiggle         = 0;   // amplitude vibration après impact
    }

    get angle() {
      return this._lockedAngle !== null
        ? this._lockedAngle
        : Math.atan2(this.vy, this.vx);
    }

    /* Pointe de la flèche (tête) */
    tip() {
      const a = this.angle;
      return {
        x: this.x + Math.cos(a) * this.len * 0.5,
        y: this.y + Math.sin(a) * this.len * 0.5,
      };
    }

    /* Détection de collision — vérifie la pointe ET le quart-avant du fût */
    detectHit() {
      if (performance.now() < this._noCollideUntil) return null;
      const a = this.angle;
      const pts = [
        // Pointe (tip)
        { x: this.x + Math.cos(a) * this.len * 0.50,
          y: this.y + Math.sin(a) * this.len * 0.50 },
        // Quart avant du fût (détecte les blocs fins)
        { x: this.x + Math.cos(a) * this.len * 0.25,
          y: this.y + Math.sin(a) * this.len * 0.25 },
      ];
      for (const b of blocks) {
        for (const pt of pts) {
          const hit = getBlockHit(b, pt.x, pt.y, a);
          if (hit) return hit;
        }
      }
      return null;
    }

    update(dt) {
      if (this.stuck) {
        this.stuckAge += dt * 1000;
        // Vibration décroissante après impact
        this._wiggle *= Math.pow(0.08, dt);
        if (this.stuckAge > this.stuckLife) {
          this.alpha -= dt * 1.1;
          if (this.alpha <= 0) this.dead = true;
        }
        return;
      }

      this.vy += this.gravity * dt;
      this.x  += this.vx * dt;
      this.y  += this.vy * dt;

      if (this.x < -160 || this.x > W + 160 || this.y > getPageHeight() + 120 || this.y < -220) {
        this.dead = true;
        return;
      }

      const hit = this.detectHit();
      if (!hit) return;

      const hitAngle = Math.atan2(this.vy, this.vx);
      const impactSpeed = Math.hypot(this.vx, this.vy);
      const tx = hit.tx, ty = hit.ty;

      if (this.bounces >= this.maxBounces) {
        spawnSparks(tx, ty, hitAngle, 14, this.color);

        this._lockedAngle = hitAngle;
        const embed = 14;
        this.x = tx - Math.cos(hitAngle) * (this.len * 0.5 - embed);
        this.y = ty - Math.sin(hitAngle) * (this.len * 0.5 - embed);

        this.stuck = true;
        this.vx = 0;
        this.vy = 0;
        this._wiggle = 0.10 + Math.min(impactSpeed / 2800, 0.22);
        return;
      }

      /* ── REBOND ─────────────────────────────────────────────────────────
         Le push-out suit la normale de la surface touchée.
         La réflexion de vitesse suit ensuite la physique classique.
         Pour un rectangle : haut/bas => vy s'inverse, gauche/droite => vx s'inverse.
         Pour le cadre photo du hero : collision elliptique plus fidèle à la forme.
      ──────────────────────────────────────────────────────────────────── */
      spawnSparks(tx, ty, hitAngle, 7, this.color);
      this.x += hit.nx * hit.push;
      this.y += hit.ny * hit.push;

      const normalSpeed = this.vx * hit.nx + this.vy * hit.ny;
      const bounceLoss = 0.78;
      this.vx = (this.vx - 2 * normalSpeed * hit.nx) * bounceLoss;
      this.vy = (this.vy - 2 * normalSpeed * hit.ny) * bounceLoss;

      this.bounces++;
      this._noCollideUntil = performance.now() + 280;
    }

    draw() {
      const drawX = this.x;
      const drawY = this.y - getScrollY();

      // Angle + vibration sinusoïdale si planté
      const baseAngle = this.angle;
      const a = this.stuck && this._wiggle > 0.002
        ? baseAngle + this._wiggle * Math.sin(performance.now() * 0.022)
        : baseAngle;

      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.translate(drawX, drawY);
      ctx.rotate(a);
      this.drawShape();
      ctx.restore();
    }

    /* Méthode à override */
    drawShape() {}
  }

  /*
  ════════════════════════════════════════════
     FANCY ARROW — flèche vectorielle originale
     Temporairement désactivée pour tester une version 100% Minecraft
  ════════════════════════════════════════════
  class FancyArrow extends Arrow {
    constructor() {
      super();
      this.thick = 2.2 + Math.random() * 0.9;
    }

    drawShape() {
      const len = this.len;

      // Halo de vitesse (motion blur manuel)
      if (!this.stuck) {
        const speed = Math.hypot(this.vx, this.vy);
        ctx.shadowColor = this.color;
        ctx.shadowBlur  = Math.min(speed / 80, 12);
      }

      // Fût (shaft)
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = this.thick;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(-len * 0.50, 0);
      ctx.lineTo( len * 0.36, 0);
      ctx.stroke();

      // Reflet clair sur le fût
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = this.thick * 0.35;
      ctx.beginPath();
      ctx.moveTo(-len * 0.48, -this.thick * 0.3);
      ctx.lineTo( len * 0.32, -this.thick * 0.3);
      ctx.stroke();

      // Tête (arrowhead)
      ctx.shadowBlur = this.stuck ? 6 : 16;
      ctx.fillStyle  = this.color;
      ctx.beginPath();
      ctx.moveTo( len * 0.52,  0);
      ctx.lineTo( len * 0.30, -5);
      ctx.lineTo( len * 0.30,  5);
      ctx.closePath();
      ctx.fill();

      // Highlight sur la tête
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo( len * 0.50,  0);
      ctx.lineTo( len * 0.38, -2.2);
      ctx.lineTo( len * 0.30, -4.5);
      ctx.closePath();
      ctx.fill();

      // Empennage (fletching)
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = 1.4;
      ctx.shadowBlur  = 4;
      ctx.globalAlpha = Math.max(0, this.alpha) * 0.7;
      ctx.beginPath();
      ctx.moveTo(-len * 0.30, 0);
      ctx.quadraticCurveTo(-len * 0.40, -5, -len * 0.50, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-len * 0.30, 0);
      ctx.quadraticCurveTo(-len * 0.40,  5, -len * 0.50,  8);
      ctx.stroke();
    }
  }
  */

  /* ════════════════════════════════════════════
     MINECRAFT ARROW — sprite pixelisé
  ════════════════════════════════════════════ */
  class MinecraftArrow extends Arrow {
    constructor() {
      super();
      this.len    = 60 + Math.random() * 20;
      this.mcSize = 66 + Math.random() * 18; // taille de rendu en px
    }

    drawShape() {
      if (!mcImgReady) return;

      /* Le canvas est déjà rotate(angle).
         On corrige l'angle naturel du sprite (-π/4) en ajoutant +π/4. */
      ctx.rotate(MC_ANGLE_OFFSET);

      const sz = this.mcSize;
      const ar = MC_IMG.naturalHeight > 0
        ? MC_IMG.naturalHeight / MC_IMG.naturalWidth
        : 1;

      ctx.imageSmoothingEnabled = false; // look pixelisé Minecraft

      /* Image principale */
      ctx.drawImage(MC_IMG, -sz * 0.5, -sz * ar * 0.5, sz, sz * ar);

      /* Glow subtil en vol */
      if (!this.stuck) {
        const speed = Math.hypot(this.vx, this.vy);
        const glow  = Math.min(speed / 800, 0.22);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, this.alpha) * glow;
        ctx.drawImage(MC_IMG, -sz * 0.5, -sz * ar * 0.5, sz, sz * ar);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  /* ════════════════════════════════════════════
     FACTORY
  ════════════════════════════════════════════ */
  function createArrow() {
    // return Math.random() < 0.40 ? new MinecraftArrow() : new FancyArrow();
    return new MinecraftArrow();
  }

  /* ════════════════════════════════════════════
     SPAWN SCHEDULER
  ════════════════════════════════════════════ */
  const arrows = [];

  function scheduleNext() {
    const delay = 450 + Math.random() * 1400;
    setTimeout(() => {
      if (arrows.filter(a => !a.stuck).length < 10) {
        arrows.push(createArrow());
      }
      scheduleNext();
    }, delay);
  }

  /* ════════════════════════════════════════════
     RENDER LOOP
  ════════════════════════════════════════════ */
  let lastTs = 0;
  let lastBlockRefresh = 0;

  function loop(ts) {
    // Cap dt à 33ms (30fps minimum) pour éviter les gros sauts
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.033) : 0.016;
    lastTs = ts;

    if (!lastBlockRefresh || ts - lastBlockRefresh > 90) {
      refreshBlocks();
      lastBlockRefresh = ts;
    }

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

  function start() {
    refreshBlocks();
    setTimeout(scheduleNext, 1200);
  }

  if (document.readyState === 'complete') { start(); }
  else { window.addEventListener('load', start); }

  requestAnimationFrame(loop);
})();
