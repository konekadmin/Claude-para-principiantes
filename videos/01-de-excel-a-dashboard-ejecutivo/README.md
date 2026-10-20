# De Excel a dashboard ejecutivo con Claude

Video para **Konek | Finanzas & IA**, producido a partir de [`guion.md`](guion.md). La locución está hecha con **Supertonic 3, voz M1 (masculina)**.

## Qué hay en cada carpeta

| Carpeta | Contenido |
| --- | --- |
| `publicacion/` | Lo que se sube a YouTube: `video.mp4` (1080p, 30 fps), `miniatura.png`, `miniatura-con-espacio-para-cara.png`, `subtitulos.es.srt`, `descripcion.txt` y `youtube.md` (título, alternativas A/B, etiquetas, comentario fijado, configuración y pantalla final) |
| `material/` | Lo que se usa en el video y se comparte con la comunidad: el Excel ficticio, los dos dashboards interactivos (HTML) y `prompts.md` con los dos prompts más las plantillas para ventas, gastos, cobranzas e inventario |
| `produccion/` | Las fuentes para regenerar todo: datos, guion de locución, escenas animadas, mezcla, render y `armar_video.sh` (arma el video de punta a punta) |

La voz (Supertonic 3, M1) y el logo son del canal y están en [`voz/`](../../voz/) y [`marca/`](../../marca/), en la raíz del proyecto.

## Checklist para publicar

- [ ] Reemplazar `[LINK_COMUNIDAD]` en `publicacion/descripcion.txt` y en el comentario fijado de `publicacion/youtube.md`.
- [ ] Subir `publicacion/video.mp4` con el título y la descripción.
- [ ] Subir la miniatura (o editar la versión con espacio para tu cara).
- [ ] Subir `publicacion/subtitulos.es.srt` como subtítulos en español.
- [ ] Configurar la pantalla final sobre los marcos de los últimos 20 s (detalles en `youtube.md`).
- [ ] Fijar el comentario con la pregunta del video.
- [ ] Subir `material/prompts.md` y el Excel de práctica a la comunidad (el video los promete ahí).

## Cómo está hecho

**Locución.** `produccion/narracion.json` tiene el guion partido frase por frase. `produccion/tts.py` sintetiza cada frase con la voz del canal (`voz/supertonic_m1.py`: Supertonic 3, voz M1, 12 pasos, velocidad 0.92) y arma la locución y la línea de tiempo. El modelo usado es la versión oficial de Supertonic 3 cuantizada a INT8 que publica sherpa-onnx (`sherpa-onnx-supertonic-3-tts-int8-2026-05-11`), porque el entorno de producción no tenía acceso a Hugging Face. Con `--backend supertonic` el mismo script usa el paquete oficial `pip install supertonic` (modelo completo); esa ruta no se probó aquí.

Ajustes para que la voz en español suene natural, verificados transcribiendo cada frase con Whisper:

- Escritura fonética solo para la voz (los subtítulos conservan el texto original): Claude → «Clod», dashboard → «dashbord», Power BI → «Páuer Bi Ái», PowerPoint → «Páuer Point», KPIs → «kei pi áis», CFO → «ce efe o», ERP → «e erre pe».
- «IA» se dice «inteligencia artificial» (la sigla sonaba ininteligible).
- «Nada especial» pasó a «Nada del otro mundo» y «cada KPI» a «cada uno de los KPIs» (la voz los pronunciaba mal).
- Se agregaron frases cortas de apoyo: el narrador nombra las cinco partes del prompt mientras aparecen («Rol. Datos. Objetivo. Análisis. Propuesta.») y numera las ideas clave («Uno», «Dos», «Tres»).

**Video.** Las escenas son HTML animado (`produccion/escenas/`), sincronizadas con la locución frase por frase. `produccion/render.cjs` las captura cuadro a cuadro con Chromium (Playwright) y las codifica con ffmpeg. La interfaz de chat es una recreación (lo indica en pantalla); los dashboards son los mismos archivos de `material/`, construidos con Claude a partir del Excel ficticio.

**Audio final.** `produccion/ensamblar.sh` masteriza la voz (filtro de graves, compresión suave, ganancia fija a ~-16 LUFS y limitador) y llama a `produccion/mezcla.py`, que agrega un colchón musical suave sintetizado en el propio script (sin derechos de terceros), 14 dB por debajo de la voz y solo en la cortinilla del logo y en la pantalla final. Resultado medido: -16.7 LUFS integrados, pico -0.8 dBFS (nivel habitual para contenido hablado; YouTube no sube el volumen de videos más bajos de -14 LUFS).

## Regenerar

Requisitos: Python 3.10+ (`pip install -r produccion/requirements.txt`), Node 18+ con npm y ffmpeg.

```bash
bash produccion/armar_video.sh          # todo, usando la locución ya generada (~20 min con 4 núcleos)
bash produccion/armar_video.sh --voz    # además regenera la locución con Supertonic 3 (M1)
```

El script corre, en orden: `datos.py` (Excel y datos), `construir_dashboards.py`, `tts.py` (solo con `--voz`), `subtitulos.py`, `descripcion.py`, `render_video.sh` (escenas cuadro a cuadro en 4 tramos), `ensamblar.sh` (voz masterizada + música + video) y `miniatura.cjs`. La primera vez instala Playwright con Chromium (`npm install` en `produccion/`) y, con `--voz`, descarga el modelo de voz (`voz/instalar_voz.sh`).

La locución ya generada está en `produccion/audio/narracion.flac` y sus tiempos en `produccion/timeline.json`: si no cambias el guion, no hace falta volver a sintetizarla. Como Supertonic genera cada toma con algo de variación, regenerar dará una locución parecida pero no idéntica.

Para previsualizar las escenas en el navegador: abre `produccion/escenas/video.html` (reproduce en tiempo real, sin audio) o `video.html?t=150` para ver un instante concreto.
