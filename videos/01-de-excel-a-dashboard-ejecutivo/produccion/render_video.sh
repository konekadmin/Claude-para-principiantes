#!/usr/bin/env bash
# Renderiza el video completo en paralelo (4 tramos) y lo une con la locución.
# Uso: bash produccion/render_video.sh [carpeta_temporal]
set -euo pipefail
cd "$(dirname "$0")"
TMP=${1:-$(mktemp -d)}
mkdir -p "$TMP"
export NODE_PATH=${NODE_PATH:-$(npm root -g)}
DUR=$(python3 -c "import json;print(json.load(open('timeline.json'))['duracion'])")
N=4
pids=()
for i in $(seq 0 $((N-1))); do
  FROM=$(python3 -c "print(round($DUR*$i/$N))")
  TO=$(python3 -c "print($DUR if $i==$N-1 else round($DUR*($i+1)/$N))")
  node render.cjs --from "$FROM" --to "$TO" --out "$TMP/tramo$i.mp4" > "$TMP/tramo$i.log" 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
: > "$TMP/lista.txt"
for i in $(seq 0 $((N-1))); do echo "file '$TMP/tramo$i.mp4'" >> "$TMP/lista.txt"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/lista.txt" -c copy "$TMP/video_mudo.mp4"
echo "video sin audio: $TMP/video_mudo.mp4"
