// ---------- Glass folder cards ----------
// Carpeta de cristal con arte generado (ruido de dominio deformado, sombreado
// como una superficie líquida). Port a JS vanilla de un componente React/TS;
// sin dependencias, pinta el arte en un <canvas> una sola vez por tarjeta.
(() => {
  // -- utilidades de color / ruido seedeado -----------------------------
  function hexToRgb(hex) {
    let h = hex.trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeFbm(seed) {
    const r = rng(seed);
    const perm = new Uint8Array(512);
    const grad = new Float32Array(512);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) {
      const a = r() * Math.PI * 2;
      grad[i * 2] = Math.cos(a);
      grad[i * 2 + 1] = Math.sin(a);
    }
    const noise = (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const X = xi & 255;
      const Y = yi & 255;
      const h00 = perm[X + perm[Y]] * 2;
      const h10 = perm[X + 1 + perm[Y]] * 2;
      const h01 = perm[X + perm[Y + 1]] * 2;
      const h11 = perm[X + 1 + perm[Y + 1]] * 2;
      const d00 = grad[h00] * xf + grad[h00 + 1] * yf;
      const d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
      const d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1);
      const d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
      const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00));
    };
    return (x, y, octaves) => {
      let sum = 0;
      let amp = 0.5;
      for (let i = 0; i < octaves; i++) {
        sum += amp * noise(x, y);
        const nx = 1.6 * x + 1.2 * y + 7.1;
        y = -1.2 * x + 1.6 * y + 3.3;
        x = nx;
        amp *= 0.5;
      }
      return sum;
    };
  }

  // Pinta la receta en un ImageData, repartido en pasos (`step`) para no
  // bloquear el hilo principal.
  function createArtJob(width, height, recipe, seed) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const colors = recipe.colors.length >= 2 ? recipe.colors : ['#111111', '#eeeeee'];
    const stops = colors.map((c, i) => ({ t: i / (colors.length - 1), c: hexToRgb(c) }));
    const scale = recipe.scale ?? 0.7;
    const warp = recipe.warp ?? 3;
    const gloss = recipe.gloss ?? 0.4;
    const veins = recipe.veins ?? 0;
    const streak = recipe.style === 'streak';
    const fbm = makeFbm(seed * 977 + 13);
    const r = rng(seed + 1);
    const ox = r() * 50;
    const oy = r() * 50;
    const angle = (recipe.angle ?? 0) + (r() - 0.5) * 0.5;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const m = Math.min(w, h);
    const gw = Math.ceil(w / 2) + 3;
    const gh = Math.ceil(h / 2) + 3;
    const G = new Float32Array(gw * gh);
    const GQ = new Float32Array(gw * gh);
    const F = new Float32Array(w * h);
    const Q = new Float32Array(w * h);
    const pixels = new Uint8ClampedArray(w * h * 4);
    let row = 0;

    const field = (gy) => {
      for (let gx = 0; gx < gw; gx++) {
        const u = ((gx - 1) * 2 - w / 2) / m;
        const v = ((gy - 1) * 2 - h / 2) / m;
        let px = (u * ca - v * sa) * scale;
        let py = (u * sa + v * ca) * scale;
        if (streak) {
          px *= 0.14;
          py *= 2.2;
        }
        px += ox;
        py += oy;
        const qx = fbm(px, py, 3);
        const qy = fbm(px + 5.2, py + 1.3, 3);
        const rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3);
        const ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3);
        G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4);
        GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
      }
    };

    const upsample = () => {
      const cr = (a, b, c, d) => (-a + 9 * b + 9 * c - d) / 16;
      const T = new Float32Array(w * gh);
      for (let gy = 0; gy < gh; gy++) {
        const r = gy * gw;
        for (let x = 0; x < w; x++) {
          const c = (x >> 1) + 1;
          T[gy * w + x] = x & 1 ? cr(G[r + c - 1], G[r + c], G[r + c + 1], G[r + c + 2]) : G[r + c];
        }
      }
      for (let y = 0; y < h; y++) {
        const c = (y >> 1) + 1;
        for (let x = 0; x < w; x++) {
          F[y * w + x] =
            y & 1 ? cr(T[(c - 1) * w + x], T[c * w + x], T[(c + 1) * w + x], T[(c + 2) * w + x]) : T[c * w + x];
          const gx = (x >> 1) + 1;
          const q0 = GQ[c * gw + gx];
          const qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0;
          const q1 = y & 1 ? (x & 1 ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2 : GQ[(c + 1) * gw + gx]) : qx;
          Q[y * w + x] = (qx + q1) / 2;
        }
      }
    };

    const colorize = () => {
      const sample = [];
      const stride = Math.max(1, Math.floor(F.length / 4096));
      for (let i = 0; i < F.length; i += stride) sample.push(F[i]);
      sample.sort((a, b) => a - b);
      const lo = sample[Math.floor(sample.length * 0.02)];
      const hi = sample[Math.floor(sample.length * 0.98)];
      const k = 1 / (hi - lo || 1);
      const lx = -0.55;
      const ly = -0.65;
      const lz = 0.52;
      const slope = k * m * 0.012;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          let t = (F[i] - lo) * k;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          let j = 1;
          while (j < stops.length - 1 && stops[j].t < t) j++;
          const a = stops[j - 1];
          const b = stops[j];
          let f = (t - a.t) / (b.t - a.t || 1);
          f = f < 0 ? 0 : f > 1 ? 1 : f;
          f = f * f * (3 - 2 * f);
          const gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope;
          const gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope;
          const nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
          const spec = Math.pow(nd > 0 ? nd : 0, 24) * gloss * 255;
          const silk = 1 + 0.035 * Math.sin(t * 150 + Q[i] * 24);
          const vein = veins * Math.max(0, 1 - Math.abs(Q[i] - 0.42) * 14) * 0.6;
          const lit = (0.82 + 0.28 * nd) * silk * (1 - vein);
          pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * lit + spec;
          pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * lit + spec;
          pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * lit + spec;
          pixels[i * 4 + 3] = 255;
        }
      }
    };

    return {
      width: w,
      height: h,
      pixels,
      step(rows) {
        if (row >= gh) return true;
        const end = Math.min(gh, row + Math.max(1, rows));
        while (row < end) field(row++);
        if (row < gh) return false;
        upsample();
        colorize();
        return true;
      },
    };
  }

  // -- un único repartidor de pintura para toda la página -----------------
  const artCache = new Map();
  const queue = [];
  let pumping = false;

  function pump() {
    if (pumping) return;
    pumping = true;
    const tick = () => {
      const until = performance.now() + 7;
      while (queue.length && performance.now() < until) {
        const head = queue[0];
        if (head.job.step(4)) {
          queue.shift();
          const c = document.createElement('canvas');
          c.width = head.job.width;
          c.height = head.job.height;
          c.getContext('2d')?.putImageData(new ImageData(head.job.pixels, c.width, c.height), 0, 0);
          head.done(c);
        }
      }
      if (queue.length) requestAnimationFrame(tick);
      else pumping = false;
    };
    requestAnimationFrame(tick);
  }

  function paint(recipe, seed, w, h, priority) {
    const key = JSON.stringify([recipe, seed, w, h]);
    let p = artCache.get(key);
    if (!p) {
      p = new Promise((done) => {
        let at = queue.length;
        while (at > 1 && queue[at - 1].priority > priority) at--;
        queue.splice(at, 0, { job: createArtJob(w, h, recipe, seed), priority, done });
        pump();
      });
      artCache.set(key, p);
    }
    return p;
  }

  function mountArtCanvas(container, recipe, seed, w, h, density, priority, className) {
    const canvas = document.createElement('canvas');
    canvas.className = className;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.maxWidth = 'none';
    container.appendChild(canvas);
    const pw = Math.round(w * density);
    const ph = Math.round(h * density);
    paint(recipe, seed, pw, ph, priority).then((src) => {
      canvas.width = src.width;
      canvas.height = src.height;
      canvas.getContext('2d')?.drawImage(src, 0, 0);
      canvas.setAttribute('data-ready', '');
    });
  }

  // Recetas en los colores de marca de AIREN LABS (sin imágenes externas).
  const ART_PRESETS = {
    primary: { style: 'marble', colors: ['#0d0714', '#2a0f22', '#EE3DB4', '#160a12', '#ff7fd1', '#ffe1f2'], scale: 0.68, warp: 3.1, angle: -0.5, gloss: 0.5, veins: 0.45 },
    accent: { style: 'marble', colors: ['#0d0714', '#241037', '#A12EDB', '#140a1c', '#c77aee', '#f1dcff'], scale: 0.72, warp: 3.4, angle: 1.9, gloss: 0.5, veins: 0.5 },
    secondary: { style: 'streak', colors: ['#0d0714', '#121a3a', '#3333CC', '#0a0e22', '#8686FF', '#dde0ff'], scale: 0.7, warp: 1.6, angle: 0.4, gloss: 0.3, veins: 0 },
  };

  // -- geometría de la carpeta (idéntica al original, a 340×272) ----------
  const W = 340, H = 272, HEADROOM = 54, FRONT_H = 272 - 74, SHEET_W = 272, SHEET_H = 184;
  const BACK_PATH =
    'M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z';
  const FRONT_PATH =
    'M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ' +
    (FRONT_H - 22) + 'A22 22 0 0 1 318 ' + FRONT_H + 'L22 ' + FRONT_H + 'A22 22 0 0 1 0 ' + (FRONT_H - 22) + 'Z';

  let uidCounter = 0;

  /**
   * Crea una carpeta de cristal dentro de `mount` y la devuelve.
   * opts: { label, meta, tone, art, seed, file:{name,meta,onSelect}, labelPlacement, width, appearDelay }
   */
  function createGlassFolder(mount, opts) {
    const {
      label = '',
      meta = '',
      tone = 'dark',
      art = 'primary',
      seed = 1,
      file = null,
      labelPlacement = 'bottom-left',
      width = 300,
      appear = true,
      appearDelay = 0,
    } = opts;

    const uid = 'gf' + uidCounter++;
    const k = width / W;
    const recipe = typeof art === 'string' ? ART_PRESETS[art] : art;
    const density = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1)) * k;

    const root = document.createElement('div');
    root.className = 'gf-root';
    root.dataset.tone = tone;
    root.dataset.place = labelPlacement;
    root.style.width = width + 'px';
    root.style.height = (H + HEADROOM) * k + 'px';

    root.innerHTML = `
      <div class="gf-stage" style="transform:translateY(${HEADROOM * k}px) scale(${k})">
        <div class="gf-tilt">
          <div class="gf-shadow" aria-hidden="true"></div>
          <div class="gf-back" aria-hidden="true" style="clip-path:path('${BACK_PATH}')">
            <div class="gf-art-mount"></div>
            <div class="gf-back-sheen"></div>
          </div>
          <svg class="gf-rim gf-back-rim" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${BACK_PATH}"/></svg>
          <div class="gf-files" role="list">
            <button type="button" class="gf-sheet">
              <div class="gf-sheet-art-mount"></div>
              <span class="gf-sheet-head">
                <span class="gf-sheet-name"></span>
                <span class="gf-sheet-meta"></span>
              </span>
            </button>
          </div>
          <div class="gf-front" style="clip-path:path('${FRONT_PATH}')">
            <div class="gf-tint" aria-hidden="true"></div>
            <div class="gf-spec" aria-hidden="true"></div>
            <svg class="gf-rim gf-front-rim" viewBox="0 0 ${W} ${FRONT_H}" aria-hidden="true">
              <defs>
                <linearGradient id="gf-rim-${uid}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#fff" stop-opacity="0.95"/>
                  <stop offset="0.35" stop-color="#fff" stop-opacity="0.35"/>
                  <stop offset="1" stop-color="#fff" stop-opacity="0.12"/>
                </linearGradient>
              </defs>
              <path d="${FRONT_PATH}" stroke="url(#gf-rim-${uid})"/>
            </svg>
            <button type="button" class="gf-hit" aria-expanded="false"></button>
            <div class="gf-label">
              <span class="gf-title"></span>
              <span class="gf-meta"></span>
            </div>
          </div>
        </div>
      </div>
    `;

    root.querySelector('.gf-title').textContent = label;
    root.querySelector('.gf-meta').textContent = meta;

    const hit = root.querySelector('.gf-hit');
    const files = root.querySelector('.gf-files');
    const sheet = root.querySelector('.gf-sheet');

    mountArtCanvas(root.querySelector('.gf-art-mount'), recipe, seed, W + 24, H + 24, density, 0, 'gf-art');

    if (file) {
      root.querySelector('.gf-sheet-name').textContent = file.name || '';
      root.querySelector('.gf-sheet-meta').textContent = file.meta || '';
      mountArtCanvas(root.querySelector('.gf-sheet-art-mount'), recipe, (seed || 1) + 97, SHEET_W, SHEET_H, Math.min(density, 1.25), 1, 'gf-sheet-art');
      sheet.setAttribute('aria-label', file.name || '');
      if (file.onSelect) sheet.addEventListener('click', () => file.onSelect(file));
    } else {
      sheet.remove();
    }

    files.toggleAttribute('inert', true);

    function setOpen(next) {
      root.toggleAttribute('data-open', next);
      hit.setAttribute('aria-expanded', String(next));
      hit.setAttribute(
        'aria-label',
        (next ? 'Cerrar ' : 'Abrir ') + label + (meta ? ', ' + meta : ''),
      );
      files.toggleAttribute('inert', !next);
    }
    setOpen(false);

    hit.addEventListener('click', () => setOpen(!root.hasAttribute('data-open')));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.hasAttribute('data-open')) {
        setOpen(false);
        hit.focus();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (root.hasAttribute('data-open') && !root.contains(e.target)) setOpen(false);
    });

    mount.appendChild(root);

    if (appear) {
      if (typeof IntersectionObserver === 'undefined') {
        root.toggleAttribute('data-entered', true);
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            if (!entries.some((e) => e.isIntersecting)) return;
            io.disconnect();
            setTimeout(() => root.toggleAttribute('data-entered', true), appearDelay);
          },
          { threshold: 0.25 },
        );
        io.observe(root);
      }
    } else {
      root.toggleAttribute('data-entered', true);
    }

    return { root, setOpen };
  }

  window.GlassFolder = { create: createGlassFolder, presets: ART_PRESETS };
})();
