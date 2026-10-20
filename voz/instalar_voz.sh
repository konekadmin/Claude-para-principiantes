#!/usr/bin/env bash
# Descarga el modelo Supertonic 3 (INT8, release oficial de sherpa-onnx) en voz/modelo/ y verifica su SHA-256.
# Uso: bash voz/instalar_voz.sh
set -euo pipefail
cd "$(dirname "$0")"
NOMBRE=sherpa-onnx-supertonic-3-tts-int8-2026-05-11
URL=https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/$NOMBRE.tar.bz2
SHA=82fa96f91c4ef8abaae3a14a3f4153facf88bed821d1f7331cec2700f432c427
mkdir -p modelo
if [ -f "modelo/$NOMBRE/voice.bin" ]; then echo "El modelo ya está en voz/modelo/$NOMBRE"; exit 0; fi
echo "Descargando $NOMBRE (~129 MB)…"
if command -v curl >/dev/null; then curl -L --fail -o "modelo/$NOMBRE.tar.bz2" "$URL"; else wget -O "modelo/$NOMBRE.tar.bz2" "$URL"; fi
if command -v sha256sum >/dev/null; then CALC=$(sha256sum "modelo/$NOMBRE.tar.bz2" | cut -d' ' -f1); else CALC=$(shasum -a 256 "modelo/$NOMBRE.tar.bz2" | cut -d' ' -f1); fi
if [ "$CALC" != "$SHA" ]; then echo "SHA-256 no coincide ($CALC). Borra modelo/ y vuelve a intentar."; exit 1; fi
tar -xjf "modelo/$NOMBRE.tar.bz2" -C modelo
rm "modelo/$NOMBRE.tar.bz2"
echo "Listo: voz/modelo/$NOMBRE"
