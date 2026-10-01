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

// ---------- Hero: constellation trail from "Labs" to the logo's ring ----------
(() => {
  const hero = document.getElementById('hero');
  const anchor = document.getElementById('heroLineAnchor');
  const ring = document.querySelector('.hero__logo-ring');
  const path = document.getElementById('heroLinkPath');
  const starsGroup = document.getElementById('heroLinkStars');
  if (!hero || !anchor || !ring || !path || !starsGroup) return;

  function pointOnCurve(t, x1, y1, cx, cy, x2, y2) {
    const mt = 1 - t;
    return {
      x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
      y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
    };
  }

  function layout() {
    const heroRect = hero.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const r = ring.getBoundingClientRect();

    const x1 = a.left - heroRect.left;
    const y1 = a.top + a.height * 0.2 - heroRect.top;
    const centerX = r.left + r.width / 2 - heroRect.left;
    const centerY = r.top + r.height / 2 - heroRect.top;
    const radius = r.width / 2;

    // full curve toward the ring's centre, then pulled back (via De Casteljau
    // subdivision) to stop right where it first crosses the ring's edge
    const cx = x1 + (centerX - x1) * 0.7;
    const cy = y1 + (centerY - y1) * 0.15;

    let tHit = 1;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const p = pointOnCurve(t, x1, y1, cx, cy, centerX, centerY);
      if (Math.hypot(p.x - centerX, p.y - centerY) <= radius) {
        tHit = t;
        break;
      }
    }

    const q0x = x1 + (cx - x1) * tHit;
    const q0y = y1 + (cy - y1) * tHit;
    const end = pointOnCurve(tHit, x1, y1, cx, cy, centerX, centerY);

    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${q0x.toFixed(1)} ${q0y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    path.setAttribute('d', d);

    starsGroup.innerHTML = '';
    const stops = [0.14, 0.32, 0.5, 0.68, 0.86];
    stops.forEach((t, i) => {
      const p = pointOnCurve(t * tHit, x1, y1, cx, cy, centerX, centerY);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', p.x.toFixed(1));
      dot.setAttribute('cy', p.y.toFixed(1));
      dot.setAttribute('r', i % 2 === 0 ? 1.7 : 1.1);
      dot.style.animationDelay = (i * 0.45).toFixed(2) + 's';
      starsGroup.appendChild(dot);
    });
  }

  layout();
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layout);
  }
})();
