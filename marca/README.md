# Marca Konek

| Archivo | Uso |
| --- | --- |
| `konek-simbolo.svg` · `konek-simbolo-512.png` · `konek-simbolo-1024.png` | El símbolo (K de nodos conectados), fondo transparente |
| `konek-logo-horizontal-oscuro.svg` / `.png` | Símbolo + «Konek» + «FINANZAS & IA» para fondos oscuros |
| `konek-logo-horizontal-claro.svg` / `.png` | Lo mismo para fondos claros (degradado más oscuro, `#0891b2` → `#7c3aed`, para que se vea sobre blanco) |
| `konek-avatar-800.png` · `konek-avatar.svg` | Foto de perfil del canal (800×800, pensada para el recorte circular de YouTube) |
| `konek-intro.mp4` | La cortinilla animada del logo, sola y con su música (sin voz) |

Colores: cian `#22d3ee` → violeta `#a78bfa` (degradado del símbolo), fondo `#070b14`. Tipografías: Inter Display ExtraBold («Konek») e Inter SemiBold («FINANZAS & IA»); en los SVG los textos ya están convertidos a trazos, así que no dependen de tener las fuentes.

Para regenerarlos:

```bash
python3 -m pip install fonttools
python3 marca/generar_marca.py                 # SVG (usa las fuentes Inter incluidas en el proyecto)
node marca/exportar_png.cjs                    # PNG; usa el Playwright de videos/01-…/produccion (npm install ahí)
bash videos/01-de-excel-a-dashboard-ejecutivo/produccion/cortinilla.sh   # konek-intro.mp4
```
