(function () {
  function setupInteractiveBackground() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const supportsFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (prefersReducedMotion || !supportsFinePointer) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'bg-interference-canvas';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.34,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.34,
      active: false,
      energy: 0,
    };

    const nodes = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastTs = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedNodes();
    }

    function seedNodes() {
      const count = Math.max(18, Math.round((width * height) / 65000));
      nodes.length = 0;

      for (let i = 0; i < count; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.18,
          phase: Math.random() * Math.PI * 2,
          radius: 1.2 + Math.random() * 2.1,
        });
      }
    }

    function updatePointer(dt) {
      const lerp = 1 - Math.pow(0.00018, dt);
      pointer.x += (pointer.targetX - pointer.x) * lerp;
      pointer.y += (pointer.targetY - pointer.y) * lerp;
      pointer.energy += ((pointer.active ? 1 : 0) - pointer.energy) * Math.min(1, dt * 3.2);
    }

    function updateNodes(dt) {
      for (const node of nodes) {
        node.phase += dt * (0.35 + node.radius * 0.08);
        node.x += node.vx * dt * 60 + Math.cos(node.phase) * 0.08;
        node.y += node.vy * dt * 60 + Math.sin(node.phase * 1.12) * 0.08;

        if (node.x < -30) node.x = width + 30;
        if (node.x > width + 30) node.x = -30;
        if (node.y < -30) node.y = height + 30;
        if (node.y > height + 30) node.y = -30;

        if (pointer.energy > 0.02) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const dist = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - dist / 210) * pointer.energy;

          if (influence > 0) {
            node.x -= (dx / Math.max(dist, 1)) * influence * 0.35;
            node.y -= (dy / Math.max(dist, 1)) * influence * 0.35;
          }
        }
      }
    }

    function drawLinks() {
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];

        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 126) continue;

          const alpha = Math.max(0, 1 - dist / 126) * 0.12;
          ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        const pdx = pointer.x - a.x;
        const pdy = pointer.y - a.y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist < 165 && pointer.energy > 0.04) {
          const alpha = (1 - pDist / 165) * 0.34 * pointer.energy;
          ctx.strokeStyle = `rgba(167, 243, 208, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
    }

    function drawNodes() {
      for (const node of nodes) {
        const dx = pointer.x - node.x;
        const dy = pointer.y - node.y;
        const dist = Math.hypot(dx, dy);
        const boost = Math.max(0, 1 - dist / 170) * pointer.energy;
        const radius = node.radius + boost * 1.25;

        ctx.fillStyle = boost > 0.08
          ? `rgba(191, 219, 254, ${0.44 + boost * 0.26})`
          : 'rgba(191, 219, 254, 0.34)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pointer.energy > 0.03) {
        ctx.fillStyle = `rgba(167,243,208,${0.22 * pointer.energy})`;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 2.5 + pointer.energy * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(ts) {
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.033) : 0.016;
      lastTs = ts;

      ctx.clearRect(0, 0, width, height);
      updatePointer(dt);
      updateNodes(dt);
      drawLinks();
      drawNodes();

      window.requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', event => {
      pointer.active = true;
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
      pointer.active = false;
    });

    resize();
    window.requestAnimationFrame(frame);
  }

  window.setupInteractiveBackground = setupInteractiveBackground;
})();
