/* Dashboards del video "De Excel a dashboard ejecutivo con Claude".
 * Un mismo código sirve para los archivos HTML de material/ (interactivos) y para las escenas del video,
 * que fijan el estado cuadro a cuadro con setState({ progress, filter, hover }).
 */
(function () {
  const D = window.KONEK_DATA;

  // ---------- utilidades ----------
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  // progreso escalonado del elemento i de n (para animar entradas en cascada)
  const stag = (p, i, n, span = 0.55) => ease((p - (i * (1 - span)) / Math.max(1, n - 1)) / span);
  const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const MINUS = "−";
  const money = (v) => (v < 0 ? MINUS : "") + "S/ " + nf0.format(Math.round(Math.abs(v)));
  const millones = (v) => "S/ " + (v / 1e6).toFixed(2) + " M";
  const mil = (v) => {
    const a = Math.abs(v);
    return a >= 100000 ? Math.round(a / 1000) + " mil" : (a / 1000).toFixed(1) + " mil";
  };
  const smil = (v) => (v >= 0 ? "+" : MINUS) + "S/ " + mil(v);
  const smilShort = (v) => (v >= 0 ? "+" : MINUS) + mil(v);
  const pct = (v, d = 1) => (v >= 0 ? "+" : MINUS) + Math.abs(v * 100).toFixed(d) + "%";
  const share = (v, d = 0) => (v * 100).toFixed(d) + "%";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return "rgb(" + A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",") + ")";
  }
  const CAT_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
  const catColor = (c) => CAT_COLORS[D.categorias.indexOf(c)];
  const HM_NEUTRAL = "#283041", HM_UP = "#d84a4a", HM_DOWN = "#3987e5";

  // barra horizontal con extremo derecho redondeado (anclada a la base izquierda)
  function hbar(x, y, w, h, r = 4) {
    if (w <= 0) return "";
    r = Math.min(r, w, h / 2);
    return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}z`;
  }
  // barra vertical con extremo redondeado lejos de la base; up=true crece hacia arriba
  function vbar(x, y, w, h, up = true, r = 4) {
    if (h <= 0.5) return "";
    r = Math.min(r, h, w / 2);
    if (up) return `M${x},${y + h}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}z`;
    return `M${x},${y}v${h - r}a${r},${r} 0 0 0 ${r},${r}h${w - 2 * r}a${r},${r} 0 0 0 ${r},${-r}v${-(h - r)}z`;
  }
  function niceStep(span, n = 4) {
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  }

  // ---------- agregación (con filtro de área opcional) ----------
  function agg(area) {
    const areas = area ? [area] : D.areas;
    const byCat = {}, byArea = {};
    let t25 = 0, t26 = 0;
    D.categorias.forEach((c) => (byCat[c] = [0, 0]));
    areas.forEach((a) => {
      byArea[a] = [0, 0];
      D.categorias.forEach((c) => {
        const [x, y] = D.gasto[a][c];
        byCat[c][0] += x; byCat[c][1] += y;
        byArea[a][0] += x; byArea[a][1] += y;
        t25 += x; t26 += y;
      });
    });
    return { areas, byCat, byArea, t25, t26, dv: t26 - t25, dp: (t26 - t25) / t25 };
  }
  const ALL = agg(null);

  // ---------- gráficos (devuelven SVG; tips = mapa clave -> html del tooltip) ----------
  function tipRows(title, rows) {
    return `<b>${esc(title)}</b>` + rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("");
  }

  function chartBarsByArea(w, h, st, tips) {
    const A = ALL, labelW = 104, valW = 150, top = 26;
    const max = Math.max(...D.areas.map((a) => A.byArea[a][1]), ...D.areas.map((a) => A.byArea[a][0]));
    const rowH = (h - top) / D.areas.length;
    const sx = (v) => (v / max) * (w - labelW - valW);
    let s = `<g font-size="12" fill="var(--ink-2)">
      <rect x="${labelW}" y="2" width="10" height="10" rx="3" fill="var(--s2025)"/><text x="${labelW + 16}" y="11">Sep 2025</text>
      <rect x="${labelW + 90}" y="2" width="10" height="10" rx="3" fill="var(--s2026)"/><text x="${labelW + 106}" y="11">Sep 2026</text></g>`;
    // rejilla
    const step = niceStep(max, 4);
    for (let v = 0; v <= max; v += step) {
      const x = labelW + sx(v);
      s += `<line x1="${x}" x2="${x}" y1="${top - 4}" y2="${h}" stroke="var(--grid)" stroke-width="1"/>`;
      s += `<text x="${x}" y="${h + 14}" font-size="11" fill="var(--muted)" text-anchor="middle" class="num">${v === 0 ? "0" : (v / 1e6).toFixed(1) + " M"}</text>`;
    }
    D.areas.forEach((a, i) => {
      const [v25, v26] = A.byArea[a];
      const p = stag(st.progress, i, D.areas.length);
      const y = top + i * rowH + rowH / 2 - 12;
      const key = "bar:" + a;
      tips[key] = tipRows(a, [["Sep 2025", money(v25)], ["Sep 2026", money(v26)], ["Variación", smil(v26 - v25) + " (" + pct((v26 - v25) / v25) + ")"]]);
      const hov = st.hover === key;
      s += `<g data-tip="${key}">
        <rect x="0" y="${y - 6}" width="${w}" height="${rowH - 2}" fill="${hov ? "#ffffff0d" : "transparent"}" rx="6"/>
        <text x="0" y="${y + 15}" font-size="13" fill="var(--ink)">${esc(a)}</text>
        <path d="${hbar(labelW, y, sx(v25) * p, 9)}" fill="var(--s2025)"/>
        <path d="${hbar(labelW, y + 11, sx(v26) * p, 12)}" fill="var(--s2026)" class="glow" style="color:#3987e5"/>
        <text x="${labelW + sx(v26) * p + 10}" y="${y + 21}" font-size="12.5" fill="var(--ink)" opacity="${p}" class="num">${(v26 / 1e6).toFixed(2)} M <tspan fill="${v26 >= v25 ? "var(--bad-ink)" : "var(--good-ink)"}">${pct((v26 - v25) / v25)}</tspan></text>
      </g>`;
    });
    return `<svg width="${w}" height="${h + 16}" viewBox="0 0 ${w} ${h + 16}">${s}</svg>`;
  }

  function chartDonut(w, h, st, tips) {
    const A = ALL, cx = Math.min(h / 2, 130) + 6, cy = h / 2, R = Math.min(h / 2 - 6, 118), r = R * 0.64;
    const p = ease(st.progress);
    let s = "", ang = -Math.PI / 2;
    const gap = 0.022;
    D.categorias.forEach((c, i) => {
      const v = A.byCat[c][1], frac = v / A.t26;
      const a0 = ang + gap / 2, a1 = ang + frac * 2 * Math.PI * p - gap / 2;
      ang += frac * 2 * Math.PI * p;
      const key = "cat:" + c;
      tips[key] = tipRows(c, [["Sep 2026", money(v)], ["Peso", share(frac, 1)], ["vs 2025", pct((v - A.byCat[c][0]) / A.byCat[c][0])]]);
      if (a1 <= a0) return;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const hov = st.hover === key;
      const RR = hov ? R + 5 : R;
      const P = (rad, a) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
      s += `<path data-tip="${key}" d="M${P(RR, a0)}A${RR},${RR} 0 ${large} 1 ${P(RR, a1)}L${P(r, a1)}A${r},${r} 0 ${large} 0 ${P(r, a0)}Z" fill="${CAT_COLORS[i]}" class="glow" style="color:${CAT_COLORS[i]}"/>`;
    });
    s += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12" fill="var(--muted)">Total sep 2026</text>
          <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--ink)">${millones(A.t26)}</text>`;
    const lx = cx + R + 34, rowH = Math.min(38, (h - 10) / D.categorias.length);
    const ly0 = cy - (rowH * D.categorias.length) / 2;
    D.categorias.forEach((c, i) => {
      const v = A.byCat[c][1], y = ly0 + i * rowH, key = "cat:" + c;
      s += `<g data-tip="${key}" opacity="${stag(st.progress, i, 5)}">
        <rect x="${lx}" y="${y + 6}" width="12" height="12" rx="3" fill="${CAT_COLORS[i]}"/>
        <text x="${lx + 22}" y="${y + 17}" font-size="13.5" fill="var(--ink)">${c}</text>
        <text x="${w - 70}" y="${y + 17}" font-size="13" fill="var(--ink-2)" text-anchor="end" class="num">${(v / 1e6).toFixed(2)} M</text>
        <text x="${w}" y="${y + 17}" font-size="13" fill="var(--ink)" font-weight="600" text-anchor="end" class="num">${share(v / A.t26, 1)}</text>
      </g>`;
    });
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
  }

  // pasos: [{label, value, total:bool, key, tip}]
  function chartWaterfall(w, h, st, tips, steps, opts = {}) {
    const leftAx = 58, bottom = 34, top = 18, plotH = h - bottom - top, plotW = w - leftAx;
    let run = 0;
    const bars = steps.map((s) => {
      if (s.total) { run = s.value; return { ...s, y0: 0, y1: s.value }; }
      const y0 = run; run += s.value; return { ...s, y0, y1: run };
    });
    const vals = bars.flatMap((b) => (b.total ? [b.y1] : [b.y0, b.y1]));
    const lo0 = Math.min(...vals), hi0 = Math.max(...vals), span = Math.max(hi0 - lo0, 1);
    const step = niceStep(span * 1.6, 4);
    const lo = Math.floor((lo0 - span * 0.45) / step) * step, hi = Math.ceil((hi0 + span * 0.25) / step) * step;
    const sy = (v) => top + plotH - ((v - lo) / (hi - lo)) * plotH;
    let s = "";
    for (let v = lo; v <= hi + 1; v += step) {
      const y = sy(v);
      s += `<line x1="${leftAx}" x2="${w}" y1="${y}" y2="${y}" stroke="var(--grid)"/>`;
      s += `<text x="${leftAx - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--muted)" class="num">${(v / 1e6).toFixed(step % 1e5 === 0 ? 1 : 2)} M</text>`;
    }
    s += `<text x="${w}" y="${top - 8}" text-anchor="end" font-size="11" fill="var(--muted)">eje desde S/ ${(lo / 1e6).toFixed(step % 1e5 === 0 ? 1 : 2)} M</text>`;
    const slot = plotW / bars.length, bw = Math.min(54, slot * 0.58);
    bars.forEach((b, i) => {
      const p = stag(st.progress, i, bars.length, 0.4);
      const x = leftAx + i * slot + (slot - bw) / 2;
      const hov = st.hover === b.key;
      if (b.tip) tips[b.key] = b.tip;
      let fill, yTop, hgt, up = true;
      if (b.total) {
        fill = b.color || "var(--s2026)";
        yTop = sy(b.y1); hgt = sy(lo) - sy(b.y1);
        const hh = hgt * p;
        s += `<g data-tip="${b.key}"><rect x="${x - 6}" y="${top}" width="${bw + 12}" height="${plotH}" fill="${hov ? "#ffffff0d" : "transparent"}" rx="6"/>
          <path d="${vbar(x, sy(lo) - hh, bw, hh, true)}" fill="${fill}"/>
          <text x="${x + bw / 2}" y="${yTop - 8}" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--ink)" opacity="${p}" class="num">${(b.y1 / 1e6).toFixed(2)} M</text></g>`;
      } else {
        const pos = b.value >= 0;
        fill = pos ? "var(--bad)" : "var(--good)";
        const yA = sy(Math.max(b.y0, b.y1)), yB = sy(Math.min(b.y0, b.y1));
        hgt = Math.max(2, yB - yA);
        const hh = hgt * p;
        // crece desde el nivel previo
        const ys = pos ? yB - hh : yA;
        s += `<g data-tip="${b.key}"><rect x="${x - 6}" y="${top}" width="${bw + 12}" height="${plotH}" fill="${hov ? "#ffffff0d" : "transparent"}" rx="6"/>
          <path d="${vbar(x, ys, bw, hh, pos)}" fill="${fill}" class="glow" style="color:${pos ? "#d03b3b" : "#0ca30c"}"/>
          <text x="${x + bw / 2}" y="${pos ? yA - 8 : yB + 16}" text-anchor="middle" font-size="12" font-weight="600" fill="${pos ? "var(--bad-ink)" : "var(--good-ink)"}" opacity="${p}" class="num">${smilShort(b.value)}</text></g>`;
      }
      if (i < bars.length - 1) {
        const yc = sy(b.y1), nx = leftAx + (i + 1) * slot + (slot - bw) / 2;
        s += `<line x1="${x + bw}" x2="${nx}" y1="${yc}" y2="${yc}" stroke="#4a5878" stroke-width="1" opacity="${p}"/>`;
      }
      s += `<text x="${x + bw / 2}" y="${top + plotH + 16}" text-anchor="middle" font-size="12" fill="${b.total ? "var(--ink)" : "var(--ink-2)"}" font-weight="${b.total ? 600 : 400}">${esc(b.label)}</text>`;
    });
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
  }

  function waterfallAreas(st) {
    const A = ALL;
    const steps = [{ label: "Sep 2025", value: A.t25, total: true, color: "var(--s2025)", key: "wf:2025", tip: tipRows("Septiembre 2025", [["Gasto total", money(A.t25)]]) }];
    D.areas.forEach((a) => {
      const d = A.byArea[a][1] - A.byArea[a][0];
      steps.push({ label: a, value: d, key: "wf:" + a, tip: tipRows(a, [["Variación", smil(d)], ["vs 2025", pct(d / A.byArea[a][0])], ["Peso en la variación", share(d / A.dv)]]) });
    });
    steps.push({ label: "Sep 2026", value: A.t26, total: true, key: "wf:2026", tip: tipRows("Septiembre 2026", [["Gasto total", money(A.t26)], ["Variación", smil(A.dv) + " (" + pct(A.dp) + ")"]]) });
    return steps;
  }
  function waterfallCats(area) {
    const G = agg(area);
    const steps = [{ label: "Sep 2025", value: G.t25, total: true, color: "var(--s2025)", key: "wf:2025", tip: tipRows(area + " · sep 2025", [["Gasto", money(G.t25)]]) }];
    D.categorias.forEach((c) => {
      const d = G.byCat[c][1] - G.byCat[c][0];
      steps.push({ label: c, value: d, key: "wf:" + c, tip: tipRows(area + " · " + c, [["Variación", smil(d)], ["vs 2025", pct(d / G.byCat[c][0])]]) });
    });
    steps.push({ label: "Sep 2026", value: G.t26, total: true, key: "wf:2026", tip: tipRows(area + " · sep 2026", [["Gasto", money(G.t26)], ["Variación", smil(G.dv) + " (" + pct(G.dp) + ")"]]) });
    return steps;
  }

  function chartHeatmap(w, h, st, tips, opts = {}) {
    const labelW = 100, top = 22, legendH = 26;
    const cols = D.categorias, rows = D.areas;
    const cw = (w - labelW) / cols.length, ch = (h - top - legendH) / rows.length;
    let maxAbs = 0;
    rows.forEach((a) => cols.forEach((c) => (maxAbs = Math.max(maxAbs, Math.abs(D.gasto[a][c][1] - D.gasto[a][c][0])))));
    let s = "";
    cols.forEach((c, j) => (s += `<text x="${labelW + j * cw + cw / 2}" y="13" text-anchor="middle" font-size="12" fill="var(--ink-2)">${c}</text>`));
    rows.forEach((a, i) => {
      const dim = opts.focus && opts.focus !== a;
      s += `<text x="0" y="${top + i * ch + ch / 2 + 4}" font-size="13" fill="${dim ? "var(--muted)" : "var(--ink)"}">${esc(a)}</text>`;
      cols.forEach((c, j) => {
        const [x25, x26] = D.gasto[a][c], d = x26 - x25, t = Math.abs(d) / maxAbs;
        const p = stag(st.progress, i * cols.length + j, rows.length * cols.length, 0.3);
        const color = d >= 0 ? mix(HM_NEUTRAL, HM_UP, Math.pow(t, 0.8)) : mix(HM_NEUTRAL, HM_DOWN, Math.pow(t, 0.8));
        const key = "hm:" + a + ":" + c, hov = st.hover === key;
        tips[key] = tipRows(a + " · " + c, [["Sep 2025", money(x25)], ["Sep 2026", money(x26)], ["Variación", smil(d) + " (" + pct(d / x25) + ")"]]);
        const x = labelW + j * cw + 1, y = top + i * ch + 1;
        s += `<g data-tip="${key}" opacity="${(dim ? 0.35 : 1) * p}">
          <rect x="${x}" y="${y}" width="${cw - 2}" height="${ch - 2}" rx="5" fill="${color}" ${hov ? `stroke="#22d3ee" stroke-width="2.5" style="filter:drop-shadow(0 0 6px #22d3ee)"` : ""}/>
          <text x="${x + (cw - 2) / 2}" y="${y + (ch - 2) / 2 + 4.5}" text-anchor="middle" font-size="12.5" font-weight="${t > 0.45 ? 700 : 500}" fill="${t > 0.45 ? "#fff" : "var(--ink-2)"}" class="num">${smilShort(d)}</text>
        </g>`;
      });
    });
    // leyenda de escala divergente
    const ly = h - 12, lw = 180, lx = w - lw;
    s += `<defs><linearGradient id="hmg${opts.id || ""}" x1="0" x2="1"><stop offset="0" stop-color="${HM_DOWN}"/><stop offset="0.5" stop-color="${HM_NEUTRAL}"/><stop offset="1" stop-color="${HM_UP}"/></linearGradient></defs>
      <text x="${lx - 8}" y="${ly + 4}" font-size="11" fill="var(--muted)" text-anchor="end">Baja ${MINUS}${mil(maxAbs)}</text>
      <rect x="${lx}" y="${ly - 5}" width="${lw - 70}" height="10" rx="5" fill="url(#hmg${opts.id || ""})"/>
      <text x="${lx + lw - 64}" y="${ly + 4}" font-size="11" fill="var(--muted)">Sube +${mil(maxAbs)}</text>`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
  }

  function chartStacked100(w, h, st, tips, area) {
    const G = agg(area), labelW = 74, top = 34;
    const rows = [["Sep 2025", 0, G.t25], ["Sep 2026", 1, G.t26]];
    const bh = Math.min(46, (h - top - 20) / 2 - 16);
    let s = `<g font-size="12" fill="var(--ink-2)">`;
    let lx = labelW;
    D.categorias.forEach((c, i) => {
      s += `<rect x="${lx}" y="3" width="10" height="10" rx="3" fill="${CAT_COLORS[i]}"/><text x="${lx + 16}" y="12">${c}</text>`;
      lx += 26 + c.length * 7.2;
    });
    s += `</g>`;
    const p = ease(st.progress);
    rows.forEach(([lbl, idx, tot], r) => {
      const y = top + 10 + r * (bh + 34);
      s += `<text x="0" y="${y + bh / 2 + 5}" font-size="13" fill="var(--ink)" font-weight="${idx ? 600 : 400}">${lbl}</text>`;
      let x = labelW;
      const W = (w - labelW) * p;
      D.categorias.forEach((c, i) => {
        const v = G.byCat[c][idx], f = v / tot, sw = Math.max(0, f * W - 2);
        const key = "st:" + idx + ":" + c, hov = st.hover === key;
        tips[key] = tipRows(c + " · " + lbl, [["Gasto", money(v)], ["Peso", share(f, 1)]]);
        s += `<g data-tip="${key}"><rect x="${x}" y="${y}" width="${sw}" height="${bh}" rx="${i === 0 || i === 4 ? 6 : 2}" fill="${CAT_COLORS[i]}" ${hov ? 'stroke="#fff" stroke-width="2"' : ""}/>`;
        const txt = share(f, f < 0.1 ? 1 : 0);
        if (sw > txt.length * 8 + 10) s += `<text x="${x + sw / 2}" y="${y + bh / 2 + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" class="num">${txt}</text>`;
        s += `</g>`;
        x += f * W;
      });
    });
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
  }

  // ---------- textos del dashboard 2 (todo sale de los datos) ----------
  const PREGUNTA = {
    Alquiler: "¿Local nuevo o ajuste de contrato? Si es recurrente, impacta todo el año.",
    Software: "Revisar licencias por usuario activo y contratos que se renuevan.",
    Servicios: "¿Proveedor nuevo o más volumen? Pedir el detalle por proveedor.",
    Personal: "¿Más personas o ajuste salarial? Cruzar con la planilla.",
    Viajes: "¿Más viajes o tarifas más altas? Revisar contra la política de viajes.",
  };
  function movimientos(area) {
    const areas = area ? [area] : D.areas, out = [];
    areas.forEach((a) => D.categorias.forEach((c) => {
      const [x, y] = D.gasto[a][c];
      out.push({ a, c, d: y - x, p: (y - x) / x });
    }));
    return out.sort((m, n) => n.d - m.d);
  }
  function narrativa(area) {
    const G = agg(area), mov = movimientos(area);
    const verbo = G.dv >= 0 ? "subió" : "bajó";
    if (!area) {
      const topA = D.areas.map((a) => [a, G.byArea[a][1] - G.byArea[a][0]]).sort((x, y) => y[1] - x[1]);
      const m0 = mov.filter((m) => m.a === topA[0][0])[0];
      const cats = D.categorias.map((c) => [c, G.byCat[c][1] - G.byCat[c][0], (G.byCat[c][1] - G.byCat[c][0]) / G.byCat[c][0]]).sort((x, y) => y[2] - x[2]);
      const catTop = cats[0], catTopArea = mov.filter((m) => m.c === catTop[0])[0];
      const bajan = topA.filter((x) => x[1] < 0);
      return `El gasto de septiembre <b>${verbo} ${pct(G.dp)} (${smil(G.dv)})</b> y llegó a ${millones(G.t26)}. ` +
        `<b>${share(topA[0][1] / G.dv)} del alza viene de ${topA[0][0]}</b>, sobre todo por ${m0.c} (${smil(m0.d)}, ${pct(m0.p, 0)}). ` +
        `${catTop[0]} es la categoría que más crece (${pct(catTop[2], 0)}), concentrada en ${catTopArea.a}. ` +
        (bajan.length ? `${bajan.map((b) => b[0]).join(" y ")} ${bajan.length > 1 ? "son las únicas áreas que bajan" : "es la única área que baja"} (${bajan.map((b) => pct(b[1] / G.byArea[b[0]][0])).join(", ")}).` : "");
    }
    const m0 = mov[0], last = mov[mov.length - 1];
    return `<b>${area} ${verbo} ${pct(G.dp)} (${smil(G.dv)})</b> y llegó a ${money(G.t26)}. ` +
      (G.dv > 0 ? `<b>${m0.c} explica el ${share(m0.d / G.dv)} de la variación</b> (${smil(m0.d)}, ${pct(m0.p, 0)}). ` : `La mayor alza es ${m0.c} (${smil(m0.d)}). `) +
      (last.d < 0 ? `Lo compensa en parte ${last.c} (${smil(last.d)}, ${pct(last.p, 0)}).` : "");
  }
  function insights(area) {
    const mov = movimientos(area);
    const ups = mov.filter((m) => m.d > 0).slice(0, area ? 2 : 3);
    const downs = mov.filter((m) => m.d < 0).slice(-1);
    return [...ups, ...downs.reverse()].map((m) => ({
      up: m.d >= 0,
      t: `${m.a} · ${m.c}: ${smil(m.d)} (${pct(m.p, 0)})`,
      q: m.d >= 0 ? PREGUNTA[m.c] : "Ahorro: confirmar si se sostiene en los próximos meses.",
    }));
  }

  // ---------- plantillas ----------
  function kpi(lbl, val, det, cls = "") {
    return `<div class="kd-card kd-kpi"><div class="lbl">${lbl}</div><div class="val ${cls}">${val}</div><div class="det">${det}</div></div>`;
  }
  function tablaHTML() {
    let r = `<table><thead><tr><th>Área</th><th>Categoría</th><th>Sep 2025</th><th>Sep 2026</th><th>Variación S/</th><th>Variación %</th></tr></thead><tbody>`;
    D.areas.forEach((a) => D.categorias.forEach((c) => {
      const [x, y] = D.gasto[a][c];
      r += `<tr><td>${a}</td><td>${c}</td><td>${money(x)}</td><td>${money(y)}</td><td>${money(y - x)}</td><td>${pct((y - x) / x)}</td></tr>`;
    }));
    r += `<tr><td><b>Total</b></td><td></td><td><b>${money(ALL.t25)}</b></td><td><b>${money(ALL.t26)}</b></td><td><b>${money(ALL.dv)}</b></td><td><b>${pct(ALL.dp)}</b></td></tr></tbody></table>`;
    return r;
  }

  function skeleton1(st) {
    const A = ALL;
    const drv = D.areas.map((a) => [a, A.byArea[a][1] - A.byArea[a][0]]).sort((x, y) => y[1] - x[1])[0];
    const cat = D.categorias.map((c) => [c, (A.byCat[c][1] - A.byCat[c][0]) / A.byCat[c][0], A.byCat[c][1] - A.byCat[c][0]]).sort((x, y) => y[1] - x[1])[0];
    return `<div class="kd-head"><div><h1 class="kd-title">Análisis de gastos por área</h1>
        <div class="kd-sub">Septiembre 2026 vs septiembre 2025 · Cifras en soles (S/) · Fuente: exportación del ERP</div></div>
        <div style="display:flex;gap:10px;align-items:center"><span class="badge">Sep 2026</span><button class="kd-btn" data-act="table">Ver tabla</button></div></div>
      <div class="kd-kpis">
        ${kpi("Gasto total", money(A.t26), "vs " + money(A.t25) + " en sep 2025")}
        ${kpi("Variación vs 2025", smil(A.dv), `<span class="up">▲ ${pct(A.dp)}</span> interanual`, "up")}
        ${kpi("Principal driver", drv[0], `${smil(drv[1])} · ${share(drv[1] / A.dv)} de la variación`)}
        ${kpi("Mayor alza por categoría", cat[0], `<span class="up">▲ ${pct(cat[1])}</span> · ${smil(cat[2])}`)}
      </div>
      <div class="row2">
        <div class="kd-card"><h3>Gasto por área <small>sep 2025 vs sep 2026</small></h3><div class="kd-chart" data-chart="bars"></div></div>
        <div class="kd-card"><h3>Gasto por categoría <small>sep 2026</small></h3><div class="kd-chart" data-chart="donut"></div></div>
      </div>
      <div class="row3">
        <div class="kd-card"><h3>Cascada: de sep 2025 a sep 2026 por área</h3><div class="kd-chart" data-chart="wf"></div></div>
        <div class="kd-card"><h3>Mapa de calor <small>variación S/ · área × categoría</small></h3><div class="kd-chart" data-chart="hm"></div></div>
      </div>`;
  }

  function skeleton2(st) {
    const area = st.filter || null, G = agg(area);
    const chips = ["Todas", ...D.areas].map((a) => {
      const on = (a === "Todas" && !area) || a === area;
      return `<button class="chip ${on ? "on" : ""}" data-filter="${a === "Todas" ? "" : a}" aria-pressed="${on}">${a}</button>`;
    }).join("");
    let k3, k4;
    if (!area) {
      const topA = D.areas.map((a) => [a, G.byArea[a][1] - G.byArea[a][0]]).sort((x, y) => y[1] - x[1]);
      k3 = kpi("Concentración del alza", share((topA[0][1] + topA[1][1]) / G.dv), `${topA[0][0]} + ${topA[1][0]} explican la variación`);
    } else {
      const m0 = movimientos(area)[0];
      k3 = kpi("Mayor driver del área", m0.c, `${smil(m0.d)} · ${G.dv > 0 ? share(m0.d / G.dv) + " de la variación" : pct(m0.p)}`);
    }
    const catW = D.categorias.map((c) => [c, G.byCat[c][1] / G.t26, G.byCat[c][0] / G.t25]).sort((x, y) => y[1] - x[1])[0];
    k4 = kpi("Mayor peso en el gasto", `${catW[0]} ${share(catW[1], 1)}`, `del gasto total · ${share(catW[2], 1)} en 2025`);
    return `<div class="kd-head"><div><h1 class="kd-title">Gastos de septiembre 2026${area ? " · " + area : ""}</h1>
        <div class="kd-sub">Resumen para Gerencia General y CFO · comparado con septiembre 2025 · S/</div></div>
        <div class="filters"><span class="lbl">Área</span>${chips}<button class="kd-btn" data-act="table" style="margin-left:6px">Ver datos</button></div></div>
      <div class="kd-card story"><span class="tag">Lo que pasó</span><p>${narrativa(area)}</p><span class="check">✓ Totales cuadran con el Excel · 60 filas</span></div>
      <div class="kd-kpis">
        ${kpi("Gasto total", millones(G.t26), "vs " + millones(G.t25) + " en sep 2025")}
        ${kpi("Variación vs 2025", smil(G.dv), `<span class="${G.dv >= 0 ? "up" : "down"}">${G.dv >= 0 ? "▲" : "▼"} ${pct(G.dp)}</span> interanual`, G.dv >= 0 ? "up" : "down")}
        ${k3}${k4}
      </div>
      <div class="rowA">
        <div class="kd-card"><h3>¿Qué explica la variación? <small>${area ? "por categoría · " + area : "por área"}</small></h3><div class="kd-chart" data-chart="wf"></div></div>
        <div class="kd-card"><h3>Peso de cada categoría en el gasto total <small>${area || "toda la empresa"}</small></h3><div class="kd-chart" data-chart="st"></div></div>
      </div>
      <div class="rowB">
        <div class="kd-card"><h3>Dónde cambió el gasto <small>variación S/ · área × categoría</small></h3><div class="kd-chart" data-chart="hm"></div></div>
        <div class="kd-card"><h3>Insights y preguntas para la reunión</h3><ul class="ins">${insights(area).map((i) => `<li><span class="ic ${i.up ? "up" : "down"}">${i.up ? "▲" : "▼"}</span><div><b>${i.t}</b><span class="q">${i.q}</span></div></li>`).join("")}</ul></div>
      </div>`;
  }

  let instancias = 0;
  function createDashboard(kind, root, init = {}) {
    const st = { progress: 1, filter: null, hover: null, glow: 1, table: false, ...init };
    const uid = ++instancias;
    const box = document.createElement("div");
    box.className = "kd " + (kind === 1 ? "kd1" : "kd2");
    root.appendChild(box);
    let tips = {};
    function render() {
      // oculto (p. ej. escena del video que aún no se muestra): se dibuja cuando sea visible
      if (!box.offsetWidth) { api.dirty = true; return; }
      api.dirty = false;
      tips = {};
      box.style.setProperty("--glow", st.glow);
      box.innerHTML = (kind === 1 ? skeleton1(st) : skeleton2(st)) +
        `<div class="kd-tip"></div><div class="kd-table-wrap ${st.table ? "open" : ""}">${tablaHTML()}</div>`;
      box.querySelectorAll("[data-chart]").forEach((el) => {
        const w = el.clientWidth, h = el.clientHeight, name = el.dataset.chart;
        let svg = "";
        if (name === "bars") svg = chartBarsByArea(w, h - 16, st, tips);
        else if (name === "donut") svg = chartDonut(w, h, st, tips);
        else if (name === "wf") svg = chartWaterfall(w, h, st, tips, kind === 2 && st.filter ? waterfallCats(st.filter) : waterfallAreas(st));
        else if (name === "hm") svg = chartHeatmap(w, h, st, tips, { focus: kind === 2 ? st.filter : null, id: uid });
        else if (name === "st") svg = chartStacked100(w, h, st, tips, st.filter || null);
        el.innerHTML = svg;
      });
      placeTip();
    }
    function placeTip() {
      const tip = box.querySelector(".kd-tip");
      if (!st.hover || !tips[st.hover]) { tip.style.display = "none"; return; }
      const el = box.querySelector(`[data-tip="${CSS.escape(st.hover)}"]`);
      if (!el) { tip.style.display = "none"; return; }
      const scale = box.getBoundingClientRect().width / box.offsetWidth || 1;
      const br = box.getBoundingClientRect(), er = el.getBoundingClientRect();
      tip.innerHTML = tips[st.hover];
      tip.style.display = "block";
      let x = (er.right - br.left) / scale + 12, y = (er.top - br.top) / scale - 10;
      if (x + tip.offsetWidth > box.offsetWidth - 10) x = (er.left - br.left) / scale - tip.offsetWidth - 12;
      if (y + tip.offsetHeight > box.offsetHeight - 10) y = box.offsetHeight - tip.offsetHeight - 10;
      tip.style.left = x + "px";
      tip.style.top = Math.max(10, y) + "px";
    }
    function setState(patch) { Object.assign(st, patch); render(); }
    function tipAnchor(key) {
      const el = box.querySelector(`[data-tip="${CSS.escape(key)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }
    function enableInteraction() {
      box.addEventListener("mousemove", (e) => {
        const t = e.target.closest("[data-tip]");
        const key = t ? t.getAttribute("data-tip") : null;
        if (key !== st.hover) setState({ hover: key });
      });
      box.addEventListener("mouseleave", () => st.hover && setState({ hover: null }));
      box.addEventListener("click", (e) => {
        const f = e.target.closest("[data-filter]");
        if (f) setState({ filter: f.dataset.filter || null, hover: null });
        if (e.target.closest('[data-act="table"]')) setState({ table: !st.table });
      });
      document.addEventListener("keydown", (e) => e.key === "Escape" && st.table && setState({ table: false }));
    }
    const api = { box, st, setState, render, tipAnchor, enableInteraction, dirty: true };
    render();
    return api;
  }

  window.KonekViz = { createDashboard, agg, money, millones, mil, smil, pct, share, CAT_COLORS, ease, stag, clamp01 };
})();
