#!/usr/bin/env bash
# Renderiza las escenas en paralelo (4 tramos) y las une en un video sin audio: CARPETA/video_mudo.mp4.
# El audio lo agrega ensamblar.sh.
# Uso: bash produccion/render_video.sh CARPETA
set -euo pipefail
TMP=${1:?Uso: bash produccion/render_video.sh CARPETA}
mkdir -p "$TMP"; TMP=$(cd "$TMP" && pwd)
cd "$(dirname "$0")"
PY=$(command -v python3 || command -v python)
export NODE_PATH="$PWD/node_modules${NODE_PATH:+:$NODE_PATH}"
DUR=$("$PY" -c "import json;print(json.load(open('timeline.json',encoding='utf-8'))['duracion'])")
N=4
pids=()
for i in $(seq 0 $((N-1))); do
  FROM=$("$PY" -c "print(round($DUR*$i/$N))")
  TO=$("$PY" -c "print($DUR if $i==$N-1 else round($DUR*($i+1)/$N))")
  node render.cjs --from "$FROM" --to "$TO" --out "$TMP/tramo$i.mp4" > "$TMP/tramo$i.log" 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do
  if ! wait "$p"; then
    echo "Falló un tramo del render. Revisa $TMP/tramo*.log"
    kill "${pids[@]}" 2>/dev/null || true
    exit 1
  fi
done
# la lista usa nombres relativos a CARPETA (así funciona también con el ffmpeg nativo de Windows)
: > "$TMP/lista.txt"
for i in $(seq 0 $((N-1))); do echo "file 'tramo$i.mp4'" >> "$TMP/lista.txt"; done
(cd "$TMP" && ffmpeg -y -loglevel error -f concat -safe 0 -i lista.txt -c copy video_mudo.mp4)
echo "video sin audio: $TMP/video_mudo.mp4"
