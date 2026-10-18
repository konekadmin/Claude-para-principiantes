#!/usr/bin/env bash
# Une el video renderizado (sin audio) con la mezcla y normaliza el audio a -15 LUFS (dos pasadas).
# Uso: bash produccion/ensamblar.sh RUTA/video_mudo.mp4
set -euo pipefail
cd "$(dirname "$0")"
MUDO=$1
OUT=../publicacion/video.mp4
FILTRO="highpass=f=70,acompressor=threshold=-21dB:ratio=2.5:attack=8:release=160:makeup=1"
MED=$(ffmpeg -hide_banner -nostats -i audio/mezcla.wav -af "$FILTRO,loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
val() { echo "$MED" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
LN="loudnorm=I=-15:TP=-1.5:LRA=11:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true"
ffmpeg -y -hide_banner -loglevel error -i "$MUDO" -i audio/mezcla.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -af "$FILTRO,$LN,aresample=48000" -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -metadata title="De Excel a dashboard ejecutivo con Claude" -metadata artist="Konek | Finanzas & IA" \
  -shortest "$OUT"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary:" | grep -E "I:|Peak:|LRA:"
ls -la "$OUT"
