/* Escenas del video. Todo depende del tiempo t (segundos): renderFrame(t) deja el cuadro listo para capturar.
 * Los tiempos salen de timeline.js (generado por tts.py), así las animaciones quedan sincronizadas con la voz.
 */
(function () {
  const TL = window.TIMELINE, KV = window.KonekViz, D = window.KONEK_DATA;
  const stage = document.getElementById("stage");

  // ---------- tiempo ----------
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const easeIO = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const ramp = (t, a, d = 0.4) => easeOut((t - a) / d);
  const rampIO = (t, a, d = 0.6) => easeIO((t - a) / d);
  const env = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(ramp(t, a, fi), 1 - clamp01((t - (b - fo)) / fo));
  const L = (id) => { const it = TL.items[id]; if (!it) throw new Error("no existe " + id); return it; };
  const S = (id) => L(id).start;
  const E = (id) => L(id).end;
  // momento estimado en que se dice `frase` dentro de la línea `id`
  function W(id, frase) {
    const it = L(id), i = it.text.indexOf(frase);
    if (i < 0) throw new Error(`"${frase}" no está en ${id}`);
    return it.start + (it.end - it.start) * (i / it.text.length);
  }
  const DUR = TL.duracion;

  // ---------- DOM ----------
  function mk(html, parent = stage) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    const el = d.firstElementChild;
    parent.appendChild(el);
    return el;
  }
  function sty(el, { o, x = 0, y = 0, s = 1, r = 0, blur } = {}) {
    if (!el) return;
    if (o !== undefined) {
      el.style.opacity = o;
      el.style.visibility = o <= 0.001 ? "hidden" : "visible";
    }
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})` + (r ? ` rotate(${r}deg)` : "");
    if (blur !== undefined) el.style.filter = blur > 0.05 ? `blur(${blur}px)` : "none";
  }
  // aparece (sube y se desvanece) a partir de a
  const pop = (el, t, a, { d = 0.45, dy = 26, ds = 0, until = Infinity, fo = 0.3 } = {}) => {
    const p = ramp(t, a, d), q = until === Infinity ? 1 : 1 - clamp01((t - until) / fo);
    sty(el, { o: Math.min(p, q), y: (1 - p) * dy, s: 1 - (1 - p) * ds });
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // ---------- capas globales ----------
  const bg = mk(`<div class="layer bgfx"><div class="blob b1"></div><div class="blob b2"></div><div class="grid"></div></div>`);
  const LOGO_SVG = (id) => `<svg viewBox="0 0 120 120" fill="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
    <g stroke="url(#${id})" stroke-width="10" stroke-linecap="round"><path class="lg-p" d="M34 18 V102"/><path class="lg-p" d="M34 62 L90 22"/><path class="lg-p" d="M52 50 L90 98"/></g>
    <g fill="url(#${id})"><circle class="lg-n" cx="34" cy="18" r="10"/><circle class="lg-n" cx="34" cy="102" r="10"/><circle class="lg-n" cx="90" cy="22" r="10"/><circle class="lg-n" cx="90" cy="98" r="10"/><circle class="lg-n" cx="34" cy="62" r="8"/></g></svg>`;
  const wm = mk(`<div id="wm">${LOGO_SVG("wmg")}<span>Konek</span></div>`);
  const chapter = mk(`<div id="chapter"><span class="num"></span><span class="name"></span></div>`);
  const cursor = mk(`<svg id="cursor" viewBox="0 0 32 32"><path d="M6 3 L6 25 L11.5 19.8 L15.4 28.6 L19.4 26.8 L15.6 18.2 L23 18 Z" fill="#fff" stroke="#0b1222" stroke-width="2" stroke-linejoin="round"/></svg>`);
  const ripple = mk(`<div id="ripple"></div>`);
  let cur = null; // {x, y, click}

  const scenes = [];
  function scene(name, from, to, html, render, { fi = 0.35, fo = 0.35 } = {}) {
    const el = mk(`<div class="scene" data-scene="${name}">${html}</div>`);
    const sc = { name, from, to, el, render, fi, fo, vis: false, $: (q) => el.querySelector(q), $$: (q) => [...el.querySelectorAll(q)] };
    scenes.push(sc);
    return sc;
  }

  // ---------- cámara sobre un "mundo" (ventana con dashboard) ----------
  function measure(world, el) {
    const wr = world.getBoundingClientRect(), k = wr.width / world.offsetWidth, r = el.getBoundingClientRect();
    return { x: (r.left - wr.left) / k, y: (r.top - wr.top) / k, w: r.width / k, h: r.height / k };
  }
  const grow = (r, p) => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });
  function fit(r) {
    const s = Math.min(1920 / r.w, 1080 / r.h, 1.9);
    return { s, tx: (1920 - r.w * s) / 2 - r.x * s, ty: (1080 - r.h * s) / 2 - r.y * s };
  }
  // keys: [{t, r: () => rect, d}] -> transform interpolado
  // evita mostrar vacío fuera del mundo (ventana de 1600x944) cuando el zoom lo cubre
  function clampCam(c, W = 1600, H = 944) {
    const cl = (v, ext, view) => (ext * c.s >= view ? Math.min(0, Math.max(view - ext * c.s, v)) : (view - ext * c.s) / 2);
    return { s: c.s, tx: cl(c.tx, W, 1920), ty: cl(c.ty, H, 1080) };
  }
  function camera(t, keys) {
    return clampCam(camera0(t, keys));
  }
  function camera0(t, keys) {
    let i = 0;
    while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
    const k = keys[i], rk = k.r();
    if (i === 0) return fit(rk);
    const prev = keys[i - 1].r(), p = easeIO((t - k.t) / (k.d || 1.1));
    // interpolar en escala logarítmica para que el zoom se sienta parejo
    const a = fit(prev), b = fit(rk);
    const s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), p));
    const cxA = prev.x + prev.w / 2, cyA = prev.y + prev.h / 2, cxB = rk.x + rk.w / 2, cyB = rk.y + rk.h / 2;
    const cx = lerp(cxA, cxB, p), cy = lerp(cyA, cyB, p);
    return { s, tx: 960 - cx * s, ty: 540 - cy * s };
  }
  // escala una transformación alrededor del centro de la pantalla
  const zoomAbout = (c, k) => ({ s: c.s * k, tx: k * c.tx + 960 * (1 - k), ty: k * c.ty + 540 * (1 - k) });
  const applyCam = (el, c) => (el.style.transform = `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`);
  const toStage = (c, x, y) => ({ x: x * c.s + c.tx, y: y * c.s + c.ty });
  // recorrido del cursor: puntos [{t, p: () => {x,y} (coords del mundo)}]
  function path(t, pts, d = 0.7) {
    let i = 0;
    while (i + 1 < pts.length && pts[i + 1].t <= t) i++;
    const a = pts[i].p();
    if (i === 0 || t >= pts[i].t + d) return a;
    const b = pts[i - 1].p(), q = easeIO((t - pts[i].t) / d);
    return { x: lerp(b.x, a.x, q), y: lerp(b.y, a.y, q) };
  }
  const centerOf = (r, dx = 0, dy = 0) => ({ x: r.x + r.w / 2 + dx, y: r.y + r.h / 2 + dy });

  // estado de dashboards: solo re-renderizar si cambió
  function dset(dash, patch) {
    let changed = false;
    for (const k in patch) if (dash.st[k] !== patch[k]) changed = true;
    if (changed || dash.dirty) dash.setState(patch);
  }

  // ---------- piezas ----------
  const WIN = (title, inner, cls = "") => `<div class="win ${cls}" style="width:1600px;height:944px"><div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span class="ttl">${title}</span></div><div class="win-body" style="position:relative;width:1600px;height:900px">${inner}</div></div>`;
  const filas = D.filas;
  const fmtN = (v) => v.toLocaleString("en-US", { minimumFractionDigits: 2 });
  function sheetHTML(nRows) {
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
    let h = `<table><tr><th></th>${cols.map((c) => `<th data-col="${c}">${c}</th>`).join("")}</tr>`;
    h += `<tr class="hdr"><td class="rn">1</td><td>Año</td><td>Mes</td><td>Periodo</td><td>Área</td><td>Categoría</td><td>Centro de costo</td><td>Moneda</td><td>Importe</td>${'<td style="background:#fff"></td>'.repeat(5)}</tr>`;
    for (let i = 0; i < nRows; i++) {
      const f = filas[i];
      h += `<tr><td class="rn">${i + 2}</td><td class="n">${f.anio}</td><td>${f.mes}</td><td>${f.periodo}</td><td>${f.area}</td><td>${f.categoria}</td><td>${f.centro}</td><td>PEN</td><td class="n">${fmtN(f.importe)}</td>${"<td></td>".repeat(5)}</tr>`;
    }
    return h + `</table>`;
  }
  const SHEET = (w, h, n) => `<div class="sheet" style="width:${w}px;height:${h}px">
      <div class="s-title"><span class="ico">X</span> gastos_sep2025_vs_sep2026.xlsx <span style="margin-left:auto;color:#6b7280">Exportación ERP</span></div>
      <div class="s-tabs"><span><b style="color:#111827">Inicio</b></span><span>Insertar</span><span>Fórmulas</span><span>Datos</span><span>Revisar</span><span>Vista</span></div>
      <div class="s-fx"><span class="ref">H2</span><span class="fx">fx</span><span>520340</span></div>
      <div class="s-grid" style="position:relative;overflow:hidden;height:${h - 46 - 41 - 38}px"><div class="s-scroll">${sheetHTML(n)}</div></div></div>`;
  const CHAT = (w, h) => `<div class="chat" style="width:${w}px;height:${h}px">
      <div class="c-top"><span><b>Claude</b> · Análisis de gastos</span><span style="font-size:15px;color:#5d6a86">Interfaz recreada para el video</span></div>
      <div class="c-body"></div></div>`;
  const FILE_CHIP = `<span class="file-chip"><span class="x">X</span>gastos_sep2025_vs_sep2026.xlsx</span>`;
  const icon = {
    db: `<svg viewBox="0 0 48 48" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3"><ellipse cx="24" cy="11" rx="15" ry="6"/><path d="M9 11v26c0 3.3 6.7 6 15 6s15-2.7 15-6V11"/><path d="M9 24c0 3.3 6.7 6 15 6s15-2.7 15-6"/></svg>`,
    grid: `<svg viewBox="0 0 48 48" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3"><rect x="7" y="8" width="34" height="32" rx="4"/><path d="M7 18h34M7 29h34M19 8v32M30 8v32"/></svg>`,
    pivot: `<svg viewBox="0 0 48 48" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3"><rect x="7" y="8" width="34" height="32" rx="4"/><path d="M7 17h34M17 8v32"/><path d="M24 26h10M24 33h10" stroke-dasharray="3 3"/></svg>`,
    slides: `<svg viewBox="0 0 48 48" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3"><rect x="6" y="9" width="36" height="25" rx="3"/><path d="M24 34v7M16 41h16"/><path d="M13 27l6-7 5 4 9-9"/></svg>`,
    ask: `<svg viewBox="0 0 48 48" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3"><path d="M8 10h32v22H22l-9 7v-7H8z" stroke-linejoin="round"/><path d="M20 17c0-2.5 2-4 4-4s4 1.5 4 3.5c0 3-4 3-4 6M24 27v.5"/></svg>`,
    loop: `<svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="M38 20a15 15 0 0 0-27-5M10 28a15 15 0 0 0 27 5"/><path d="M11 7v8h8M37 41v-8h-8"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>`,
    save: `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z" stroke-linejoin="round"/></svg>`,
    down: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 4v15M5 13l7 7 7-7"/></svg>`,
  };

  // =====================================================================
  // 1) HOOK
  // =====================================================================
  {
    const sc = scene("hook", 0, S("logo") + 0.2, `
      <div class="abs hk-dash" style="left:0;top:0;width:1600px;height:900px;transform-origin:0 0"></div>
      <div class="abs hk-sheetwrap" style="left:0;top:0;width:1920px;height:1080px"><div class="abs hk-sheet" style="left:110px;top:70px">${SHEET(1700, 940, 26)}</div></div>
      <div class="abs hk-wipe" style="left:0;top:0;width:6px;height:1080px;background:#22d3ee;box-shadow:0 0 40px 12px #22d3ee99"></div>
      <div class="abs hk-dim" style="inset:0;background:#050912"></div>
      <div class="abs hk-nos" style="left:140px;top:300px;display:flex;flex-direction:column;gap:26px">
        <div class="chip n1"><span class="xmark">✕</span>Sin Power BI</div>
        <div class="chip n2"><span class="xmark">✕</span>Sin programar una línea</div>
        <div class="chip n3"><span class="xmark">✕</span>Sin PowerPoint a las 11 p.m.</div>
      </div>
      <div class="center hk-t1"><div class="h-l">No es el dashboard.</div></div>
      <div class="center hk-t2" style="gap:44px">
        <div class="h-l" style="text-align:center">Es el <span class="grad">prompt de 2 pasos</span></div>
        <div style="display:flex;gap:34px">
          <div class="card s1" style="padding:30px 36px;width:560px"><div class="cyan" style="font-weight:800;font-size:24px;letter-spacing:.1em">PASO 1</div><div class="h-s" style="margin-top:8px">El prompt rápido</div><div class="txt" style="font-size:24px;margin-top:8px">Le pides lo que quieres ver</div></div>
          <div class="card s2" style="padding:30px 36px;width:640px;border-color:#22d3ee66;box-shadow:0 0 40px #22d3ee22"><div class="cyan" style="font-weight:800;font-size:24px;letter-spacing:.1em">PASO 2</div><div class="h-s" style="margin-top:8px">El prompt que piensa antes de diseñar</div><div class="txt" style="font-size:24px;margin-top:8px">Analiza → propone → construye</div></div>
        </div>
        <div class="hk-uses" style="display:flex;gap:18px">
          <span class="chip u1">Ventas</span><span class="chip u2">Gastos</span><span class="chip u3">Inventario</span><span class="chip u4">Lo que tengas</span>
        </div>
      </div>
      <div class="center hk-t4" style="flex-direction:row;gap:40px">
        <div class="card v1" style="padding:44px 48px;width:620px;text-align:center"><span class="xmark" style="width:64px;height:64px;font-size:36px">✕</span><div class="h-m" style="margin-top:22px;color:var(--ink-2)">Un gráfico bonito</div></div>
        <div class="card v2" style="padding:44px 48px;width:720px;text-align:center;border-color:#22d3ee88;box-shadow:0 0 60px #22d3ee33"><span class="vmark" style="width:64px;height:64px;font-size:36px">✓</span><div class="h-m" style="margin-top:22px">Una herramienta que tu gerente <span class="grad">realmente usa</span></div></div>
      </div>`,
      render);
    const dash = KV.createDashboard(2, sc.$(".hk-dash"));
    const box = dash.box;
    const kpiGlow = document.createElement("style");
    kpiGlow.textContent = `.hk-dash .kd-kpi .val{ text-shadow: 0 0 calc(var(--g,1) * 22px) #22d3eecc; }`;
    document.head.appendChild(kpiGlow);
    const hotKey = "hm:Operaciones:Alquiler";
    function render(t) {
      const tCut = S("h1b"), tBack = S("h2a");
      const showDash = t < tCut || t >= tBack;
      const hd = sc.$(".hk-dash");
      hd.style.display = showDash ? "block" : "none";
      sc.$(".hk-sheetwrap").style.display = t >= tCut && t < tBack + 0.9 ? "block" : "none";
      // brillo de KPIs
      hd.style.setProperty("--g", (0.65 + 0.35 * Math.sin(t * 3.2)).toFixed(3));
      // cámara del dashboard (pantalla completa = escala 1.2)
      let cam;
      if (t < tCut) {
        const p = easeIO(t / Math.max(0.1, tCut));
        cam = { s: lerp(1.2, 1.32, p), tx: lerp(0, -60, p), ty: lerp(0, -108, p) };
      } else {
        const p = easeIO((t - tBack) / 9);
        cam = { s: lerp(1.2, 1.26, p), tx: lerp(0, -40, p), ty: lerp(0, -40, p) };
      }
      applyCam(hd, cam);
      if (showDash) {
        const prog = t < tCut ? 1 : ramp(t, tBack + 0.1, 1.6);
        const hov = t < tCut ? (t > 0.75 ? hotKey : null) : null;
        dset(dash, { progress: prog, hover: hov });
      }
      // cursor sobre el mapa de calor
      if (t < tCut) {
        const cell = box.querySelector(`[data-tip="${hotKey}"]`);
        if (cell) {
          const r = measure(hd, cell), target = toStage(cam, r.x + r.w * 0.55, r.y + r.h * 0.6);
          const p = easeIO((t - 0.05) / 0.75);
          cur = { x: lerp(1500, target.x, p), y: lerp(330, target.y, p) };
        }
      }
      // corte a Excel y barrido de regreso
      const sw = sc.$(".hk-sheet");
      const ps = clamp01((t - tCut) / 6);
      sty(sw, { o: 1, s: 1 + 0.03 * ps });
      sw.style.filter = "grayscale(1) brightness(0.92)";
      const wipe = clamp01((t - tBack) / 0.85);
      const sww = sc.$(".hk-sheetwrap");
      sww.style.clipPath = t >= tBack ? `inset(0 0 0 ${easeIO(wipe) * 100}%)` : "none";
      sty(sc.$(".hk-wipe"), { o: t >= tBack && wipe < 1 ? 1 : 0, x: easeIO(wipe) * 1920 });
      // "sin..." sobre el dashboard
      const dim = Math.max(0.55 * ramp(t, S("h2b") - 0.2, 0.5), 0.8 * ramp(t, S("h3a") - 0.1, 0.5));
      sty(sc.$(".hk-dim"), { o: dim });
      hd.style.filter = t > S("h3a") - 0.1 ? `blur(${6 * ramp(t, S("h3a") - 0.1, 0.6)}px)` : "none";
      const endNos = S("h3a") - 0.15;
      pop(sc.$(".n1"), t, W("h2b", "Power BI") - 0.25, { until: endNos });
      pop(sc.$(".n2"), t, W("h2b", "programar") - 0.15, { until: endNos });
      pop(sc.$(".n3"), t, W("h2b", "PowerPoint") - 0.15, { until: endNos });
      pop(sc.$(".hk-t1"), t, S("h3a"), { until: S("h3b") - 0.05, dy: 30 });
      const t2end = S("h3d") - 0.05;
      pop(sc.$(".hk-t2 .h-l"), t, S("h3b"), { until: t2end });
      pop(sc.$(".hk-t2 .s1"), t, W("h3b", "dos pasos") + 0.1, { until: t2end });
      pop(sc.$(".hk-t2 .s2"), t, W("h3b", "dos pasos") + 0.45, { until: t2end });
      ["u1", "u2", "u3", "u4"].forEach((u, i) => pop(sc.$("." + u), t, W("h3c", ["ventas", "gastos", "inventario", "lo que tengas"][i]) - 0.1, { until: t2end, ds: 0.1 }));
      sty(sc.$(".hk-t2"), { o: t >= S("h3b") - 0.1 && t < t2end + 0.4 ? 1 : 0 });
      pop(sc.$(".hk-t4 .v1"), t, W("h3d", "un gráfico bonito") - 0.1, { dy: 40 });
      pop(sc.$(".hk-t4 .v2"), t, W("h3d", "una herramienta") - 0.1, { dy: 40 });
      sty(sc.$(".hk-t4"), { o: t >= S("h3d") - 0.2 ? 1 : 0 });
    }
  }

  // =====================================================================
  // 2) LOGO
  // =====================================================================
  {
    const a = S("logo"), b = E("logo");
    const sc = scene("logo", a, b + 0.3, `
      <div class="center" style="gap:26px">
        <div class="lg-mark" style="width:210px;height:210px;filter:drop-shadow(0 0 30px #22d3ee66)">${LOGO_SVG("lgg")}</div>
        <div class="lg-word h-xl" style="font-size:120px">Konek</div>
        <div class="lg-tag" style="font-size:30px;letter-spacing:.32em;color:var(--ink-2);font-weight:600">FINANZAS &amp; IA</div>
      </div>`, render, { fi: 0.25, fo: 0.35 });
    const paths = sc.$$(".lg-p"), nodes = sc.$$(".lg-n");
    paths.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.dataset.l = l; });
    function render(t) {
      paths.forEach((p, i) => (p.style.strokeDashoffset = p.dataset.l * (1 - ramp(t, a + 0.1 + i * 0.15, 0.5))));
      nodes.forEach((n, i) => { const q = ramp(t, a + 0.25 + i * 0.08, 0.3); n.style.opacity = q; n.style.transformOrigin = "center"; n.style.transformBox = "fill-box"; n.style.transform = `scale(${0.4 + 0.6 * q})`; });
      pop(sc.$(".lg-word"), t, a + 0.5, { dy: 20 });
      pop(sc.$(".lg-tag"), t, a + 0.8, { dy: 14 });
      sty(sc.$(".lg-mark"), { o: 1, s: 1 + 0.04 * clamp01((t - a) / (b - a)) });
    }
  }

  // =====================================================================
  // 3) PROBLEMA
  // =====================================================================
  {
    const a = S("p1a") - 0.3, b = S("d1a") - 0.2;
    const node = (cls, ic, txt, color = "var(--ink)") => `<div class="card ${cls}" style="width:290px;height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:${color};text-align:center;padding:20px"><div>${ic}</div><div style="font-size:27px;font-weight:700;line-height:1.2">${txt}</div></div>`;
    const arrow = (cls) => `<div class="${cls}" style="font-size:40px;color:var(--muted);width:40px;text-align:center">→</div>`;
    // dashboard genérico "hazme un dashboard"
    const generic = (() => {
      const cc = {};
      filas.forEach((f) => (cc[f.centro] = (cc[f.centro] || 0) + f.importe));
      const vals = Object.values(cc), tot = vals.reduce((x, y) => x + y, 0);
      const rainbow = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4"];
      let ang = -Math.PI / 2, pie = "";
      vals.forEach((v, i) => {
        const a1 = ang + (v / tot) * Math.PI * 2;
        const P = (q) => `${150 + 120 * Math.cos(q)},${150 + 120 * Math.sin(q)}`;
        pie += `<path d="M150,150 L${P(ang)} A120,120 0 ${a1 - ang > Math.PI ? 1 : 0} 1 ${P(a1)} Z" fill="${rainbow[i]}" stroke="#fff" stroke-width="2"/>`;
        ang = a1;
      });
      let bars = "";
      const mx = Math.max(...filas.map((f) => f.importe));
      filas.forEach((f, i) => { const h = (f.importe / mx) * 230; bars += `<rect x="${10 + i * 9.6}" y="${250 - h}" width="7" height="${h}" fill="#4472c4"/>`; });
      const prom = filas.reduce((x, f) => x + f.importe, 0) / filas.length;
      const sumAnio = filas.reduce((x, f) => x + f.anio, 0);
      const kp = (l, v) => `<div style="flex:1;background:#fff;border:1px solid #ddd;padding:14px 18px"><div style="font-size:17px;color:#666">${l}</div><div style="font-size:34px;font-weight:700;color:#222;margin-top:4px">${v}</div></div>`;
      return `<div class="pb-gen abs" style="left:300px;top:250px;width:1320px;height:700px;background:#f2f2f2;border-radius:10px;padding:26px 30px;font-family:Arial, sans-serif;color:#222;box-shadow:0 40px 120px #000c">
        <div style="font-size:34px;font-weight:700">Dashboard</div>
        <div class="pb-kpis" style="display:flex;gap:16px;margin-top:16px">${kp("Total de registros", "60")}${kp("Promedio de Importe", Math.round(prom).toLocaleString("en-US"))}${kp("Suma de Año", sumAnio.toLocaleString("en-US"))}</div>
        <div style="display:flex;gap:20px;margin-top:20px">
          <div style="background:#fff;border:1px solid #ddd;padding:12px 16px;width:420px"><div style="font-size:18px">Importe por Centro de costo</div><svg width="300" height="300" style="display:block;margin:10px auto 0">${pie}</svg></div>
          <div class="pb-bars" style="background:#fff;border:1px solid #ddd;padding:12px 16px;flex:1"><div style="font-size:18px">Importe por fila</div><svg width="600" height="270" style="margin-top:30px">${bars}<line x1="0" x2="600" y1="250" y2="250" stroke="#999"/></svg></div>
        </div></div>`;
    })();
    const ann = (cls, txt, css) => `<div class="abs ${cls}" style="${css};display:flex;align-items:center;gap:12px;background:#2a0d12;border:2px solid #ff6b6b;color:#ffd0d0;font-size:28px;font-weight:700;padding:12px 20px;border-radius:14px;box-shadow:0 10px 40px #000a"><span class="xmark">✕</span>${txt}</div>`;
    const sc = scene("problema", a, b, `
      <div class="abs pb-clock card" style="right:80px;top:70px;padding:18px 28px;display:flex;align-items:center;gap:20px">
        <div style="font-size:20px;color:var(--muted);font-weight:600;letter-spacing:.08em">CIERRE DE MES</div><div class="clk" style="font-size:54px;font-weight:800;font-variant-numeric:tabular-nums">18:00</div></div>
      <div class="abs pb-flow" style="left:0;right:0;top:390px;display:flex;justify-content:center;align-items:center;gap:14px">
        ${node("f1", icon.db, "Bajas el reporte del ERP")}${arrow("a1")}${node("f2", icon.grid, "Lo pasas a Excel")}${arrow("a2")}${node("f3", icon.pivot, "Armas tablas dinámicas")}${arrow("a3")}${node("f4", icon.slides, "Copias gráficos a PowerPoint")}${arrow("a4")}${node("f5", icon.ask, "«¿Y esto por qué subió?»", "var(--red)")}
      </div>
      <div class="center pb-hours"><div class="h-xl"><span class="w1">Horas.</span> <span class="w2 muted">A veces días.</span></div><div class="txt w3" style="margin-top:22px;font-size:34px">…solo para mostrar números.</div></div>
      <div class="center pb-q" style="gap:40px"><div class="h-s muted q0">Lo que la gerencia quiere saber:</div>
        <div style="display:flex;gap:36px"><div class="card q1" style="padding:40px 50px"><div class="h-m">¿Dónde está el problema?</div></div><div class="card q2" style="padding:40px 50px"><div class="h-m">¿Qué hacemos?</div></div></div></div>
      <div class="abs pb-ask" style="left:300px;top:110px;display:flex;align-items:center;gap:16px"><div class="chat" style="position:relative;padding:20px 28px;border-radius:18px;font-size:30px"><span class="muted">Tú:</span> <span class="typ"></span><span class="caret" style="display:inline-block;width:3px;height:30px;background:var(--cyan);vertical-align:-4px;margin-left:2px"></span></div></div>
      ${generic}
      ${ann("an1", "Gráficos que no cuentan una historia", "left:1000px;top:800px")}
      ${ann("an2", "KPIs que nadie pidió", "left:1260px;top:190px")}
      ${ann("an3", "No aguanta una reunión con el CFO", "left:340px;top:880px")}
      <div class="center pb-fin" style="gap:18px"><div class="h-l f1">El problema no es la IA.</div><div class="h-xl grad f2">Es el prompt.</div></div>`,
      render);
    function render(t) {
      // reloj: de 18:00 a 23:40 mientras dura la queja
      const pc = clamp01((t - S("p1a")) / (E("p2b") - S("p1a")));
      const mins = 18 * 60 + Math.floor(easeIO(pc) * 340);
      sc.$(".clk").textContent = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
      sty(sc.$(".pb-clock"), { o: env(t, a + 0.1, S("p3a") - 0.1) });
      const flowEnd = S("p2a") - 0.1;
      const kf = ["bajas el reporte", "lo pasas a Excel", "armas tablas", "copias los gráficos", "rezas"];
      kf.forEach((k, i) => {
        pop(sc.$(".f" + (i + 1)), t, W("p1b", k) - 0.15, { until: flowEnd, dy: 30 });
        if (i) pop(sc.$(".a" + i), t, W("p1b", k) - 0.25, { until: flowEnd, dy: 0 });
      });
      sty(sc.$(".pb-flow"), { o: t < flowEnd + 0.35 ? 1 : 0 });
      const hEnd = S("p2b") - 0.05;
      pop(sc.$(".pb-hours .w1"), t, S("p2a"), { until: hEnd });
      pop(sc.$(".pb-hours .w2"), t, W("p2a", "a veces días") - 0.05, { until: hEnd });
      pop(sc.$(".pb-hours .w3"), t, W("p2a", "solo para") - 0.05, { until: hEnd });
      sty(sc.$(".pb-hours"), { o: t > S("p2a") - 0.2 && t < hEnd + 0.35 ? 1 : 0 });
      const qEnd = S("p3a") - 0.1;
      pop(sc.$(".q0"), t, S("p2b") + 0.2, { until: qEnd });
      pop(sc.$(".q1"), t, W("p2b", "dónde está") - 0.1, { until: qEnd });
      pop(sc.$(".q2"), t, W("p2b", "qué hacemos") - 0.1, { until: qEnd });
      sty(sc.$(".pb-q"), { o: t > S("p2b") && t < qEnd + 0.35 ? 1 : 0 });
      // "hazme un dashboard"
      const gEnd = S("p4a") - 0.1;
      const msg = "hazme un dashboard";
      const tp = clamp01((t - W("p3a", "«hazme")) / 0.8);
      sc.$(".pb-ask .typ").textContent = msg.slice(0, Math.round(tp * msg.length));
      sc.$(".pb-ask .caret").style.opacity = tp < 1 || Math.floor(t * 2) % 2 ? 1 : 0;
      pop(sc.$(".pb-ask"), t, S("p3a") + 0.2, { until: gEnd });
      pop(sc.$(".pb-gen"), t, S("p3b") - 0.1, { until: gEnd, dy: 40, ds: 0.04 });
      pop(sc.$(".an1"), t, W("p3c", "gráficos que no") - 0.1, { until: gEnd, ds: 0.15 });
      pop(sc.$(".an2"), t, W("p3c", "KPIs que nadie") - 0.1, { until: gEnd, ds: 0.15 });
      pop(sc.$(".an3"), t, W("p3c", "un diseño") - 0.1, { until: gEnd, ds: 0.15 });
      pop(sc.$(".pb-fin .f1"), t, S("p4a"), { dy: 30 });
      pop(sc.$(".pb-fin .f2"), t, S("p4b") - 0.05, { dy: 30, ds: 0.06 });
      sty(sc.$(".pb-fin"), { o: t > S("p4a") - 0.2 ? 1 : 0 });
    }
  }

  // =====================================================================
  // 4) PASO 0: LOS DATOS
  // =====================================================================
  {
    const a = S("d1a") - 0.4, b = S("tipeo1") + 0.1;
    const sc = scene("datos", a, b, `
      <div class="abs dt-sheet" style="left:250px;top:112px;width:1420px;height:880px">${SHEET(1420, 880, 40)}<div class="hl h-ac"></div><div class="hl h-yr"></div></div>
      <div class="abs dt-stamp" style="left:1210px;top:150px;border:6px solid #fbbf24;color:#fbbf24;font-weight:900;font-size:64px;letter-spacing:.06em;padding:8px 28px;border-radius:14px;background:#1a1405e6;transform:rotate(-8deg)">DATOS FICTICIOS</div>
      <div class="abs dt-warn card" style="left:260px;right:260px;bottom:70px;padding:28px 36px;display:flex;gap:26px;align-items:center;border-color:#fbbf24aa;background:#17130aee">
        <div style="width:64px;height:64px;border-radius:16px;background:#fbbf2422;color:#fbbf24;display:grid;place-items:center;font-size:40px;font-weight:900;flex:none">!</div>
        <div><div style="font-size:32px;font-weight:800">¿Vas a usar datos reales de tu empresa?</div><div class="txt" style="font-size:26px;margin-top:6px">Revisa antes las políticas de tu organización sobre subir información a herramientas de IA.</div></div></div>`,
      render);
    let cols = null;
    function render(t) {
      const sh = sc.$(".dt-sheet");
      const pz = ramp(t, a, 0.45);
      sty(sh, { o: pz, y: (1 - pz) * 30, s: 1 + 0.025 * clamp01((t - a) / 26) });
      if (!cols) {
        const th = (c) => measure(sh, sh.querySelector(`th[data-col="${c}"]`));
        const grid = measure(sh, sh.querySelector(".s-grid"));
        cols = { D: th("D"), E: th("E"), A: th("A"), top: grid.y, h: grid.h };
      }
      const hac = sc.$(".h-ac"), hyr = sc.$(".h-yr");
      Object.assign(hac.style, { left: cols.D.x + "px", top: cols.top + "px", width: cols.E.x + cols.E.w - cols.D.x + "px", height: cols.h - 4 + "px" });
      Object.assign(hyr.style, { left: cols.A.x + "px", top: cols.top + "px", width: cols.A.w + "px", height: cols.h - 4 + "px" });
      sty(hac, { o: env(t, W("d1b", "por área") - 0.2, S("d1d"), 0.3, 0.3) });
      sty(hyr, { o: env(t, W("d1b", "este año") - 0.2, S("d1d"), 0.3, 0.3) });
      const pst = ramp(t, W("d1d", "ficticios") - 0.25, 0.3);
      sty(sc.$(".dt-stamp"), { o: pst, s: 1.6 - 0.6 * pst, r: -8 });
      pop(sc.$(".dt-warn"), t, W("d1d", "ojo con esto") - 0.1, { dy: 40 });
    }
  }

  // =====================================================================
  // 5) PASO 1: EL PROMPT RÁPIDO
  // =====================================================================
  const P1 = [
    { t: "Soy jefe de planeamiento financiero en una empresa comercial.", k: "quién soy" },
    { t: " " },
    { t: "Tengo que presentar el análisis de gastos por área del mes.", k: "para qué es" },
    { t: " Crea un dashboard en HTML con diseño moderno, oscuro y con efecto neón. " },
    { t: "Incluye: análisis por área, análisis por categoría y un gráfico de cascada (waterfall) con la variación frente al año pasado.", k: "qué gráficos" },
    { t: " Hazlo como el mejor diseñador de dashboards y programador web." },
  ];
  const P1TXT = P1.map((x) => x.t).join("");
  const HL = { "quién soy": "#22d3ee40", "para qué es": "#a78bfa48", "qué gráficos": "#fbbf2440" };
  function typedHTML(parts, n, marks) {
    let out = "", left = n;
    for (const p of parts) {
      if (left <= 0) break;
      const s = p.t.slice(0, left);
      left -= p.t.length;
      const bgc = p.k && marks[p.k] > 0 ? HL[p.k].slice(0, 7) + Math.round(parseInt(HL[p.k].slice(7), 16) * marks[p.k]).toString(16).padStart(2, "0") : "transparent";
      out += p.k ? `<span class="mark" style="background:${bgc}">${esc(s)}</span>` : esc(s);
    }
    return out;
  }
  {
    const a = S("tipeo1") - 0.2, b = S("q1a") - 0.1;
    const sc = scene("paso1", a, b, `
      <div class="abs p1-chat" style="left:210px;top:104px">${CHAT(1500, 940)}</div>
      <div class="abs p1-world" style="left:0;top:0;width:1600px;height:944px;transform-origin:0 0">${WIN("dashboard-gastos.html", `<div class="p1-dash"></div>`)}
        <div class="abs p1-ring" style="border:4px solid #22d3ee;border-radius:18px;box-shadow:0 0 30px #22d3ee88"></div>
        <div class="abs p1-pulse" style="inset:0;pointer-events:none"></div></div>
      <div class="abs p1-dim" style="inset:0;background:#050912"></div>
      <div class="center p1-trap" style="gap:24px"><div class="pill t0" style="font-size:26px;border-color:#ff6b6b88;color:#ffd0d0"><span class="dot" style="background:var(--red);box-shadow:0 0 12px var(--red)"></span>LA TRAMPA</div><div class="h-l t1">Tiene lo que <span class="grad">yo</span> pedí.</div><div class="h-s muted t2">¿Y si hay algo mejor que mostrar?</div><div class="pill t3" style="margin-top:20px;font-size:32px"><span class="dot"></span>Ahí entra el paso 2 →</div></div>`,
      render);
    const body = sc.$(".p1-chat .c-body");
    body.innerHTML = `
      <div class="hello" style="position:absolute;left:0;right:0;top:220px;text-align:center;font-size:40px;font-weight:700;color:#c7d0e2">¿En qué te ayudo hoy?</div>
      <div class="u-msg msg-u" style="display:none"></div>
      <div class="a-msg" style="margin-top:28px;display:none"><div class="who"><span class="av"></span>Claude</div><div class="msg-a txt-a"></div>
        <div class="art card" style="margin-top:18px;width:560px;padding:18px 22px;display:flex;gap:16px;align-items:center;border-radius:16px">
          <div style="width:54px;height:54px;border-radius:12px;background:#22d3ee22;display:grid;place-items:center;color:var(--cyan);font-weight:800">&lt;/&gt;</div>
          <div style="flex:1"><div style="font-size:20px;font-weight:700;color:var(--ink)">Dashboard de gastos por área</div><div style="font-size:16px;color:var(--muted)">HTML · interactivo</div>
          <div style="height:6px;border-radius:3px;background:#1f2b45;margin-top:10px;overflow:hidden"><div class="bar" style="height:100%;width:0;background:var(--cyan)"></div></div></div></div></div>
      <div class="input"><span class="ttxt"></span><span class="caret"></span><span class="ph">Escribe tu mensaje…</span>
        <div class="bar"><span class="attach" style="display:inline-flex">${FILE_CHIP}</span><span class="send">↑</span></div></div>`;
    const dash = KV.createDashboard(1, sc.$(".p1-dash"), { progress: 0 });
    const world = sc.$(".p1-world");
    const R = (q) => () => measure(world, world.querySelector(q));
    const FULL = () => ({ x: -70, y: -40, w: 1740, h: 1024 });
    const tGen = S("genera1") + 1.5;
    const cam = [
      { t: 0, r: FULL },
      { t: S("s2b") - 0.1, r: () => grow(R(".kd-kpis")(), 40), d: 1.0 },
      { t: S("s2c") - 0.1, r: () => grow(R(".row3 .kd-card:nth-child(2)")(), 30), d: 1.1 },
      { t: S("s2e") - 0.1, r: FULL, d: 1.2 },
    ];
    const pulseCells = ["hm:Operaciones:Alquiler", "hm:TI:Software", "hm:Marketing:Servicios"];
    function render(t) {
      // --- chat ---
      const chatOn = t < tGen + 0.6;
      const ch = sc.$(".p1-chat");
      ch.style.display = chatOn ? "block" : "none";
      if (chatOn) {
        sty(ch, { o: 1 - ramp(t, tGen, 0.5), s: 1 - 0.04 * ramp(t, tGen, 0.5) });
        const tSend = S("s1c") + 0.15;
        const n = Math.round(clamp01((t - S("tipeo1") - 0.3) / (S("s1a") + 0.3 - S("tipeo1") - 0.3)) * P1TXT.length);
        const marks = { "quién soy": ramp(t, W("s1a", "quién soy") - 0.1, 0.3), "para qué es": ramp(t, W("s1a", "para qué es") - 0.1, 0.3), "qué gráficos": ramp(t, W("s1a", "qué gráficos") - 0.1, 0.3) };
        const inp = body.querySelector(".input");
        if (t < tSend) {
          inp.querySelector(".ttxt").innerHTML = typedHTML(P1, n, marks);
          inp.querySelector(".ph").style.display = n ? "none" : "inline";
          inp.querySelector(".caret").style.opacity = n < P1TXT.length || Math.floor(t * 2.2) % 2 ? 1 : 0;
        } else {
          inp.querySelector(".ttxt").innerHTML = "";
          inp.querySelector(".ph").style.display = "inline";
        }
        const at = ramp(t, S("s1b") + 0.1, 0.35);
        sty(inp.querySelector(".attach"), { o: t < tSend ? at : 0, s: 0.7 + 0.3 * at });
        sty(inp.querySelector(".send"), { o: 1, s: t > tSend - 0.15 && t < tSend + 0.1 ? 0.85 : 1 });
        sty(body.querySelector(".hello"), { o: t < tSend ? 1 - ramp(t, S("tipeo1") + 0.2, 0.3) : 0 });
        const um = body.querySelector(".u-msg"), am = body.querySelector(".a-msg");
        um.style.display = t >= tSend ? "block" : "none";
        if (t >= tSend) {
          um.innerHTML = `<div style="display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${esc(P1TXT)}</div><div style="margin-top:12px">${FILE_CHIP}</div>`;
          pop(um, t, tSend, { dy: 40 });
        }
        am.style.display = t >= tSend + 0.5 ? "block" : "none";
        if (t >= tSend + 0.5) {
          const msg = "Perfecto. Reviso el archivo y armo el dashboard en HTML con el estilo que pediste.";
          am.querySelector(".txt-a").textContent = msg.slice(0, Math.round(clamp01((t - tSend - 0.6) / 1.1) * msg.length));
          pop(am, t, tSend + 0.5, { dy: 20 });
          pop(am.querySelector(".art"), t, tSend + 1.4, { dy: 16 });
          am.querySelector(".bar").style.width = ramp(t, tSend + 1.5, tGen - tSend - 1.3) * 100 + "%";
        }
      }
      // --- dashboard ---
      const wOn = t >= tGen - 0.05;
      world.style.display = wOn ? "block" : "none";
      let c = { s: 1, tx: 0, ty: 0 };
      if (wOn) {
        dset(dash, { progress: ramp(t, tGen + 0.2, 1.8) });
        c = camera(t, cam);
        const intro = ramp(t, tGen, 0.6);
        applyCam(world, intro < 1 ? zoomAbout(c, 0.9 + 0.1 * intro) : c);
        world.style.opacity = intro;
        // aro sobre los KPIs que se mencionan
        const ring = sc.$(".p1-ring");
        const kk = [["El total", 1], ["la variación", 2], ["qué área explica", 3]];
        let ringOn = 0, which = 1;
        kk.forEach(([w, i]) => { if (t >= W("s2b", w) - 0.1) which = i; });
        ringOn = env(t, W("s2b", "El total") - 0.1, S("s2c") - 0.2, 0.25, 0.3);
        const kr = R(`.kd-kpi:nth-child(${which})`)();
        Object.assign(ring.style, { left: kr.x - 6 + "px", top: kr.y - 6 + "px", width: kr.w + 12 + "px", height: kr.h + 12 + "px" });
        sty(ring, { o: ringOn });
        ring.style.transform = "none";
        // mapa de calor: cursor + tooltip + pulsos
        const hmOn = t >= S("s2c") + 0.5 && t < S("s2e");
        if (hmOn) {
          const cells = ["hm:Ventas:Viajes", "hm:Operaciones:Alquiler", "hm:TI:Software"];
          const pts = [
            { t: S("s2c") + 0.5, p: () => centerOf(R(`[data-tip="${cells[0]}"]`)(), 10, 6) },
            { t: W("s2c", "cruza") + 0.1, p: () => centerOf(R(`[data-tip="${cells[1]}"]`)(), 10, 6) },
            { t: W("s2d", "dónde") + 0.2, p: () => centerOf(R(`[data-tip="${cells[2]}"]`)(), 10, 6) },
          ];
          const pos = path(t, pts, 0.6);
          cur = toStage(c, pos.x, pos.y);
          let hk = null;
          if (t > pts[1].t + 0.6) hk = cells[1];
          if (t > pts[2].t + 0.6) hk = cells[2];
          dset(dash, { hover: hk });
        } else dset(dash, { hover: null });
        const pl = sc.$(".p1-pulse");
        const pOn = env(t, W("s2d", "dolor") - 0.3, S("s2e") + 0.2, 0.3, 0.4);
        if (pOn > 0) {
          pl.innerHTML = pulseCells.map((k, i) => {
            const r = R(`[data-tip="${k}"]`)();
            const ph = ((t - W("s2d", "dolor") + i * 0.2) % 1.1) / 1.1;
            return `<div class="abs" style="left:${r.x - 4 - ph * 10}px;top:${r.y - 4 - ph * 10}px;width:${r.w + 8 + ph * 20}px;height:${r.h + 8 + ph * 20}px;border:3px solid #ff6b6b;border-radius:10px;opacity:${(1 - ph) * pOn}"></div>`;
          }).join("");
        } else pl.innerHTML = "";
      }
      // --- la trampa ---
      const tt = S("s3a") - 0.1;
      sty(sc.$(".p1-dim"), { o: 0.82 * ramp(t, tt, 0.5) });
      world.style.filter = t > tt ? `blur(${5 * ramp(t, tt, 0.5)}px)` : "none";
      pop(sc.$(".p1-trap .t0"), t, S("s3a") + 0.1, { ds: 0.1 });
      pop(sc.$(".p1-trap .t1"), t, W("s3a", "este dashboard") - 0.1);
      pop(sc.$(".p1-trap .t2"), t, S("s3b") + 0.1);
      pop(sc.$(".p1-trap .t3"), t, S("s3c"), { ds: 0.1 });
      sty(sc.$(".p1-trap"), { o: t > tt ? 1 : 0 });
    }
  }

  // =====================================================================
  // 6) PASO 2: EL PROMPT DE 5 PARTES
  // =====================================================================
  const P2 = [
    ["ROL", "--t-rol", "Actúa como un experto en diseño de dashboards, análisis de datos y prompt engineering.", "q1d"],
    ["DATOS", "--t-datos", "El Excel adjunto contiene los gastos de la empresa por área y categoría, comparando septiembre 2026 con septiembre 2025.", "q1e"],
    ["OBJETIVO", "--t-obj", "Quiero un dashboard simple, limpio, profesional e interactivo, que el gerente general y el CFO entiendan en menos de un minuto.", "q1f"],
    ["ANÁLISIS", "--t-ana", "Antes de crear nada, analiza el archivo. Entiende su estructura, columnas, lógica y las métricas más importantes. Valida que los totales cuadren.", "q1g"],
    ["PROPUESTA", "--t-pro", "Propónme los KPIs principales, los mejores gráficos, filtros útiles, los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.", "q1h"],
  ];
  {
    const a = S("q1a") - 0.3, b = S("i0") - 0.1;
    const A = KV.agg(null);
    const analysis = [
      `Revisé el archivo: <b>60 filas</b> · 6 áreas × 5 categorías · septiembre 2025 y 2026.`,
      `<span class="green">✓ Totales validados:</span> ${KV.money(A.t25)} → ${KV.money(A.t26)} (${KV.pct(A.dp)}). Cuadran con la suma por área.`,
      `<b>KPIs:</b> gasto total, variación, concentración del alza y peso por categoría.`,
      `<b>Gráficos:</b> cascada por área, peso de cada categoría y mapa de variación.`,
      `<b>Filtros:</b> por área. <b>Insight clave:</b> Operaciones explica el 48 % del alza.`,
      `<b>Layout:</b> narrativa arriba → KPIs → qué explica la variación → detalle.`,
      `<span class="cyan">Construyendo el dashboard…</span>`,
    ];
    const sc = scene("paso2", a, b, `
      <div class="abs p2-chat" style="left:210px;top:104px">${CHAT(1500, 940)}</div>
      <div class="abs p2-prompt card" style="left:150px;top:110px;width:1620px;height:920px;padding:32px 44px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="h-s">El prompt de 5 partes</div><div class="pp-desc" style="font-size:24px;color:var(--cyan);display:flex;align-items:center;gap:8px">También en la descripción ${icon.down}</div></div>
        <div class="pp-blocks" style="margin-top:20px;display:flex;flex-direction:column;gap:8px">
          ${P2.map(([tag, col, txt], i) => `<div class="pblock pb${i}"><div class="tag" style="background:var(${col})">${tag}</div><div class="body">${txt.replace("ejecútalo", '<span class="ejec">ejecútalo</span>')}</div></div>`).join("")}
        </div></div>
      <div class="abs p2-why" style="left:1180px;top:150px;width:600px;display:flex;flex-direction:column;gap:26px">
        <div class="h-l w0">¿Qué cambia?</div>
        <div class="h-s w1 muted">Ya no le pido un dibujo.</div>
        <div class="h-s w2">Le pido que piense <span class="grad">como un analista</span>.</div>
        <div style="display:flex;flex-direction:column;gap:16px;margin-top:10px">
          <div class="chip st1" style="font-size:34px"><span class="vmark" style="background:#a78bfa22;color:var(--violet)">1</span>Entender</div>
          <div class="chip st2" style="font-size:34px"><span class="vmark" style="background:#f472b622;color:#f472b6">2</span>Proponer</div>
          <div class="chip st3" style="font-size:34px"><span class="vmark" style="background:#22d3ee22;color:var(--cyan)">3</span>Construir</div></div></div>
      <div class="abs p2-world" style="left:0;top:0;width:1600px;height:944px;transform-origin:0 0">${WIN("dashboard-gastos-v2.html", `<div class="p2-dash"></div>`)}</div>
      <div class="abs p2-cmp" style="inset:0">
        <div class="abs cl" style="left:50px;top:200px;width:896px"><div class="pill" style="margin-bottom:18px"><span class="dot" style="background:#7d89a3;box-shadow:none"></span>Prompt rápido</div><div style="width:896px;height:504px;overflow:hidden;border-radius:12px;border:1px solid #2a3a5c"><div class="cd1" style="width:1600px;height:900px;transform:scale(0.56);transform-origin:0 0"></div></div><div class="txt" style="margin-top:20px;font-size:26px">Tiene lo que yo pedí</div></div>
        <div class="abs cr" style="left:974px;top:200px;width:896px"><div class="pill" style="margin-bottom:18px;border-color:#22d3ee88"><span class="dot"></span>Prompt de 5 partes</div><div style="width:896px;height:504px;overflow:hidden;border-radius:12px;border:1px solid #22d3ee88;box-shadow:0 0 50px #22d3ee22"><div class="cd2" style="width:1600px;height:900px;transform:scale(0.56);transform-origin:0 0"></div></div><div class="txt" style="margin-top:20px;font-size:26px;color:var(--ink)">Narrativa · filtros · métricas que no pedí</div></div>
        <div class="abs" style="left:0;right:0;top:96px;text-align:center"><span class="h-m">Mira la diferencia</span></div></div>
      <div class="abs p2-click" style="opacity:0;visibility:hidden;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:3px solid var(--cyan)"></div>`,
      render);
    // chat con historial
    const body = sc.$(".p2-chat .c-body");
    body.innerHTML = `
      <div class="hist" style="opacity:.55"><div class="msg-u" style="max-width:70%"><div style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(P1TXT)}</div></div>
        <div style="margin-top:16px"><div class="who"><span class="av"></span>Claude</div><div class="card" style="width:520px;padding:14px 18px;border-radius:14px;font-size:19px;color:var(--ink)">Dashboard de gastos por área · HTML</div></div></div>
      <div class="u2 msg-u" style="margin-top:22px;display:none"><div style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(P2.map((x) => x[0] + ": " + x[2]).join(" "))}</div></div>
      <div class="a2" style="margin-top:20px;display:none"><div class="who"><span class="av"></span>Claude</div><div class="msg-a lines" style="display:flex;flex-direction:column;gap:8px">${analysis.map((l) => `<div class="ln">${l}</div>`).join("")}</div></div>
      <div class="input"><span class="ttxt"></span><span class="caret"></span><span class="ph">Responde a Claude…</span><div class="bar"><span></span><span class="send">↑</span></div></div>`;
    const dash = KV.createDashboard(2, sc.$(".p2-dash"), { progress: 0 });
    const cd1 = KV.createDashboard(1, sc.$(".cd1"));
    const cd2 = KV.createDashboard(2, sc.$(".cd2"));
    const world = sc.$(".p2-world");
    const R = (q) => () => measure(world, world.querySelector(q));
    const FULL = () => ({ x: -70, y: -40, w: 1740, h: 1024 });
    const tSend2 = E("q2c") + 0.35, tGen = S("genera2") + 3.9, tCmp = S("q3a") - 0.15, tFull = S("q3b") - 0.1;
    const tClick = W("q3c", "filtros") + 0.35, tClick2 = S("q3e") + 0.9;
    const cam = [
      { t: 0, r: FULL },
      { t: tFull, r: () => { const r = R(".story")(); return { x: r.x - 30, y: r.y - 60, w: 1300, h: r.h + 120 }; }, d: 0.01 },
      { t: S("q3c") - 0.2, r: () => { const r = R(".kd-head .filters")(); return { x: r.x + r.w - 1150, y: r.y - 40, w: 1180, h: r.h + 80 }; }, d: 0.9 },
      { t: tClick + 0.5, r: FULL, d: 0.9 },
      { t: S("q3d") - 0.1, r: () => grow(R(".rowA .kd-card:nth-child(2)")(), 60), d: 1.0 },
      { t: S("q3e") - 0.1, r: FULL, d: 1.1 },
    ];
    function render(t) {
      const wOn = (t >= tGen - 0.05 && t < tCmp + 0.4) || t >= tFull - 0.05;
      // --- chat: historial + nuevo prompt ---
      const chatOn = t < S("q1b") + 0.3 || (t >= tSend2 - 0.4 && t < tGen + 0.6);
      const ch = sc.$(".p2-chat");
      ch.style.display = chatOn ? "block" : "none";
      if (chatOn) {
        const o = t < S("q1b") + 0.3 ? 1 - ramp(t, S("q1b") - 0.05, 0.3) : Math.min(ramp(t, tSend2 - 0.4, 0.4), 1 - ramp(t, tGen, 0.5));
        sty(ch, { o });
        const inp = body.querySelector(".input"), first = "ROL: Actúa como un experto en diseño de dashboards, análisis de datos y prompt engineering. DATOS: El Excel adjunto…";
        const n = t < S("q1b") ? Math.round(clamp01((t - S("q1a") - 0.6) / 2.8) * first.length) : 0;
        inp.querySelector(".ttxt").textContent = first.slice(0, n);
        inp.querySelector(".ph").style.display = n ? "none" : "inline";
        inp.querySelector(".caret").style.opacity = Math.floor(t * 2.2) % 2 ? 1 : 0;
        const u2 = body.querySelector(".u2"), a2 = body.querySelector(".a2");
        const sent = t >= tSend2;
        u2.style.display = sent ? "block" : "none";
        a2.style.display = t >= tSend2 + 0.4 ? "block" : "none";
        body.querySelector(".hist").style.display = sent ? "none" : "block";
        if (sent) pop(u2, t, tSend2, { dy: 30 });
        body.querySelectorAll(".ln").forEach((ln, i) => pop(ln, t, tSend2 + 0.4 + i * 0.25, { dy: 12, d: 0.3 }));
      }
      // --- bloques del prompt ---
      if (!wOn) sty(sc.$(".p2-click"), { o: 0 });
      const pOn = t >= S("q1b") - 0.2 && t < tSend2;
      const pr = sc.$(".p2-prompt");
      pr.style.display = pOn ? "block" : "none";
      if (pOn) {
        const shrink = rampIO(t, S("q2a") - 0.2, 0.7);
        const o = Math.min(ramp(t, S("q1b") - 0.2, 0.4), 1 - ramp(t, tSend2 - 0.35, 0.3));
        pr.style.opacity = o;
        pr.style.width = lerp(1620, 1000, shrink) + "px";
        pr.style.left = lerp(150, 90, shrink) + "px";
        pop(sc.$(".pp-desc"), t, S("q1c") + 0.2, { dy: 10 });
        P2.forEach(([tag, col], i) => {
          const bl = sc.$(".pb" + i);
          // todos los bloques visibles atenuados; cada uno se enciende cuando se nombra
          const lit = ramp(t, S(P2[i][3]) - 0.15, 0.35);
          sty(bl, { o: Math.min(ramp(t, S("q1b") + 0.2 + i * 0.12, 0.4), 0.3 + 0.7 * lit) });
          const active = t >= S(P2[i][3]) - 0.15 && t < S(P2[i][3]) + 1.2;
          // en "¿qué cambia?" se resaltan análisis y propuesta
          const later = (i === 3 && t >= W("q2c", "primero entender") - 0.1) || (i === 4 && t >= W("q2c", "después proponer") - 0.1);
          bl.style.background = active || later ? "#ffffff0a" : "transparent";
          bl.style.borderColor = active || later ? `color-mix(in srgb, var(${col}) 60%, transparent)` : "transparent";
          bl.querySelector(".body").style.fontSize = lerp(25, 21, shrink) + "px";
        });
        const ej = sc.$(".ejec");
        ej.style.background = t >= W("q2c", "al final construir") - 0.1 ? "#22d3ee44" : "transparent";
        ej.style.borderRadius = "6px";
      }
      // --- ¿qué cambia? ---
      const why = sc.$(".p2-why");
      why.style.display = t > S("q2a") - 0.3 && t < tSend2 ? "flex" : "none";
      const wEnd = tSend2 - 0.35;
      pop(why.querySelector(".w0"), t, S("q2a"), { until: wEnd });
      pop(why.querySelector(".w1"), t, S("q2b"), { until: wEnd });
      pop(why.querySelector(".w2"), t, S("q2c"), { until: wEnd });
      pop(why.querySelector(".st1"), t, W("q2c", "primero entender") - 0.1, { until: wEnd });
      pop(why.querySelector(".st2"), t, W("q2c", "después proponer") - 0.1, { until: wEnd });
      pop(why.querySelector(".st3"), t, W("q2c", "al final construir") - 0.1, { until: wEnd });
      // --- dashboard 2 ---
      const cmpOn = t >= tCmp && t < tFull + 0.3;
      world.style.display = wOn ? "block" : "none";
      let c = FULL;
      if (wOn) {
        let filter = null;
        if (t >= tClick) filter = "TI";
        if (t >= tClick2) filter = null;
        dset(dash, { progress: ramp(t, tGen + 0.1, 1.3), filter, hover: null });
        c = camera(t, cam);
        const intro = ramp(t, tGen, 0.6);
        applyCam(world, intro < 1 ? zoomAbout(c, 0.9 + 0.1 * intro) : c);
        world.style.opacity = t < tCmp + 0.4 ? Math.min(intro, 1 - ramp(t, tCmp, 0.4)) : ramp(t, tFull - 0.05, 0.35);
        // cursor que hace clic en "TI" y luego en "Todas"
        if (t > S("q3c") - 0.1 && t < tClick2 + 0.8) {
          const chip = (name) => () => centerOf(R(`.chip[data-filter="${name}"]`)(), 6, 8);
          const pts = [
            { t: S("q3c") - 0.1, p: () => ({ x: 1300, y: 300 }) },
            { t: S("q3c") + 0.05, p: chip("TI") },
            { t: tClick2 - 0.65, p: chip("") },
          ];
          const pos = path(t, pts, 0.55);
          cur = toStage(c, pos.x, pos.y);
          const ck = [tClick, tClick2].find((x) => t >= x && t < x + 0.45);
          const rp = sc.$(".p2-click");
          if (ck !== undefined) {
            const q = (t - ck) / 0.45;
            Object.assign(rp.style, { left: cur.x + "px", top: cur.y + "px" });
            sty(rp, { o: 1 - q, s: 0.4 + q });
          } else sty(rp, { o: 0 });
        } else sty(sc.$(".p2-click"), { o: 0 });
      }
      // --- comparación lado a lado ---
      const cmp = sc.$(".p2-cmp");
      cmp.style.display = cmpOn ? "block" : "none";
      if (cmpOn) {
        dset(cd1, {});
        dset(cd2, {});
        sty(cmp, { o: Math.min(ramp(t, tCmp, 0.4), 1 - ramp(t, tFull - 0.25, 0.3)) });
        pop(sc.$(".p2-cmp .cl"), t, tCmp, { dy: 30 });
        pop(sc.$(".p2-cmp .cr"), t, tCmp + 0.25, { dy: 30 });
      }
    }
  }

  // =====================================================================
  // 7) LAS 3 IDEAS CLAVE
  // =====================================================================
  {
    const a = S("i0") - 0.3, b = S("c1a") - 0.1;
    const tags = P2.map(([tag, col]) => `<span class="chip" style="font-size:28px;padding:12px 20px;color:#04131a;background:var(${col});border:none;font-weight:800;letter-spacing:.06em">${tag}</span>`);
    const qs = ["¿Quién debe ser?", "¿Qué tiene en las manos?", "¿Para quién es el resultado?", "¿Qué debe revisar?", "¿Qué debe entregarte?"];
    const qk = ["quién debe ser", "qué tiene en las manos", "para quién es", "qué debe revisar", "qué debe entregarte"];
    const flow = (labels, hot) => labels.map((l, i) => `<span class="chip" style="font-size:36px;padding:16px 28px;${hot ? "border-color:#22d3ee88;box-shadow:0 0 24px #22d3ee22" : "color:var(--ink-2)"}">${l}</span>${i < labels.length - 1 ? '<span style="font-size:34px;color:var(--muted)">→</span>' : ""}`).join("");
    const sc = scene("ideas", a, b, `
      <div class="abs id-head" style="left:0;right:0;top:64px;text-align:center"><span class="h-l">Las <span class="grad">3 ideas</span> clave</span></div>
      <div class="abs id-nums" style="left:0;right:0;top:330px;display:flex;justify-content:center;gap:60px">
        ${[1, 2, 3].map((n) => `<div class="card nn${n}" style="width:300px;height:300px;display:grid;place-items:center;font-family:'Inter Display',Inter;font-weight:800;font-size:150px;color:var(--cyan);text-shadow:0 0 40px #22d3ee66">${n}</div>`).join("")}</div>
      <div class="abs id-c1 card idea" style="left:210px;top:220px;width:1500px">
        <div style="display:flex;gap:30px;align-items:center"><div class="n">1</div><div class="t" style="margin:0">Primero que piense, después que construya.</div></div>
        <div style="margin-top:56px;display:flex;flex-direction:column;gap:30px">
          <div class="r1" style="display:flex;align-items:center;gap:18px"><span style="width:400px;font-size:34px;color:var(--muted);font-weight:600">Prompt rápido</span>${flow(["Pides", "Construye"], false)}</div>
          <div class="r2" style="display:flex;align-items:center;gap:18px"><span style="width:400px;font-size:34px;color:var(--cyan);font-weight:700">Prompt de 5 partes</span>${flow(["Analiza", "Propone", "Construye"], true)}</div>
        </div>
        <div class="r3 txt" style="margin-top:44px;font-size:34px;color:var(--ink)">Te propone cosas que <b class="grad">tú no habrías pedido</b>.</div>
        <div class="r4" style="margin-top:34px;display:flex;gap:16px;flex-wrap:wrap"><span class="chip k1">Dashboards</span><span class="chip k2">Informes</span><span class="chip k3">Presentaciones</span><span class="chip k4">…casi todo</span></div></div>
      <div class="abs id-c2 card idea" style="left:210px;top:220px;width:1500px">
        <div style="display:flex;gap:30px;align-items:center"><div class="n">2</div><div class="t" style="margin:0">El prompt tiene estructura.</div></div>
        <div style="margin-top:40px;display:grid;grid-template-columns:300px 1fr;row-gap:22px;align-items:center">
          ${tags.map((tg, i) => `<div class="tg tg${i}">${tg}</div><div class="qq q${i}" style="font-size:40px;font-weight:600">${qs[i]}</div>`).join("")}</div>
        <div style="margin-top:40px;display:flex;gap:22px;align-items:center">
          <span class="chip sv" style="border-color:#22d3ee88"><span class="cyan" style="display:flex">${icon.save}</span>Guarda la plantilla</span>
          <span class="rs" style="display:flex;gap:14px;align-items:center"><span style="font-size:28px;color:var(--muted)">y reutilízala:</span><span class="chip">Ventas</span><span class="chip">Cobranzas</span><span class="chip">Inventario</span><span class="chip">…</span></span></div></div>
      <div class="abs id-c3 card idea" style="left:210px;top:220px;width:1500px">
        <div style="display:flex;gap:30px;align-items:center"><div class="n">3</div><div class="t" style="margin:0">La IA hace el 80 %; tú pones el criterio y la validación.</div></div>
        <div class="bar8" style="margin-top:44px;display:flex;height:64px;border-radius:16px;overflow:hidden;font-size:24px;font-weight:800">
          <div class="b80" style="width:80%;background:linear-gradient(90deg,#1d6fb8,#22d3ee);display:flex;align-items:center;padding-left:24px;color:#04131a">IA · 80 % velocidad</div>
          <div class="b20" style="width:20%;background:#a78bfa;display:flex;align-items:center;justify-content:center;color:#04131a">Tú · criterio</div></div>
        <div class="g1 txt" style="margin-top:30px;font-size:32px;color:var(--ink)">El que se para frente al gerente <b>eres tú</b>.</div>
        <div style="margin-top:26px;display:flex;flex-direction:column;gap:16px">
          <div class="c1 chip" style="font-size:28px"><span class="vmark">✓</span>Los totales cuadran con tu Excel</div>
          <div class="c2 chip" style="font-size:28px"><span class="vmark">✓</span>Los insights tienen sentido de negocio</div>
          <div class="c3 chip" style="font-size:28px"><span class="vmark">✓</span>No hay cifras inventadas</div>
          <div class="c4 chip" style="font-size:28px;border-color:#22d3ee88"><span class="vmark" style="background:#22d3ee22;color:var(--cyan)">?</span>Pídele que te muestre cómo calculó cada KPI</div></div></div>
      <div class="abs id-quote" style="left:0;right:0;bottom:70px;text-align:center;font-size:34px;font-style:italic;color:var(--ink-2)">«La velocidad no sirve si pierdes la confianza en la primera pregunta.»</div>
      <div class="abs id-sum" style="left:90px;right:90px;top:230px;display:flex;gap:36px">
        ${[["1", "Primero que piense, después que construya.", "Pídele que analice y proponga antes de crear.",
            `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${["Analiza", "Propone", "Construye"].map((x) => `<span class="chip" style="font-size:24px;padding:10px 16px;border-color:#22d3ee66">${x}</span>`).join('<span class="muted" style="font-size:24px">→</span>')}</div>`],
           ["2", "El prompt tiene estructura.", "Guarda la plantilla y reutilízala con cualquier archivo.",
            `<div style="display:flex;gap:8px;flex-wrap:wrap">${P2.map(([tg, col]) => `<span style="font-size:20px;font-weight:800;letter-spacing:.06em;padding:8px 12px;border-radius:9px;color:#04131a;background:var(${col})">${tg}</span>`).join("")}</div>`],
           ["3", "La IA hace el 80 %. Tú validas.", "Totales que cuadran, sentido de negocio y cero cifras inventadas.",
            `<div style="display:flex;height:46px;border-radius:12px;overflow:hidden;font-size:20px;font-weight:800;color:#04131a"><div style="width:80%;background:linear-gradient(90deg,#1d6fb8,#22d3ee);display:flex;align-items:center;padding-left:14px">IA 80 %</div><div style="width:20%;background:#a78bfa;display:grid;place-items:center">Tú</div></div>`]]
          .map(([n, t1, t2, vis], i) => `<div class="card idea sm${i}" style="position:relative;flex:1;height:600px;display:flex;flex-direction:column"><div class="n">${n}</div><div class="t" style="font-size:46px">${t1}</div><div class="txt" style="margin-top:18px;font-size:28px">${t2}</div><div style="margin-top:auto">${vis}</div></div>`).join("")}</div>`,
      render);
    function render(t) {
      pop(sc.$(".id-head"), t, a + 0.1, { dy: 20 });
      [1, 2, 3].forEach((n) => pop(sc.$(".id-nums .nn" + n), t, W("i0", "tres cosas") + (n - 1) * 0.25, { until: S("i1t") - 0.3, dy: 40 }));
      const e1 = S("i2t") - 0.15, e2 = S("i3t") - 0.15, e3 = S("resumen") - 0.1;
      const card = (q, s0, s1) => {
        const el = sc.$(q);
        const on = t > s0 - 0.5 && t < s1 + 0.5;
        el.style.display = on ? "block" : "none";
        if (on) pop(el, t, s0, { until: s1, dy: 40, ds: 0.02 });
      };
      card(".id-c1", S("i1t") - 0.2, e1);
      card(".id-c2", S("i2t") - 0.2, e2);
      card(".id-c3", S("i3t") - 0.2, e3);
      pop(sc.$(".id-c1 .r1"), t, S("i1a") + 0.3, { dy: 16 });
      pop(sc.$(".id-c1 .r2"), t, S("i1b") + 0.1, { dy: 16 });
      pop(sc.$(".id-c1 .r3"), t, W("i1c", "te propone") - 0.1, { dy: 16 });
      ["dashboards", "informes", "presentaciones", "para casi todo"].forEach((w, i) => pop(sc.$(".id-c1 .k" + (i + 1)), t, W("i1d", w) - 0.1, { dy: 12, ds: 0.1 }));
      sc.$$(".id-c2 .tg").forEach((el, i) => pop(el, t, W("i2t", ["rol", "datos", "objetivo", "análisis", "propuesta"][i]) - 0.1, { dy: 10 }));
      sc.$$(".id-c2 .qq").forEach((el, i) => pop(el, t, W("i2b", qk[i]) - 0.1, { dy: 10 }));
      pop(sc.$(".id-c2 .sv"), t, S("i2c") - 0.05, { dy: 12, ds: 0.1 });
      pop(sc.$(".id-c2 .rs"), t, W("i2d", "la reutilizas") - 0.1, { dy: 12 });
      const pb = ramp(t, S("i3t") + 0.4, 1.2);
      sc.$(".id-c3 .b80").style.width = 80 * pb + "%";
      sc.$(".id-c3 .b20").style.width = 20 * ramp(t, S("i3t") + 1.4, 0.6) + "%";
      pop(sc.$(".id-c3 .g1"), t, S("i3a") + 0.1, { dy: 12 });
      [["c1", "los totales cuadren"], ["c2", "los insights"], ["c3", "no haya cifras"]].forEach(([c, w]) => pop(sc.$(".id-c3 ." + c), t, W("i3b", w) - 0.1, { dy: 12 }));
      pop(sc.$(".id-c3 .c4"), t, S("i3c"), { dy: 12 });
      pop(sc.$(".id-quote"), t, S("i3d"), { until: e3, dy: 14 });
      const sum = sc.$(".id-sum");
      sum.style.display = t > e3 - 0.2 ? "flex" : "none";
      [0, 1, 2].forEach((i) => pop(sc.$(".sm" + i), t, e3 + i * 0.18, { dy: 40 }));
    }
  }

  // =====================================================================
  // 8) LLAMADO A LA ACCIÓN
  // =====================================================================
  {
    const a = S("c1a") - 0.3, b = S("e1a") - 0.1;
    const item = (cls, t1, t2) => `<div class="${cls}" style="display:flex;align-items:center;gap:18px;padding:18px 22px;border:1px solid var(--line);border-radius:14px;background:#0d1628"><div style="width:48px;height:48px;border-radius:12px;background:#22d3ee1f;color:var(--cyan);display:grid;place-items:center;font-weight:800">${t2}</div><div style="flex:1;font-size:27px;font-weight:600">${t1}</div><div style="font-size:20px;color:var(--cyan);border:1px solid #22d3ee66;border-radius:10px;padding:6px 14px">Descargar</div></div>`;
    const sc = scene("cta", a, b, `
      <div class="center ct-desc" style="gap:34px"><div class="h-l">Los 2 prompts están en la descripción</div>
        <div style="display:flex;gap:26px"><div class="card d1" style="padding:26px 34px;font-size:30px;font-weight:700">Prompt 1 · <span class="muted">rápido</span></div><div class="card d2" style="padding:26px 34px;font-size:30px;font-weight:700;border-color:#22d3ee88">Prompt 2 · <span class="cyan">5 partes</span></div></div>
        <div class="dn cyan">${icon.down.replace('width="40" height="40"', 'width="90" height="90"')}</div></div>
      <div class="abs ct-com card" style="left:150px;top:90px;width:1620px;height:820px;display:grid;grid-template-columns:330px 1fr;overflow:hidden">
        <div style="background:#0b1222;border-right:1px solid var(--line);padding:30px 26px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px"><div style="width:44px;height:44px">${LOGO_SVG("ctg")}</div><div><div style="font-weight:800;font-size:26px">Comunidad Konek</div><div style="font-size:17px;color:var(--muted)">en Skool</div></div></div>
          <div class="nv nv0" style="font-size:24px;padding:12px 16px;border-radius:12px">Plantillas</div>
          <div class="nv nv1" style="font-size:24px;padding:12px 16px;border-radius:12px">Casos reales</div>
          <div class="nv nv2" style="font-size:24px;padding:12px 16px;border-radius:12px">Pregunta tu caso</div></div>
        <div style="position:relative;padding:34px 40px">
          <div class="pg pg0" style="position:absolute;inset:34px 40px;display:flex;flex-direction:column;gap:14px">
            <div class="h-s" style="margin-bottom:10px">Plantillas</div>
            ${item("it0", "Prompt de 5 partes · Ventas", "5")}${item("it1", "Prompt de 5 partes · Gastos", "5")}${item("it2", "Prompt de 5 partes · Cobranzas", "5")}${item("it3", "Prompt de 5 partes · Inventario", "5")}${item("it4", "Excel de práctica (datos ficticios)", "X")}</div>
          <div class="pg pg1" style="position:absolute;inset:34px 40px">
            <div class="h-s">Casos reales</div><div class="txt" style="margin-top:14px">Cómo estamos aplicando Claude en empresas: el problema, el prompt y el resultado.</div>
            <div style="display:flex;gap:20px;margin-top:30px">${["Finanzas", "Ventas", "Operaciones"].map((x) => `<div class="card" style="flex:1;height:260px;padding:24px;display:flex;flex-direction:column;justify-content:flex-end"><div style="font-size:18px;color:var(--cyan);font-weight:700;letter-spacing:.1em">CASO</div><div style="font-size:28px;font-weight:700">${x}</div></div>`).join("")}</div></div>
          <div class="pg pg2" style="position:absolute;inset:34px 40px">
            <div class="h-s">Pregunta sobre tu caso</div>
            <div style="margin-top:26px;border:1px solid #2f4168;background:#121c31;border-radius:16px;padding:24px;font-size:26px;color:#5d6a86;height:200px">Cuéntanos qué reporte quieres automatizar…</div></div>
        </div></div>
      <div class="abs ct-link pill" style="left:0;right:0;margin:0 auto;width:max-content;bottom:60px;font-size:30px;border-color:#22d3ee88"><span class="dot"></span>Link en la descripción ↓</div>
      <div class="center ct-biz" style="gap:30px"><div class="pill" style="font-size:26px">KONEK PARA EMPRESAS</div><div class="h-l" style="text-align:center">¿Quieres llevar esto a otro nivel?</div>
        <div style="display:flex;gap:26px"><div class="card b1" style="padding:34px 40px;font-size:32px;font-weight:700;width:560px">Dashboards conectados a tus propios datos</div><div class="card b2" style="padding:34px 40px;font-size:32px;font-weight:700;width:560px">Automatizaciones a medida</div></div>
        <div class="txt b3" style="font-size:32px">Escríbenos desde el mismo link.</div></div>
      <div class="center ct-sub" style="gap:46px">
        <div class="pill fv" style="font-size:26px"><span class="dot"></span>UN FAVOR RÁPIDO</div>
        <div class="h-l" style="text-align:center;max-width:1500px">Comenta: <span class="grad">¿qué reporte te quita más tiempo?</span></div>
        <div class="txt s2" style="font-size:32px">Con tus respuestas armo los próximos videos.</div>
        <div style="display:flex;align-items:center;gap:26px"><div class="sub-btn sb"></div><div class="bell" style="color:var(--ink);display:none">${icon.bell}</div></div></div>`,
      render);
    function render(t) {
      const e1 = S("c1b") - 0.1;
      pop(sc.$(".ct-desc .h-l"), t, S("c1a"), { until: e1 });
      pop(sc.$(".ct-desc .d1"), t, S("c1a") + 0.4, { until: e1 });
      pop(sc.$(".ct-desc .d2"), t, S("c1a") + 0.6, { until: e1 });
      const dn = sc.$(".ct-desc .dn");
      sty(dn, { o: env(t, S("c1a") + 0.8, e1, 0.3, 0.3), y: 12 * Math.sin(t * 6) });
      const comOn = t > S("c1b") - 0.4 && t < E("c2b") + 0.4;
      const com = sc.$(".ct-com");
      com.style.display = comOn ? "grid" : "none";
      if (comOn) {
        pop(com, t, S("c1b") - 0.1, { until: E("c2b") + 0.1, dy: 40 });
        const page = t >= W("c2a", "puedes preguntar") - 0.1 ? 2 : t >= W("c2a", "casos reales") - 0.2 ? 1 : 0;
        [0, 1, 2].forEach((i) => {
          sc.$(".nv" + i).style.background = page === i ? "#22d3ee1f" : "transparent";
          sc.$(".nv" + i).style.color = page === i ? "var(--cyan)" : "var(--ink-2)";
          sc.$(".pg" + i).style.display = page === i ? "block" : "none";
        });
        ["ventas", "gastos", "cobranzas", "inventario", "archivo de ejemplo"].forEach((w, i) => {
          const it = sc.$(".it" + i);
          pop(it, t, S("c1b") + 0.4 + i * 0.15, { dy: 14 });
          const on = env(t, W("c1b", w) - 0.15, W("c1b", w) + 1.6, 0.2, 0.5);
          it.style.borderColor = on > 0.01 ? `rgba(34,211,238,${0.25 + 0.75 * on})` : "var(--line)";
          it.style.boxShadow = on > 0.01 ? `0 0 ${30 * on}px rgba(34,211,238,${0.35 * on})` : "none";
        });
        pop(sc.$(".pg1"), t, W("c2a", "casos reales") - 0.2, { dy: 14 });
        pop(sc.$(".pg2"), t, W("c2a", "puedes preguntar") - 0.1, { dy: 14 });
      }
      pop(sc.$(".ct-link"), t, S("c2b") - 0.05, { until: E("c3b") + 0.2, dy: 20 });
      const bOn = t > S("c3a") - 0.4 && t < S("c4a");
      sc.$(".ct-biz").style.display = bOn ? "flex" : "none";
      if (bOn) {
        const eb = S("c4a") - 0.15;
        pop(sc.$(".ct-biz .pill"), t, S("c3a"), { until: eb });
        pop(sc.$(".ct-biz .h-l"), t, S("c3a") + 0.1, { until: eb });
        pop(sc.$(".ct-biz .b1"), t, W("c3a", "dashboards conectados") - 0.1, { until: eb });
        pop(sc.$(".ct-biz .b2"), t, W("c3a", "automatizaciones") - 0.1, { until: eb });
        pop(sc.$(".ct-biz .b3"), t, S("c3b") - 0.05, { until: eb });
      }
      const sOn = t > S("c4a") - 0.3;
      sc.$(".ct-sub").style.display = sOn ? "flex" : "none";
      if (sOn) {
        pop(sc.$(".ct-sub .fv"), t, S("c4a") + 0.05, { ds: 0.1 });
        pop(sc.$(".ct-sub .h-l"), t, W("c4a", "déjame") - 0.1);
        pop(sc.$(".ct-sub .s2"), t, S("c4b"));
        const tc = S("c4b") + 1.3;
        const btn = sc.$(".ct-sub .sb");
        const done = t >= tc;
        btn.innerHTML = done ? "✓ SUSCRITO" : "SUSCRIBIRME";
        btn.style.background = done ? "#273248" : "#e5322d";
        btn.style.color = done ? "var(--ink-2)" : "#fff";
        pop(btn, t, S("c4b") + 0.2, { ds: 0.2 });
        const bell = sc.$(".ct-sub .bell");
        bell.style.display = done ? "block" : "none";
        sty(bell, { o: ramp(t, tc + 0.1, 0.3), r: done ? 18 * Math.sin((t - tc) * 18) * Math.exp(-(t - tc) * 2.5) : 0 });
        if (t > S("c4b") + 0.2 && t < E("c4b") + 0.9) {
          const br = btn.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / 1920;
          const target = { x: (br.left - sr.left) / k + 120, y: (br.top - sr.top) / k + 44 };
          const p = easeIO((t - S("c4b") - 0.3) / 0.9);
          cur = { x: lerp(1500, target.x, p), y: lerp(1000, target.y, p) };
          if (t >= tc && t < tc + 0.45) {
            Object.assign(ripple.style, { left: cur.x + "px", top: cur.y + "px" });
            sty(ripple, { o: 1 - (t - tc) / 0.45, s: 0.4 + (t - tc) / 0.45 });
          }
        }
      }
    }
  }

  // =====================================================================
  // 9) CIERRE Y PUENTE AL SIGUIENTE VIDEO
  // =====================================================================
  {
    const a = S("e1a") - 0.3, b = S("endscreen") + 0.3;
    const sc = scene("cierre", a, b, `
      <div class="abs ce-dash" style="left:0;top:0;width:1600px;height:900px;transform-origin:0 0"></div>
      <div class="abs ce-dim" style="inset:0;background:#050912"></div>
      <div class="center ce-loop" style="gap:34px">
        <div class="card cal" style="padding:24px 40px;text-align:center"><div style="font-size:22px;color:var(--muted);font-weight:700;letter-spacing:.1em">EL PRÓXIMO MES</div><div class="h-m" style="margin-top:6px">Otra vez lo mismo</div></div>
        <div style="display:flex;gap:22px;align-items:center"><span class="chip l1">Nuevo archivo</span><span class="chip l2">Nuevo chat</span><span class="chip l3">Nuevo prompt</span><span class="lp muted" style="display:flex">${icon.loop}</span></div></div>
      <div class="center ce-q"><div class="h-l" style="text-align:center">¿Y si no tuvieras que hacerlo <span class="grad">nunca más</span>?</div></div>
      <div class="center ce-next" style="gap:44px">
        <div class="pill nx0" style="font-size:24px"><span class="dot"></span>PRÓXIMO VIDEO</div>
        <div class="h-l nx1" style="text-align:center">Tu reporte mensual <span class="grad">se hace solo</span></div>
        <div style="display:flex;align-items:center;gap:22px">
          <div class="card nf1" style="padding:26px 30px;font-size:28px;font-weight:700;text-align:center;width:330px">Archivo nuevo<div style="font-size:22px;color:var(--muted);font-weight:500;margin-top:4px">o tus datos conectados</div></div>
          <span class="nar1" style="font-size:44px;color:var(--muted)">→</span>
          <div class="card nf2" style="padding:26px 30px;font-size:28px;font-weight:700;text-align:center;width:250px;border-color:#22d3ee88;box-shadow:0 0 40px #22d3ee22">Claude</div>
          <span class="nar2" style="font-size:44px;color:var(--muted)">→</span>
          <div class="card nf3" style="padding:26px 30px;font-size:28px;font-weight:700;text-align:center;width:420px">Dashboard + narrativa<div style="font-size:22px;color:var(--muted);font-weight:500;margin-top:4px">para gerencia</div></div>
          <span class="chip nf4" style="font-size:26px;border-color:#a78bfa88;color:var(--violet)">${icon.loop.replace('width="56" height="56"', 'width="34" height="34"')}cada mes</span></div>
        <div class="txt nx2" style="font-size:34px">El video está <b style="color:var(--ink)">aquí arriba ↑</b></div></div>`,
      render);
    const dash = KV.createDashboard(2, sc.$(".ce-dash"));
    function render(t) {
      const d = sc.$(".ce-dash");
      dset(dash, {});
      const z = easeIO((t - a) / (S("e1b") - a + 0.5));
      const z2 = rampIO(t, S("e1b") - 0.1, 1.2);
      const s = lerp(lerp(1.42, 1.2, z), 0.78, z2);
      applyCam(d, { s, tx: (1920 - 1600 * s) / 2, ty: (1080 - 900 * s) / 2 });
      d.style.borderRadius = "14px";
      d.style.boxShadow = z2 > 0 ? "0 40px 120px #000c" : "none";
      sty(sc.$(".ce-dim"), { o: 0.86 * ramp(t, S("e1b"), 0.6) });
      d.style.filter = t > S("e1b") ? `blur(${6 * ramp(t, S("e1b"), 0.6)}px)` : "none";
      const lEnd = S("e2a") - 0.1;
      pop(sc.$(".ce-loop .cal"), t, W("e1b", "el próximo mes") - 0.1, { until: lEnd });
      [["l1", "Nuevo archivo"], ["l2", "nuevo chat"], ["l3", "nuevo prompt"]].forEach(([c, w]) => pop(sc.$(".ce-loop ." + c), t, W("e1c", w) - 0.1, { until: lEnd, ds: 0.1 }));
      const lp = sc.$(".ce-loop .lp");
      sty(lp, { o: Math.min(ramp(t, E("e1c") - 0.2, 0.3), 1 - ramp(t, lEnd, 0.3)), r: (t * 160) % 360 });
      sty(sc.$(".ce-loop"), { o: t > S("e1b") - 0.2 && t < lEnd + 0.35 ? 1 : 0 });
      pop(sc.$(".ce-q"), t, S("e2a") - 0.05, { until: S("e2b") - 0.05 });
      const nEnd = S("endscreen") + 0.1;
      pop(sc.$(".nx0"), t, S("e2b") - 0.05, { until: nEnd });
      pop(sc.$(".nx1"), t, W("e2b", "convertir") - 0.1, { until: nEnd });
      pop(sc.$(".nf1"), t, W("e2b", "subes el archivo") - 0.1, { until: nEnd });
      pop(sc.$(".nar1"), t, W("e2b", "lo conectas") - 0.1, { until: nEnd, dy: 0 });
      pop(sc.$(".nf2"), t, W("e2b", "Claude hace") - 0.15, { until: nEnd });
      pop(sc.$(".nar2"), t, W("e2b", "Claude hace") + 0.2, { until: nEnd, dy: 0 });
      pop(sc.$(".nf3"), t, W("e2b", "incluida la narrativa") - 0.1, { until: nEnd });
      pop(sc.$(".nf4"), t, W("e2b", "incluida la narrativa") + 0.4, { until: nEnd, ds: 0.2 });
      pop(sc.$(".nx2"), t, S("e3a") - 0.05, { until: nEnd });
      sty(sc.$(".ce-next"), { o: t > S("e2b") - 0.2 ? 1 : 0 });
    }
  }

  // =====================================================================
  // 10) PANTALLA FINAL (20 s para los elementos de YouTube)
  // =====================================================================
  {
    const a = S("endscreen");
    const sc = scene("endscreen", a, DUR + 1, `
      <div class="abs" style="left:72px;top:56px;display:flex;align-items:center;gap:16px"><div style="width:64px;height:64px">${LOGO_SVG("esg")}</div><div><div style="font-weight:800;font-size:34px">Konek</div><div style="font-size:18px;letter-spacing:.28em;color:var(--ink-2);font-weight:600">FINANZAS &amp; IA</div></div></div>
      <div class="abs es-t" style="left:0;right:0;top:80px;text-align:center;font-size:24px;letter-spacing:.2em;color:var(--muted);font-weight:700">SIGUIENTE VIDEO</div>
      <div class="endslot es-v" style="left:536px;top:130px;width:848px;height:477px;flex-direction:column;gap:10px">Siguiente video</div>
      <div class="abs es-sub" style="left:536px;top:690px;width:250px;text-align:center"><div class="endslot" style="position:relative;width:250px;height:250px;border-radius:50%">Suscríbete</div></div>
      <div class="endslot es-l" style="left:836px;top:690px;width:548px;height:250px">Otro video recomendado</div>
      <div class="abs es-c" style="left:0;right:0;bottom:40px;text-align:center;font-size:26px;color:var(--ink-2)">Plantillas y comunidad: <span class="cyan">link en la descripción</span></div>`,
      render, { fi: 0.5, fo: 0.01 });
    function render(t) {
      pop(sc.$(".es-v"), t, a + 0.2, { dy: 20 });
      pop(sc.$(".es-sub"), t, a + 0.4, { dy: 20 });
      pop(sc.$(".es-l"), t, a + 0.55, { dy: 20 });
      pop(sc.$(".es-c"), t, a + 0.8, { dy: 10 });
    }
  }

  // ---------- capítulos ----------
  const CAPS = [
    ["p1a", "EL PROBLEMA", "Por qué tus reportes no funcionan"],
    ["d1a", "PASO 0", "Los datos"],
    ["tipeo1", "PASO 1", "El prompt rápido"],
    ["q1a", "PASO 2", "El prompt que piensa antes de diseñar"],
  ];

  // ---------- render de un cuadro ----------
  function renderFrame(t) {
    cur = null;
    sty(ripple, { o: 0 });
    // fondo vivo
    const b1 = bg.querySelector(".b1"), b2 = bg.querySelector(".b2");
    b1.style.left = 980 + 260 * Math.cos(t * 0.11) + "px"; b1.style.top = -260 + 180 * Math.sin(t * 0.09) + "px";
    b2.style.left = -240 + 220 * Math.sin(t * 0.07) + "px"; b2.style.top = 480 + 160 * Math.cos(t * 0.1) + "px";
    for (const sc of scenes) {
      const on = t >= sc.from && t < sc.to;
      if (!on) { if (sc.vis) { sc.el.style.display = "none"; sc.vis = false; } continue; }
      if (!sc.vis) { sc.el.style.display = "block"; sc.vis = true; }
      sc.el.style.opacity = Math.min(sc.from <= 0 ? 1 : ramp(t, sc.from, sc.fi), 1 - clamp01((t - (sc.to - sc.fo)) / sc.fo));
      sc.render(t, sc);
    }
    // capítulo
    let cap = null;
    for (const [id, n, name] of CAPS) if (t >= S(id) - 0.1 && t < S(id) + 3.6) cap = [S(id) - 0.1, n, name];
    if (cap) {
      chapter.querySelector(".num").textContent = cap[1];
      chapter.querySelector(".name").textContent = cap[2];
      sty(chapter, { o: env(t, cap[0], cap[0] + 3.7, 0.35, 0.4), x: -30 * (1 - ramp(t, cap[0], 0.45)) });
    } else sty(chapter, { o: 0 });
    // marca de agua (fuera del logo y la pantalla final)
    sty(wm, { o: t > E("logo") && t < S("endscreen") ? 0.55 : 0 });
    // cursor
    if (cur) { sty(cursor, { o: 1, x: cur.x - 6, y: cur.y - 4 }); } else sty(cursor, { o: 0 });
  }

  window.renderFrame = renderFrame;
  window.VIDEO_DURATION = DUR;
  window.VIDEO_READY = true;
})();
