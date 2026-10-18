"""Genera la locución con Supertonic 3 (voz M1) y la línea de tiempo del video.

Uso:
  python3 produccion/tts.py --modelo RUTA/sherpa-onnx-supertonic-3-tts-int8-2026-05-11
  python3 produccion/tts.py --backend supertonic          # paquete oficial `pip install supertonic`

Backends:
  sherpa      Supertonic 3 cuantizado a INT8 (release oficial de sherpa-onnx en GitHub). Es el que se usó
              para el video publicado. En voice.bin las voces van ordenadas F1..F5, M1..M5 -> M1 = sid 5.
  supertonic  Paquete oficial de Supertone (descarga el modelo completo de Hugging Face, ~400 MB).

Salidas:
  produccion/audio/narracion.flac     locución completa (44.1 kHz, mono, sin normalizar)
  produccion/escenas/timeline.js      inicio/fin de cada frase y pausa (lo usan las escenas)
  produccion/timeline.json            lo mismo en JSON (lo usan subtitulos.py y la descripción)
Los segmentos se guardan en produccion/audio/segmentos/ y se reutilizan si el texto no cambia.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf

BASE = Path(__file__).resolve().parent
SR = 44100
VOCES = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]

# Escritura fonética para que la voz en español pronuncie bien los términos en inglés y las siglas.
# (Se validó transcribiendo las pruebas con Whisper.) Los subtítulos usan el texto original.
FONETICA = [
    (r"\bClaude\b", "Clod"),
    (r"\bdashboards\b", "dashbords"),
    (r"\bdashboard\b", "dashbord"),
    (r"\bPower BI\b", "Páuer Bi Ái"),
    (r"\bPowerPoint\b", "Páuer Point"),
    (r"\bKPIs\b", "kei pi áis"),
    (r"\bKPI\b", "kei pi ái"),
    (r"\bCFO\b", "ce efe o"),
    (r"\bERP\b", "e erre pe"),
    (r"[«»\"“”]", ""),
    (r"…(?=\s*\S)", ","),
    (r"…", "."),
]


def texto_tts(item):
    t = item.get("tts", item["text"])
    for pat, rep in FONETICA:
        t = re.sub(pat, rep, t)
    return re.sub(r"\s+", " ", t).strip()


class SherpaBackend:
    def __init__(self, modelo, voz, pasos, velocidad, idioma):
        import sherpa_onnx

        d = Path(modelo)
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
                    duration_predictor=str(d / "duration_predictor.int8.onnx"),
                    text_encoder=str(d / "text_encoder.int8.onnx"),
                    vector_estimator=str(d / "vector_estimator.int8.onnx"),
                    vocoder=str(d / "vocoder.int8.onnx"),
                    tts_json=str(d / "tts.json"),
                    unicode_indexer=str(d / "unicode_indexer.bin"),
                    voice_style=str(d / "voice.bin"),
                ),
                num_threads=4,
                provider="cpu",
            )
        )
        self.sherpa = sherpa_onnx
        self.tts = sherpa_onnx.OfflineTts(cfg)
        self.sid, self.pasos, self.velocidad, self.idioma = VOCES.index(voz), pasos, velocidad, idioma

    def __call__(self, texto):
        g = self.sherpa.GenerationConfig()
        g.sid, g.num_steps, g.speed = self.sid, self.pasos, self.velocidad
        g.extra["lang"] = self.idioma
        a = self.tts.generate(texto, g)
        assert a.sample_rate == SR, a.sample_rate
        return np.asarray(a.samples, dtype=np.float32)


class SupertonicBackend:
    def __init__(self, voz, pasos, velocidad, idioma):
        from supertonic import TTS

        self.tts = TTS(auto_download=True)
        self.style = self.tts.get_voice_style(voice_name=voz)
        self.pasos, self.velocidad, self.idioma = pasos, velocidad, idioma

    def __call__(self, texto):
        wav, _ = self.tts.synthesize(texto, voice_style=self.style, total_steps=self.pasos,
                                     speed=self.velocidad, lang=self.idioma, silence_duration=0.25)
        x = np.asarray(wav, dtype=np.float32).reshape(-1)
        sr = getattr(self.tts, "sample_rate", SR)
        assert sr == SR, sr
        return x


def recortar_silencio(x, umbral_db=-50.0, margen=0.07, margen_fin=0.08):
    """Quita el silencio inicial/final (para controlar las pausas desde narracion.json)."""
    win = int(0.01 * SR)
    n = len(x) // win
    if n == 0:
        return x
    rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    voz = np.where(20 * np.log10(rms) > umbral_db)[0]
    if len(voz) == 0:
        return x
    a = max(0, voz[0] * win - int(margen * SR))
    b = min(len(x), (voz[-1] + 1) * win + int(margen_fin * SR))
    y = x[a:b].copy()
    fi, fo = int(0.005 * SR), int(0.02 * SR)
    y[:fi] *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo)
    return y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", choices=["sherpa", "supertonic"], default="sherpa")
    ap.add_argument("--modelo", help="carpeta del modelo sherpa-onnx-supertonic-3-tts-int8-*")
    ap.add_argument("--rehacer", nargs="*", default=[], help="ids de frases a regenerar aunque estén en caché")
    args = ap.parse_args()

    plan = json.loads((BASE / "narracion.json").read_text(encoding="utf-8"))
    voz, pasos, vel, idioma = plan["voz"], plan["pasos"], plan["velocidad"], plan["idioma"]
    cache = BASE / "audio" / "segmentos"
    cache.mkdir(parents=True, exist_ok=True)

    motor = None

    def sintetizar(texto):
        nonlocal motor
        if motor is None:
            motor = (SherpaBackend(args.modelo, voz, pasos, vel, idioma) if args.backend == "sherpa"
                     else SupertonicBackend(voz, pasos, vel, idioma))
        return motor(texto)

    partes = [np.zeros(int(plan["inicio"] * SR), dtype=np.float32)]
    t = plan["inicio"]
    tl = {"inicio": plan["inicio"], "items": {}, "orden": []}
    for it in plan["items"]:
        if "gap" in it:
            dur = it["gap"]
            partes.append(np.zeros(int(round(dur * SR)), dtype=np.float32))
            tl["items"][it["id"]] = {"sec": it["sec"], "start": round(t, 3), "end": round(t + dur, 3), "gap": True}
        else:
            tt = texto_tts(it)
            clave = hashlib.sha1(f"{args.backend}|{voz}|{pasos}|{vel}|{idioma}|{tt}".encode()).hexdigest()[:12]
            f = cache / f"{it['id']}-{clave}.wav"
            if f.exists() and it["id"] not in args.rehacer:
                x, _ = sf.read(f, dtype="float32")
            else:
                x = recortar_silencio(sintetizar(tt))
                sf.write(f, x, SR)
                print(f"  sintetizado {it['id']}: {len(x) / SR:.2f}s  «{tt}»")
            dur = len(x) / SR
            pausa = it.get("pause", 0.3)
            partes += [x, np.zeros(int(round(pausa * SR)), dtype=np.float32)]
            tl["items"][it["id"]] = {"sec": it["sec"], "start": round(t, 3), "end": round(t + dur, 3),
                                     "text": it["text"], "tts": tt}
            dur += pausa
        tl["orden"].append(it["id"])
        t += dur

    audio = np.concatenate(partes)
    tl["duracion"] = round(len(audio) / SR, 3)
    (BASE / "audio").mkdir(exist_ok=True)
    sf.write(BASE / "audio" / "narracion.flac", audio, SR, subtype="PCM_16")
    (BASE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    (BASE / "escenas" / "timeline.js").write_text(
        "// Generado por produccion/tts.py\nwindow.TIMELINE = " + json.dumps(tl, ensure_ascii=False) + ";\n",
        encoding="utf-8")
    secs = {}
    for k in tl["orden"]:
        s = tl["items"][k]["sec"]
        secs.setdefault(s, tl["items"][k]["start"])
    print(f"Duración total: {tl['duracion']:.1f} s ({tl['duracion'] / 60:.2f} min)")
    for s, v in secs.items():
        print(f"  {int(v // 60)}:{int(v % 60):02d}  {s}")


if __name__ == "__main__":
    main()
