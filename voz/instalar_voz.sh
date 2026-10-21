#!/usr/bin/env bash
# Descarga el modelo Supertonic 3 (INT8, release oficial de sherpa-onnx) en voz/modelo/ y verifica su SHA-256.
# Uso: bash voz/instalar_voz.sh
set -euo pipefail
cd "$(dirname "$0")"
NOMBRE=sherpa-onnx-supertonic-3-tts-int8-2026-05-11
URL=https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/$NOMBRE.tar.bz2
SHA=82fa96f91c4ef8abaae3a14a3f4153facf88bed821d1f7331cec2700f432c427
ARCHIVOS="duration_predictor.int8.onnx text_encoder.int8.onnx vector_estimator.int8.onnx vocoder.int8.onnx tts.json unicode_indexer.bin voice.bin"
completo() { for f in $ARCHIVOS; do [ -s "modelo/$NOMBRE/$f" ] || return 1; done; }
if completo; then echo "El modelo ya está en voz/modelo/$NOMBRE"; exit 0; fi
mkdir -p modelo
TMP=$(mktemp -d modelo/.descarga.XXXXXX)
trap 'rm -rf "$TMP"' EXIT
echo "Descargando $NOMBRE (~129 MB)…"
if command -v curl >/dev/null; then curl -L --fail -o "$TMP/m.tar.bz2" "$URL"; else wget -O "$TMP/m.tar.bz2" "$URL"; fi
if command -v sha256sum >/dev/null; then CALC=$(sha256sum "$TMP/m.tar.bz2" | cut -d' ' -f1); else CALC=$(shasum -a 256 "$TMP/m.tar.bz2" | cut -d' ' -f1); fi
if [ "$CALC" != "$SHA" ]; then echo "El SHA-256 no coincide ($CALC). Vuelve a intentar."; exit 1; fi
tar -xjf "$TMP/m.tar.bz2" -C "$TMP"
rm -rf "modelo/$NOMBRE"
mv "$TMP/$NOMBRE" "modelo/$NOMBRE"
completo || { echo "La extracción quedó incompleta."; exit 1; }
echo "Listo: voz/modelo/$NOMBRE"
