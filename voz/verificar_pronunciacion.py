"""Verifica la pronunciación de la locución transcribiendo cada frase con Whisper (opcional).

Así se revisó el video: cada frase de narracion.json se transcribe y se compara con el texto. Las diferencias
de formato (números en cifras) y las repeticiones de Whisper en frases de una o dos palabras no son errores
de la voz; lo que hay que mirar son las palabras cambiadas (por ejemplo «Nada especial» -> «No es especial»).

Requisitos: pip install sherpa-onnx soundfile numpy y el modelo Whisper turbo de sherpa-onnx:
  curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2
  tar xjf sherpa-onnx-whisper-turbo.tar.bz2 -C voz/modelo/
Uso: python3 voz/verificar_pronunciacion.py videos/01-de-excel-a-dashboard-ejecutivo [id ...]
"""

import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf

W = Path(__file__).resolve().parent / "modelo" / "sherpa-onnx-whisper-turbo"


def normalizar(s):
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9ñ ]+", " ", s).split()


def main():
    video = Path(sys.argv[1])
    solo = set(sys.argv[2:])
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(W / "turbo-encoder.int8.onnx"), decoder=str(W / "turbo-decoder.int8.onnx"),
        tokens=str(W / "turbo-tokens.txt"), language="es", task="transcribe", num_threads=4)
    tl = json.loads((video / "produccion" / "timeline.json").read_text(encoding="utf-8"))
    audio, sr = sf.read(video / "produccion" / "audio" / "narracion.flac", dtype="float32")
    errores = total = 0
    for k in tl["orden"]:
        it = tl["items"][k]
        if it.get("gap") or (solo and k not in solo):
            continue
        x = audio[it["m0"]:it["m1"]]
        x16 = np.interp(np.linspace(0, len(x) - 1, int(len(x) * 16000 / sr)), np.arange(len(x)), x).astype(np.float32)
        pad = np.zeros(8000, dtype=np.float32)  # Whisper necesita silencio alrededor para no cortar la última palabra
        st = rec.create_stream()
        st.accept_waveform(16000, np.concatenate([pad, x16, pad]))
        rec.decode_stream(st)
        a, b = normalizar(it["text"]), normalizar(st.result.text)[: len(normalizar(it["text"])) + 1]
        ops = [o for o in difflib.SequenceMatcher(a=a, b=b).get_opcodes() if o[0] != "equal"]
        errores += sum(max(i2 - i1, j2 - j1) for _, i1, i2, j1, j2 in ops)
        total += len(a)
        cambios = [(" ".join(a[i1:i2]), " ".join(b[j1:j2])) for _, i1, i2, j1, j2 in ops]
        print(("OK " if not ops else "REV"), k, cambios if cambios else "")
    print(f"Palabras distintas: {errores}/{total} ({errores / max(1, total):.1%})")


if __name__ == "__main__":
    main()
