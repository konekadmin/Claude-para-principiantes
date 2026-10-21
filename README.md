# Konek | Finanzas & IA — contenido para YouTube

Domina la tecnología para trabajar de forma más inteligente y tomar el control total de tu dinero. En Konek te enseñamos a construir sistemas de gestión, automatizar procesos y tomar decisiones financieras con Inteligencia Artificial (Claude, ChatGPT y herramientas No-Code).

Transformamos la teoría en ejecución práctica paso a paso: optimización de flujos de trabajo, modelos de análisis de datos y tableros interactivos para personas y emprendedores.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| [`voz/`](voz/) | La voz del canal: Supertonic 3, voz M1, configurada para español (motor, fonética, estilo M1, instalador del modelo, muestra) |
| [`marca/`](marca/) | Logo (SVG y PNG), avatar del canal y cortinilla animada |
| [`videos/`](videos/) | Un proyecto por video: guion, escenas, locución, render y archivos para publicar |

## Videos

| # | Video | Estado |
| --- | --- | --- |
| 01 | [De Excel a dashboard ejecutivo con Claude](videos/01-de-excel-a-dashboard-ejecutivo/) | Listo para subir |

## Armar un video desde cero

Requisitos: Python 3.10+, Node 18+ con npm y ffmpeg. Las fuentes (Inter, licencia OFL) vienen incluidas.

```bash
python3 -m venv .venv && source .venv/bin/activate          # en Windows: .venv\Scripts\activate
python3 -m pip install -r videos/01-de-excel-a-dashboard-ejecutivo/produccion/requirements.txt
bash videos/01-de-excel-a-dashboard-ejecutivo/produccion/armar_video.sh          # usa la locución ya generada
bash videos/01-de-excel-a-dashboard-ejecutivo/produccion/armar_video.sh --voz    # regenera también la voz M1
```

La primera vez el script instala Playwright con Chromium (`npm install` en `produccion/`; en Linux puede hacer falta `npx playwright install-deps chromium`) y, si regeneras la voz, descarga el modelo de Supertonic 3 (~129 MB). El render toma unos 20 minutos con 4 núcleos.
