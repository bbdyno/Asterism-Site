// Night sky behind the page, and the "find a star" demo.
// Everything is drawn on canvas; with prefers-reduced-motion the stars hold
// still and nothing falls.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rand = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };

  // ---- Background: twinkling stars, a faint band of the galaxy, meteors ----
  const sky = document.getElementById('sky');
  const ctx = sky.getContext('2d');
  let stars = [];
  let meteors = [];
  let nextMeteor = performance.now() + 1500;

  function resize() {
    sky.width = innerWidth * dpr;
    sky.height = innerHeight * dpr;
    sky.style.width = innerWidth + 'px';
    sky.style.height = innerHeight + 'px';
    const count = Math.round((innerWidth * innerHeight) / 2600);
    stars = Array.from({ length: count }, (_, i) => {
      // A third of the stars crowd a soft diagonal band, like the Milky Way.
      const inBand = rand(i + 0.5) < 0.33;
      let x = rand(i + 1.1), y = rand(i + 2.3);
      if (inBand) {
        const along = rand(i + 3.7), across = (rand(i + 4.1) + rand(i + 4.9) - 1) * 0.12;
        x = along; y = 0.15 + along * 0.55 + across;
      }
      return {
        x: x * innerWidth, y: y * innerHeight,
        r: (inBand ? 0.35 : 0.5) + rand(i + 5.3) * (inBand ? 0.7 : 1.1),
        base: 0.25 + rand(i + 6.1) * 0.6,
        speed: 0.4 + rand(i + 7.7) * 1.8,
        phase: rand(i + 8.3) * Math.PI * 2,
        warm: rand(i + 9.9) > 0.88,
        depth: 0.2 + rand(i + 10.1) * 0.8,
      };
    });
  }

  function spawnMeteor(x, y) {
    const angle = Math.PI * (0.72 + Math.random() * 0.12);
    meteors.push({
      x: x ?? innerWidth * (0.3 + Math.random() * 0.7),
      y: y ?? innerHeight * Math.random() * 0.45,
      angle, born: performance.now(),
      life: 900 + Math.random() * 500,
      length: 120 + Math.random() * 140,
      travel: Math.min(innerWidth, innerHeight) * (0.35 + Math.random() * 0.3),
    });
  }

  function drawSky(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const t = now / 1000;
    const scroll = scrollY;
    for (const s of stars) {
      const twinkle = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
      // Nearer stars drift a little faster when the page scrolls.
      let y = (s.y - scroll * 0.08 * s.depth) % innerHeight;
      if (y < 0) y += innerHeight;
      ctx.globalAlpha = s.base * twinkle;
      ctx.fillStyle = s.warm ? '#ffe7b3' : '#e8e2d9';
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!reduce) {
      if (now > nextMeteor) {
        spawnMeteor();
        nextMeteor = now + 3500 + Math.random() * 6000;
      }
      meteors = meteors.filter((m) => now - m.born < m.life);
      for (const m of meteors) {
        const p = (now - m.born) / m.life;
        const eased = 1 - Math.pow(1 - p, 2);
        const hx = m.x + Math.cos(m.angle) * m.travel * eased;
        const hy = m.y + Math.sin(m.angle) * m.travel * eased;
        const tail = m.length * (1 - 0.5 * p);
        const tx = hx - Math.cos(m.angle) * tail, ty = hy - Math.sin(m.angle) * tail;
        const fade = p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88;
        const g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, 'rgba(255,231,179,0)');
        g.addColorStop(1, `rgba(255,231,179,${0.95 * fade})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 7);
        glow.addColorStop(0, `rgba(255,231,179,${fade})`);
        glow.addColorStop(1, 'rgba(255,231,179,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (!reduce || meteors.length) requestAnimationFrame(drawSky);
  }

  resize();
  addEventListener('resize', resize);
  requestAnimationFrame(drawSky);
  if (reduce) addEventListener('scroll', () => requestAnimationFrame(drawSky), { passive: true });

  // A click on empty sky sends a meteor from there.
  addEventListener('click', (event) => {
    if (reduce || event.target.closest('a, button, .demo')) return;
    spawnMeteor(event.clientX, event.clientY);
  });

  // ---- Demo: sweep the sky until a hidden star lights up ----
  const demo = document.querySelector('.demo canvas');
  if (!demo) return;
  const dctx = demo.getContext('2d');
  const note = document.querySelector('.demo .note');
  const hint = document.querySelector('.demo .hint');
  const world = { w: 2.6, h: 1.8 };            // the sky is wider than the window
  const hidden = { x: 0.62, y: 0.38 };          // where the record was left (0..1 of world)
  let view = { x: 0.2, y: 0.6 };                // window centre, 0..1 of world
  let target = { ...view };
  let found = 0, foundAt = 0;
  const demoStars = Array.from({ length: 260 }, (_, i) => ({
    x: rand(i + 20.1), y: rand(i + 21.7), r: 0.4 + rand(i + 22.3) * 1.2, a: 0.2 + rand(i + 23.9) * 0.6,
  }));

  function sizeDemo() {
    const box = demo.getBoundingClientRect();
    demo.width = box.width * dpr; demo.height = box.height * dpr;
  }
  sizeDemo();
  addEventListener('resize', sizeDemo);

  function aim(clientX, clientY) {
    const box = demo.getBoundingClientRect();
    target.x = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
    target.y = Math.min(Math.max((clientY - box.top) / box.height, 0), 1);
  }
  demo.addEventListener('pointermove', (e) => aim(e.clientX, e.clientY));
  demo.addEventListener('pointerdown', (e) => { demo.setPointerCapture(e.pointerId); aim(e.clientX, e.clientY); });

  function star(c, x, y, r, color) {
    c.fillStyle = color;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.2 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  }

  function drawDemo(now) {
    const W = demo.width / dpr, H = demo.height / dpr;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.x += (target.x - view.x) * 0.08;
    view.y += (target.y - view.y) * 0.08;
    // World pixels: the window shows 1/world of the sky.
    const pxW = W * world.w, pxH = H * world.h;
    const ox = view.x * (pxW - W), oy = view.y * (pxH - H);
    dctx.fillStyle = '#0d0f19'; dctx.fillRect(0, 0, W, H);

    // Altitude rings and bearing lines, like the app's grid.
    dctx.strokeStyle = 'rgba(48,67,132,0.9)'; dctx.lineWidth = 0.75;
    for (let i = 1; i < 6; i++) { const y = (pxH * i) / 6 - oy; dctx.beginPath(); dctx.moveTo(0, y); dctx.lineTo(W, y); dctx.stroke(); }
    for (let i = 1; i < 12; i++) { const x = (pxW * i) / 12 - ox; dctx.beginPath(); dctx.moveTo(x, 0); dctx.lineTo(x, H); dctx.stroke(); }
    for (const s of demoStars) {
      dctx.globalAlpha = s.a; dctx.fillStyle = '#e8e2d9';
      dctx.beginPath(); dctx.arc(s.x * pxW - ox, s.y * pxH - oy, s.r, 0, Math.PI * 2); dctx.fill();
    }
    dctx.globalAlpha = 1;

    const sx = hidden.x * pxW - ox, sy = hidden.y * pxH - oy;
    const cx = W / 2, cy = H / 2;
    const distance = Math.hypot(sx - cx, sy - cy);
    const close = Math.max(0, 1 - distance / (W * 0.6));
    if (distance < 26 && !found) { found = 1; foundAt = now; }
    if (distance > 60 && found && now - foundAt > 1200) { found = 0; }

    if (found) {
      const age = (now - foundAt) / 1000;
      const halo = dctx.createRadialGradient(sx, sy, 0, sx, sy, 70);
      halo.addColorStop(0, 'rgba(255,197,61,0.35)'); halo.addColorStop(1, 'rgba(255,197,61,0)');
      dctx.fillStyle = halo; dctx.beginPath(); dctx.arc(sx, sy, 70, 0, Math.PI * 2); dctx.fill();
      for (let i = 0; i < 3; i++) {
        const p = Math.min((age - i * 0.18) / 1.4, 1);
        if (p <= 0 || p >= 1) continue;
        dctx.strokeStyle = `rgba(255,197,61,${0.8 * (1 - p)})`; dctx.lineWidth = 1.2;
        dctx.beginPath(); dctx.arc(sx, sy, 20 + p * 90, 0, Math.PI * 2); dctx.stroke();
      }
      const pulse = 1 + 0.06 * Math.sin(now / 380);
      star(dctx, sx, sy, 26 * pulse, '#ffc53d');
      star(dctx, sx, sy, 11, '#ffe7b3');
    } else if (close > 0.35) {
      star(dctx, sx, sy, 5 + 9 * close, `rgba(255,197,61,${0.3 + 0.5 * close})`);
    }

    // Reticle.
    dctx.strokeStyle = found ? '#ffc53d' : 'rgba(232,226,217,0.6)'; dctx.lineWidth = 1;
    dctx.beginPath(); dctx.arc(cx, cy, 26, 0, Math.PI * 2); dctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      dctx.beginPath(); dctx.moveTo(cx + Math.cos(a) * 32, cy + Math.sin(a) * 32);
      dctx.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); dctx.stroke();
    }

    note.classList.toggle('shown', !!found);
    hint.textContent = found ? hint.dataset.found : close > 0.55 ? hint.dataset.close : hint.dataset.idle;
    requestAnimationFrame(drawDemo);
  }
  requestAnimationFrame(drawDemo);
})();
