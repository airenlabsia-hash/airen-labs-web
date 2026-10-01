const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// ---------- Animated star / neural network background ----------
(() => {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = ['rgba(250,250,250,', 'rgba(238,61,180,', 'rgba(161,46,219,', 'rgba(134,134,255,'];
  let particles = [];
  let width, height, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.round((width * height) / 16000);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.6,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.8,
    }));
  }

  function step(t) {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
    }

    const linkDist = 120;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDist) {
          ctx.strokeStyle = `rgba(238,61,180,${(1 - dist / linkDist) * 0.12})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 * p.speed + p.phase);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + (0.25 + twinkle * 0.55) + ')';
      ctx.fill();
    }

    if (!reduceMotion) requestAnimationFrame(step);
  }

  resize();
  window.addEventListener('resize', resize);
  if (reduceMotion) {
    step(0);
  } else {
    requestAnimationFrame(step);
  }
})();

// ---------- Hero: light spark travelling from "Lab|s" to the logo ----------
(() => {
  const hero = document.getElementById('hero');
  const anchor = document.getElementById('heroSparkAnchor');
  const logo = document.getElementById('heroLogo');
  const spark = document.getElementById('heroSpark');
  const linkPath = document.getElementById('heroLinkPath');
  if (!hero || !anchor || !logo || !spark || !linkPath) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  function layout() {
    const heroRect = hero.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const l = logo.getBoundingClientRect();

    const x1 = a.left + a.width / 2 - heroRect.left;
    const y1 = a.top + a.height * 0.15 - heroRect.top;
    const x2 = l.left + l.width * 0.52 - heroRect.left;
    const y2 = l.top + l.height * 0.4 - heroRect.top;

    const cx = x1 + (x2 - x1) * 0.7;
    const cy = y1 + (y2 - y1) * 0.15;

    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    linkPath.setAttribute('d', d);
    spark.style.setProperty('--spark-path', `"${d}"`);
  }

  layout();
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layout);
  }
})();
