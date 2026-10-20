"""Extrae una voz de Supertonic 3 (por defecto M1) del voice.bin de sherpa-onnx al formato JSON oficial.

El JSON resultante sirve con el paquete oficial:
    from supertonic import TTS
    tts = TTS(auto_download=True)
    estilo = tts.get_voice_style_from_path("voz/M1.json")

En voice.bin las 10 voces van en orden alfabético de su JSON original: F1..F5, M1..M5 (M1 = índice 5).
Formato de voice.bin: 6 int64 de cabecera (dims de style_ttl y style_dp, con N voces), luego todos los
style_ttl en float32 y después todos los style_dp.

Uso: python3 voz/extraer_estilo.py RUTA/voice.bin [M1] [salida.json]
"""

import json
import sys
from pathlib import Path

import numpy as np

VOCES = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]


def leer(voice_bin):
    b = Path(voice_bin).read_bytes()
    cab = np.frombuffer(b[:48], dtype=np.int64)
    n, t1, t2, n2, d1, d2 = (int(x) for x in cab)
    assert n == n2 == len(VOCES), cab
    ttl_n, dp_n = n * t1 * t2, n * d1 * d2
    ttl = np.frombuffer(b[48:48 + 4 * ttl_n], dtype=np.float32).reshape(n, t1, t2)
    dp = np.frombuffer(b[48 + 4 * ttl_n:48 + 4 * (ttl_n + dp_n)], dtype=np.float32).reshape(n, d1, d2)
    assert 48 + 4 * (ttl_n + dp_n) == len(b), "tamaño inesperado de voice.bin"
    return b, cab, ttl, dp


def main():
    voice_bin = sys.argv[1]
    nombre = sys.argv[2] if len(sys.argv) > 2 else "M1"
    salida = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(__file__).resolve().parent / f"{nombre}.json"
    b, cab, ttl, dp = leer(voice_bin)
    i = VOCES.index(nombre)
    estilo = {
        "voz": nombre,
        "origen": "Supertonic 3 (Supertone), voice.bin de sherpa-onnx-supertonic-3-tts-int8-2026-05-11",
        "style_ttl": {"dims": [1, *ttl.shape[1:]], "data": ttl[i].ravel().tolist()},
        "style_dp": {"dims": [1, *dp.shape[1:]], "data": dp[i].ravel().tolist()},
    }
    salida.write_text(json.dumps(estilo), encoding="utf-8")

    # verificación: leer el JSON y comparar bit a bit con la voz original
    j = json.loads(salida.read_text(encoding="utf-8"))
    t = np.array(j["style_ttl"]["data"], dtype=np.float32).reshape(j["style_ttl"]["dims"])
    d = np.array(j["style_dp"]["data"], dtype=np.float32).reshape(j["style_dp"]["dims"])
    assert t.tobytes() == ttl[i].tobytes() and d.tobytes() == dp[i].tobytes(), "la voz extraída no coincide"
    print(f"{nombre} (índice {i}) -> {salida}  [verificado: idéntico al voice.bin]")


if __name__ == "__main__":
    main()
