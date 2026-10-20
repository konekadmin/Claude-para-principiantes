# Voz del canal: Supertonic 3 · M1

La locución de los videos de Konek usa **Supertonic 3**, voz **M1** (masculina), configurada para español.

| Archivo | Para qué |
| --- | --- |
| `voz.json` | Configuración: voz M1, idioma `es`, 12 pasos de calidad, velocidad 0.92, ruta del modelo |
| `supertonic_m1.py` | Motor de la voz + escritura fonética (lo usan los videos y `probar_voz.py`) |
| `M1.json` | El estilo de la voz M1 en el formato oficial de Supertonic (extraído y verificado bit a bit) |
| `instalar_voz.sh` | Descarga el modelo Supertonic 3 INT8 (release oficial de sherpa-onnx, ~129 MB) y verifica su SHA-256 |
| `probar_voz.py` | Genera una muestra con la voz configurada |
| `extraer_estilo.py` | Cómo se obtuvo `M1.json` (sirve para extraer cualquier otra voz: F1–F5, M1–M5) |
| `muestra-M1.m4a` | Muestra de 11 s de la voz tal como suena en el video |

## Uso

```bash
pip install sherpa-onnx soundfile numpy
bash voz/instalar_voz.sh                          # una sola vez
python3 voz/probar_voz.py "Hola, esto es una prueba de la voz de Konek."
```

Para usar `M1.json` con el paquete oficial (`pip install supertonic`, descarga el modelo completo de Hugging Face):

```python
from supertonic import TTS
tts = TTS(auto_download=True)
estilo = tts.get_voice_style_from_path("voz/M1.json")
wav, _ = tts.synthesize("Hola", voice_style=estilo, lang="es", total_steps=12, speed=0.92)
```

## Ajustes de pronunciación

`supertonic_m1.py` reescribe estos términos solo para la voz; los subtítulos conservan el texto original:

| Texto | Se le pasa a la voz |
| --- | --- |
| Claude | Clod |
| dashboard / dashboards | dashbord / dashbords |
| Power BI · PowerPoint | Páuer Bi Ái · Páuer Point |
| KPI / KPIs | kei pi ái / kei pi áis |
| CFO · ERP | ce efe o · e erre pe |

Además, conviene escribir «inteligencia artificial» en lugar de «IA» (la sigla suena ininteligible) y evitar frases que empiecen con «Nada especial». Cada frase del video se verificó transcribiéndola con Whisper.

## Notas

- El modelo usado es la versión INT8 que publica sherpa-onnx a partir del modelo oficial de Supertone. Licencias: código MIT, modelo OpenRAIL-M ([Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3)).
- Supertonic genera cada toma con algo de variación: dos síntesis del mismo texto suenan parecido pero no idéntico. Por eso cada video guarda su locución final (`produccion/audio/narracion.flac`).
