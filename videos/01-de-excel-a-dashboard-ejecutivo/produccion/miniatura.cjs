// Exporta la miniatura (1280x720) a publicacion/: miniatura.png y miniatura-con-espacio-para-cara.png
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [q, out] of [["", "miniatura.png"], ["?cara=1", "miniatura-con-espacio-para-cara.png"]]) {
    await p.goto("file://" + path.join(__dirname, "escenas", "miniatura.html") + q);
    await p.waitForFunction(() => window.LISTO === true);
    await p.evaluate(() => document.fonts.ready);
    await p.locator("#thumb").screenshot({ path: path.join(__dirname, "..", "publicacion", out) });
    console.log("ok", out);
  }
  await b.close();
})();
