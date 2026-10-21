// Exporta los SVG de marca/ a PNG con fondo transparente (el avatar lleva su propio fondo).
// Uso: node marca/exportar_png.cjs
// Usa el Playwright instalado en videos/01-de-excel-a-dashboard-ejecutivo/produccion (npm install ahí).
const fs = require("fs");
const path = require("path");
const { chromium } = require(require.resolve("playwright", {
  paths: [__dirname, path.join(__dirname, "..", "videos", "01-de-excel-a-dashboard-ejecutivo", "produccion"), ...(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean)],
}));
const SALIDAS = [
  ["konek-simbolo.svg", "konek-simbolo-512.png", 512],
  ["konek-simbolo.svg", "konek-simbolo-1024.png", 1024],
  ["konek-logo-horizontal-oscuro.svg", "konek-logo-horizontal-oscuro.png", 1600],
  ["konek-logo-horizontal-claro.svg", "konek-logo-horizontal-claro.png", 1600],
  ["konek-avatar.svg", "konek-avatar-800.png", 800],
];
(async () => {
  const b = await chromium.launch();
  for (const [src, out, ancho] of SALIDAS) {
    const svg = fs.readFileSync(path.join(__dirname, src), "utf8");
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    const alto = Math.round((ancho * h) / w);
    const p = await b.newPage({ viewport: { width: ancho, height: alto } });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${ancho}" height="${alto}"`)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, out), omitBackground: true });
    await p.close();
    console.log("ok", out, `${ancho}x${alto}`);
  }
  await b.close();
})();
