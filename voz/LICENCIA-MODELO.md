# Licencia del modelo de voz

- **Modelo:** Supertonic 3, de Supertone Inc., publicado bajo la licencia **OpenRAIL-M**: https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE
- **Versión usada:** `sherpa-onnx-supertonic-3-tts-int8-2026-05-11`, la conversión a INT8 que publica el proyecto sherpa-onnx (k2-fsa) a partir del modelo oficial. Se descarga con `instalar_voz.sh` y no viene incluida en este proyecto. El archivo `LICENSE` (MIT) que trae esa carpeta corresponde al código de ejemplo de Supertone; **los pesos del modelo están bajo OpenRAIL-M**.
- **`M1.json`:** es el vector de estilo de la voz M1, extraído de ese modelo. Por eso está sujeto a la misma licencia OpenRAIL-M y a sus restricciones de uso.
- **Código:** el de ejemplo de Supertonic es MIT y el de sherpa-onnx, Apache-2.0.

**Antes de compartir este proyecto o `M1.json` con terceros**, descarga el texto oficial de la licencia desde el enlace de arriba y guárdalo como `voz/LICENSE-OpenRAIL-M.txt`. OpenRAIL-M pide entregar una copia de la licencia y de sus restricciones de uso a quien reciba el modelo o una derivada. El texto no está incluido aquí porque no se pudo descargar al preparar el proyecto.
