# De Excel a dashboard ejecutivo con Claude

Video para **Konek | Finanzas & IA**, producido a partir de [`guion.md`](guion.md). La locución está hecha con **Supertonic 3, voz M1 (masculina)**.

> `guion.md` es el guion original, tal como llegó. La duración y los capítulos reales del video (7:02, 8 capítulos) están en `publicacion/youtube.md`, y el texto locutado exacto, en `produccion/narracion.json`.

## Qué hay en cada carpeta

| Carpeta | Contenido |
| --- | --- |
| `publicacion/` | Lo que se sube a YouTube: `video.mp4` (1080p, 30 fps), `miniatura.png`, `miniatura-espacio-cara.png` + `guia-cara.png`, `subtitulos.es.srt`, `descripcion.txt` y `youtube.md` (título, alternativas A/B, etiquetas, comentario fijado, configuración y pantalla final). Todo esto lo regenera `armar_video.sh`: no lo edites en el lugar |
| `material/` | Lo que se usa en el video y se comparte con la comunidad: el Excel ficticio, los dos dashboards interactivos (HTML) y `prompts.md` con los dos prompts más las plantillas para ventas, gastos, cobranzas e inventario |
| `produccion/` | Los archivos fuente para regenerar todo: datos, guion de locución (`narracion.json`), escenas animadas (`escenas/`, con sus fuentes tipográficas), mezcla, render, enlaces (`enlaces.json`) y `armar_video.sh`, que arma el video de punta a punta |

La voz (Supertonic 3, M1) y el logo son del canal y están en [`voz/`](../../voz/) y [`marca/`](../../marca/), en la raíz del proyecto.

## Checklist para publicar

- [ ] Poner el link de la comunidad en `produccion/enlaces.json` y correr `python3 produccion/descripcion.py` (actualiza la descripción y el comentario fijado).
- [ ] Subir `publicacion/video.mp4` con el título y la descripción.
- [ ] Subir la miniatura (o agregar tu cara sobre `miniatura-espacio-cara.png` y guardarla con otro nombre).
- [ ] Subir `publicacion/subtitulos.es.srt` como subtítulos en español.
- [ ] Configurar la pantalla final sobre los marcos de los últimos 20 s (detalles en `youtube.md`).
- [ ] Fijar el comentario con la pregunta del video.
- [ ] Subir `material/prompts.md` y el Excel de práctica a la comunidad (el video los promete ahí).

## Cómo está hecho

**Locución.** `produccion/narracion.json` tiene el guion partido frase por frase. `produccion/tts.py` sintetiza cada frase con la voz del canal (`voz/`: Supertonic 3, voz M1, 12 pasos, velocidad 0.92, configurada en `voz/voz.json`) y arma la locución y la línea de tiempo. Se usó la versión de Supertonic 3 cuantizada a INT8 que publica sherpa-onnx (`sherpa-onnx-supertonic-3-tts-int8-2026-05-11`). Con `--backend supertonic`, el script usa el paquete oficial `pip install supertonic`, que descarga el modelo completo de Hugging Face; esa opción no se usó para este video. Si falta la caché de frases (como al partir del zip), `tts.py` la reconstruye a partir de `audio/narracion.flac`, así que `--rehacer ID` vuelve a sintetizar solo esa frase.

Ajustes para que la voz en español suene natural, verificados transcribiendo cada frase con Whisper (`voz/verificar_pronunciacion.py`):

- Escritura fonética solo para la voz (los subtítulos conservan el texto original): Claude → «Clod», dashboard → «dashbord», Power BI → «Páuer Bi Ái», PowerPoint → «Páuer Point», KPIs → «kei pi áis», CFO → «ce efe o», ERP → «e erre pe».
- «IA» se dice «inteligencia artificial» (la sigla sonaba ininteligible).
- «Nada especial» pasó a «Nada del otro mundo» y «cada KPI» a «cada uno de los KPIs» (la voz los pronunciaba mal).
- Se agregaron frases cortas de apoyo: el narrador nombra las cinco partes del prompt mientras aparecen («Rol. Datos. Objetivo. Análisis. Propuesta.») y numera las ideas clave («Uno», «Dos», «Tres»).
- «El video está aquí arriba. Nos vemos ahí.» suena ya dentro de la pantalla final (los últimos 20 s), cuando YouTube muestra los elementos.

**Video.** Las escenas son HTML animado (`produccion/escenas/`), sincronizadas con la locución frase por frase. `produccion/render.cjs` las captura cuadro a cuadro con Chromium (Playwright) y las codifica con ffmpeg (H.264, BT.709). Las fuentes Inter e Inter Display vienen en `produccion/escenas/fuentes/` (licencia OFL), así el render sale igual en cualquier máquina. La interfaz de chat es una recreación (lo indica en pantalla). Los dashboards los programó Claude para este ejemplo siguiendo lo que piden los prompts, y son los mismos que están en `material/`.

**Audio final.** `produccion/ensamblar.sh` masteriza la voz (filtro pasa altos a 70 Hz, compresión suave, ganancia fija y limitador) y llama a `produccion/mezcla.py`, que agrega un colchón musical suave sintetizado en el propio script (sin derechos de terceros), 14 dB por debajo de la voz y solo en la cortinilla del logo y en la pantalla final. Un limitador final con sobremuestreo mantiene el pico verdadero por debajo de -1 dBTP. El objetivo es unos -16 LUFS, un nivel habitual para contenido hablado; YouTube no sube el volumen de los videos más bajos que -14 LUFS.

**Cortinilla del logo.** `produccion/cortinilla.sh` renderiza solo la escena del logo, con su música y sin voz, y la guarda en `marca/konek-intro.mp4`.

## Regenerar

Requisitos: Python 3.10+ con los paquetes de `produccion/requirements.txt` (mejor en un entorno virtual: `python3 -m venv .venv && source .venv/bin/activate && python3 -m pip install -r produccion/requirements.txt`), Node 18+ con npm y ffmpeg.

```bash
bash produccion/armar_video.sh          # todo, usando la locución ya generada (~20 min con 4 núcleos)
bash produccion/armar_video.sh --voz    # además regenera la locución con Supertonic 3 (M1)
```

El script corre, en orden: `datos.py` (Excel y datos), `construir_dashboards.py`, `tts.py` (solo con `--voz`), `subtitulos.py`, `descripcion.py` (con el link de `enlaces.json`), `render_video.sh` (escenas cuadro a cuadro en 4 tramos), `ensamblar.sh` (voz masterizada + música + video), `miniatura.cjs` y `cortinilla.sh`. La primera vez instala Playwright con Chromium (`npm install` en `produccion/`) y, con `--voz`, descarga el modelo de voz (`voz/instalar_voz.sh`).

La locución ya generada está en `produccion/audio/narracion.flac` y sus tiempos en `produccion/timeline.json`: si no cambias el guion, no hace falta volver a sintetizarla. Como Supertonic genera cada toma con algo de variación, regenerar dará una locución parecida pero no idéntica.

Para previsualizar las escenas en el navegador: abre `produccion/escenas/video.html` (reproduce en tiempo real, sin audio) o `video.html?t=150` para ver un instante concreto.
