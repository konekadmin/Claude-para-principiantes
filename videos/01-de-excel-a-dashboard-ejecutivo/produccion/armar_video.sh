#!/usr/bin/env bash
# Arma el video completo de punta a punta: datos, dashboards, locución, subtítulos, textos,
# render de escenas, audio final, miniaturas y cortinilla del logo.
#
# Uso: bash produccion/armar_video.sh [--voz | --voz-todo] [--tmp CARPETA]
#   --voz          actualiza la locución: sintetiza con Supertonic 3 (voz M1) solo las frases nuevas o cambiadas
#                  de narracion.json; el resto se reutiliza de audio/narracion.flac
#   --voz-todo     vuelve a sintetizar todas las frases (toma nueva: suena parecido, no idéntico)
#   --tmp CARPETA  carpeta para los tramos del render (por defecto una temporal que se borra al terminar)
#
# Requisitos: python3 con produccion/requirements.txt, node + npm, ffmpeg.
# La primera vez instala Playwright y Chromium (npm install) y, si hace falta, el modelo de voz.
set -euo pipefail
VOZ=0
TMP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --voz) VOZ=1 ;;
    --voz-todo) VOZ=2 ;;
    --tmp)
      [ $# -ge 2 ] || { echo "--tmp necesita una carpeta"; exit 1; }
      TMP=$2; shift ;;
    -h|--help) sed -n 2,12p "$0"; exit 0 ;;
    *) echo "Opción desconocida: $1 (usa --help)"; exit 1 ;;
  esac
  shift
done
if [ -n "$TMP" ]; then
  mkdir -p "$TMP"; TMP=$(cd "$TMP" && pwd)
else
  TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
fi
cd "$(dirname "$0")"
RAIZ=$(cd ../../.. && pwd)
MODELO="$RAIZ/voz/modelo/sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
PY=$(command -v python3 || command -v python) || { echo "Falta Python 3. Revisa los requisitos en el README."; exit 1; }
for c in node npm ffmpeg; do
  command -v "$c" >/dev/null || { echo "Falta $c. Revisa los requisitos en el README."; exit 1; }
done
"$PY" -c "import numpy, soundfile, openpyxl" 2>/dev/null || { echo "Faltan paquetes de Python: $PY -m pip install -r produccion/requirements.txt (idealmente en un entorno virtual)"; exit 1; }
[ -d node_modules/playwright ] || npm install
export NODE_PATH="$PWD/node_modules${NODE_PATH:+:$NODE_PATH}"

echo "== 1/8 Datos y Excel";       "$PY" datos.py
echo "== 2/8 Dashboards";          "$PY" construir_dashboards.py
if [ "$VOZ" = 2 ]; then
  echo "== 3/8 Locución: toma nueva de todas las frases (Supertonic 3, voz M1)"; "$PY" tts.py --modelo "$MODELO" --todo
elif [ "$VOZ" = 1 ] || [ ! -f audio/narracion.flac ]; then
  echo "== 3/8 Locución: frases nuevas o cambiadas (Supertonic 3, voz M1)"; "$PY" tts.py --modelo "$MODELO"
else
  echo "== 3/8 Locución: se usa audio/narracion.flac (con --voz se actualiza)"
fi
echo "== 4/8 Subtítulos";          "$PY" subtitulos.py
echo "== 5/8 Textos de YouTube";   "$PY" descripcion.py
echo "== 6/8 Render de escenas (puede tardar ~20 min)"; bash render_video.sh "$TMP"
echo "== 7/8 Audio y video final"; bash ensamblar.sh "$TMP/video_mudo.mp4"
echo "== 8/8 Miniaturas y cortinilla del logo"; node miniatura.cjs; bash cortinilla.sh
echo "Listo: $(cd .. && pwd)/publicacion/video.mp4"
