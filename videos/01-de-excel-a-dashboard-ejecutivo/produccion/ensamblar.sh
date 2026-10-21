#!/usr/bin/env bash
# Masteriza la voz (~-16 LUFS), agrega el colchón musical y une todo con el video renderizado (sin audio).
# Uso: bash produccion/ensamblar.sh RUTA/video_mudo.mp4
set -euo pipefail
MUDO=${1:?Uso: bash produccion/ensamblar.sh RUTA/video_mudo.mp4}
case "$MUDO" in /*) ;; *) MUDO="$PWD/$MUDO" ;; esac
cd "$(dirname "$0")"
OUT=../publicacion/video.mp4
OBJETIVO=-14.7
# 1) voz: filtro pasa altos (70 Hz), compresión suave, ganancia fija y limitador de picos
DIN="highpass=f=70,acompressor=threshold=-30dB:ratio=2:attack=10:release=200:makeup=1,aresample=48000"
I=$(ffmpeg -hide_banner -nostats -i audio/narracion.flac -af "$DIN,ebur128" -f null - 2>&1 | sed -n '/Summary:/,$p' | awk '/ I:/{print $2; exit}')
G=$(python3 -c "print(round($OBJETIVO - ($I), 2))")
echo "voz: $I LUFS -> ganancia $G dB"
ffmpeg -y -hide_banner -loglevel error -i audio/narracion.flac \
  -af "$DIN,volume=${G}dB,alimiter=limit=0.71:attack=4:release=80:level=false" -c:a pcm_s16le audio/voz_master.wav
# 2) colchón musical relativo a la voz ya masterizada
python3 mezcla.py audio/voz_master.wav
# 3) video + audio (limitador final con sobremuestreo para que el pico verdadero quede bajo -1 dBTP tras el AAC)
ffmpeg -y -hide_banner -loglevel error -i "$MUDO" -i audio/mezcla.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy \
  -af "aresample=192000,alimiter=limit=0.71:attack=2:release=60:level=false,aresample=48000" \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  -metadata title="De Excel a dashboard ejecutivo con Claude" -metadata artist="Konek | Finanzas & IA" "$OUT"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p' | grep -E '^[[:space:]]+(I|Peak):'
ls -la "$OUT"
