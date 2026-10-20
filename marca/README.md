# Marca Konek

| Archivo | Uso |
| --- | --- |
| `konek-simbolo.svg` · `konek-simbolo-512.png` · `konek-simbolo-1024.png` | El símbolo (K de nodos conectados), fondo transparente |
| `konek-logo-horizontal-oscuro.svg` / `.png` | Símbolo + «Konek» + «FINANZAS & IA» para fondos oscuros |
| `konek-logo-horizontal-claro.svg` / `.png` | Lo mismo para fondos claros |
| `konek-avatar-800.png` · `konek-avatar.svg` | Foto de perfil del canal (800×800, pensada para el recorte circular de YouTube) |
| `konek-intro.mp4` | La cortinilla animada del logo, recortada del video (2.9 s, con audio) |

Colores: cian `#22d3ee` → violeta `#a78bfa` (degradado del símbolo), fondo `#070b14`. Tipografías: Inter Display ExtraBold («Konek») e Inter SemiBold («FINANZAS & IA»); en los SVG los textos ya están convertidos a trazos, así que no dependen de tener las fuentes.

Para regenerarlos: `pip install fonttools` y luego `python3 marca/generar_marca.py && node marca/exportar_png.cjs` (necesita Playwright, ver `videos/01-de-excel-a-dashboard-ejecutivo/produccion/package.json`).
