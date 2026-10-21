#!/usr/bin/env bash
# Genera marca/konek-intro.mp4: la cortinilla del logo sola (sin escenas vecinas ni voz), con su música.
# Requiere audio/musica.wav (lo genera mezcla.py, que corre dentro de ensamblar.sh).
# Uso: bash produccion/cortinilla.sh
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="$PWD/node_modules${NODE_PATH:+:$NODE_PATH}"
read -r A B < <(python3 -c "import json;i=json.load(open('timeline.json'))['items']['logo'];print(round(i['start']-0.1,3), round(i['end']+0.3,3))")
D=$(python3 -c "print(round($B-$A,3))")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
node render.cjs --from "$A" --to "$B" --solo logo --out "$TMP/logo.mp4"
ffmpeg -y -hide_banner -loglevel error -i "$TMP/logo.mp4" -ss "$A" -t "$D" -i audio/musica.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy \
  -af "afade=t=in:st=0:d=0.15,afade=t=out:st=$(python3 -c "print(round($D-0.5,3))"):d=0.5,loudnorm=I=-18:TP=-2:LRA=7" \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart ../../../marca/konek-intro.mp4
echo "ok: marca/konek-intro.mp4 (${D} s)"
