"""Genera la locución con Supertonic 3 (voz M1) y la línea de tiempo del video.

Uso:
  python3 produccion/tts.py                       # usa el modelo de voz/modelo/ (bash voz/instalar_voz.sh)
  python3 produccion/tts.py --modelo RUTA/sherpa-onnx-supertonic-3-tts-int8-2026-05-11
  python3 produccion/tts.py --backend supertonic  # paquete oficial `pip install supertonic`

La voz (M1, fonética, motor) está configurada en voz/ en la raíz del proyecto; aquí solo se arma el guion:
la voz, los pasos y la velocidad de este video salen de narracion.json.

Salidas:
  produccion/audio/narracion.flac     locución completa (44.1 kHz, mono, sin normalizar)
  produccion/escenas/timeline.js      inicio/fin de cada frase y pausa (lo usan las escenas)
  produccion/timeline.json            lo mismo en JSON (lo usan subtitulos.py y la descripción)
Los segmentos se guardan en produccion/audio/segmentos/ y se reutilizan si el texto no cambia.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE.parents[2] / "voz"))
from supertonic_m1 import SR, motor as crear_motor, recortar_silencio  # noqa: E402
from supertonic_m1 import texto_tts as fonetica  # noqa: E402


def texto_tts(item):
    return fonetica(item.get("tts", item["text"]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", choices=["sherpa", "supertonic"], default="sherpa")
    ap.add_argument("--modelo", help="carpeta del modelo sherpa-onnx-supertonic-3-tts-int8-* (por defecto voz/modelo/...)")
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
            motor = crear_motor(args.backend, args.modelo, voz, pasos, vel, idioma)
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
