"""Prueba rápida de la voz M1: sintetiza una frase y la guarda en un WAV.

Uso: python3 voz/probar_voz.py ["Texto a decir"] [salida.wav]
Requiere el modelo (bash voz/instalar_voz.sh) y `pip install sherpa-onnx soundfile numpy`.
"""

import sys
from pathlib import Path

import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from supertonic_m1 import CONFIG, SR, motor, recortar_silencio, texto_tts  # noqa: E402

texto = sys.argv[1] if len(sys.argv) > 1 else (
    "Hola, soy la voz de Konek. Hoy vamos a pasar de un Excel exportado a un dashboard ejecutivo con Claude, "
    "y te voy a mostrar el prompt de dos pasos que lo cambia todo.")
salida = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("muestra-M1.wav")
x = recortar_silencio(motor()(texto_tts(texto)))
sf.write(salida, x, SR)
print(f"{CONFIG['motor']} · voz {CONFIG['voz']} · {CONFIG['pasos']} pasos · velocidad {CONFIG['velocidad']}")
print(f"{salida}: {len(x) / SR:.1f} s")
