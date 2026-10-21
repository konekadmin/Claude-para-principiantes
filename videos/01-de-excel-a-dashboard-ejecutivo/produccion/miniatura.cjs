// Exporta las miniaturas (1280x720) a publicacion/:
//   miniatura.png              lista para subir
//   miniatura-espacio-cara.png misma composición con el lado derecho libre para tu cara
//   guia-cara.png              guía transparente del lugar sugerido para la cara (para superponer en tu editor)
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const url = pathToFileURL(path.join(__dirname, "escenas", "miniatura.html")).href;
  for (const [q, out, transparente] of [["", "miniatura.png", false], ["?cara=1", "miniatura-espacio-cara.png", false], ["?guia=1", "guia-cara.png", true]]) {
    await p.goto(url + q);
    await p.waitForFunction(() => window.LISTO === true);
  // las @font-face se cargan recién cuando se usan: se fuerzan todas antes de capturar el primer cuadro
  await p.evaluate(() => Promise.all([...document.fonts].map((f) => f.load())).then(() => document.fonts.ready));
    await p.locator("#thumb").screenshot({ path: path.join(__dirname, "..", "publicacion", out), omitBackground: transparente });
    console.log("ok", out);
  }
  await b.close();
})();
