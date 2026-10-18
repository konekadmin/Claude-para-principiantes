// Captura cuadro a cuadro las escenas (escenas/video.html) y las codifica con ffmpeg.
// Uso: node produccion/render.cjs --out salida.mp4 [--from 0] [--to DURACION] [--fps 30]
//      node produccion/render.cjs --png carpeta --times 1.5,20,33   (cuadros sueltos para revisar)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
  return acc;
}, []));
const fps = +(args.fps || 30);

(async () => {
  const browser = await chromium.launch({ args: ["--disable-gpu-vsync", "--font-render-hinting=none"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => { console.error("pageerror:", e.message); process.exitCode = 1; });
  page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
  await page.goto("file://" + path.join(__dirname, "escenas", "video.html") + "?captura=1");
  await page.waitForFunction(() => window.VIDEO_READY === true);
  await page.evaluate(() => document.fonts.ready);
  const dur = await page.evaluate(() => window.VIDEO_DURATION);

  if (args.png) {
    fs.mkdirSync(args.png, { recursive: true });
    for (const t of String(args.times).split(",").map(Number)) {
      await page.evaluate((t) => window.renderFrame(t), t);
      await page.screenshot({ path: path.join(args.png, `t${t.toFixed(2).padStart(7, "0")}.png`) });
    }
    await browser.close();
    return;
  }

  const from = +(args.from || 0), to = Math.min(+(args.to || dur), dur);
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(fps), args.out], { stdio: ["pipe", "inherit", "inherit"] });
  const cdp = await page.context().newCDPSession(page);
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / fps);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 95, optimizeForSpeed: true });
    if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
    if ((f - f0) % 300 === 0) console.log(`${args.out}: cuadro ${f - f0}/${f1 - f0} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close();
})();
