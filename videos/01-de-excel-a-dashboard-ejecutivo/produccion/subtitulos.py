"""Genera los subtítulos en español (SRT) a partir de timeline.json.

Cada frase de la locución se parte en bloques de máximo 2 líneas x 42 caracteres;
el tiempo de cada bloque es proporcional a su número de caracteres.
"""

import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent
MAX_LINEA, MAX_BLOQUE = 42, 78


def partir_bloques(texto):
    # cortes preferidos: después de puntuación; si no, por palabras
    trozos = re.split(r"(?<=[,;:.?!»])\s+", texto)
    bloques, actual = [], ""
    for tr in trozos:
        cand = (actual + " " + tr).strip()
        if len(cand) <= MAX_BLOQUE:
            actual = cand
            continue
        if actual:
            bloques.append(actual)
        actual = ""
        for w in tr.split():
            cand = (actual + " " + w).strip()
            if len(cand) > MAX_BLOQUE:
                bloques.append(actual)
                actual = w
            else:
                actual = cand
    if actual:
        bloques.append(actual)
    return bloques


def en_lineas(bloque):
    if len(bloque) <= MAX_LINEA:
        return bloque
    palabras, mejor = bloque.split(), None
    for i in range(1, len(palabras)):
        a, b = " ".join(palabras[:i]), " ".join(palabras[i:])
        score = (max(len(a), len(b)), abs(len(a) - len(b)))
        if mejor is None or score < mejor[0]:
            mejor = (score, a + "\n" + b)
    return mejor[1]


def ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    tl = json.loads((BASE / "timeline.json").read_text(encoding="utf-8"))
    subs = []
    for k in tl["orden"]:
        it = tl["items"][k]
        if it.get("gap"):
            continue
        bloques = partir_bloques(it["text"])
        total = sum(len(b) for b in bloques)
        t = it["start"]
        for i, b in enumerate(bloques):
            d = (it["end"] - it["start"]) * len(b) / total
            # el último bloque de la frase se queda un poco más, durante la pausa
            subs.append([t, t + d + (0.4 if i == len(bloques) - 1 else 0), en_lineas(b)])
            t += d
    for actual, sig in zip(subs, subs[1:]):
        actual[1] = min(actual[1], sig[0] - 0.02)
    salida = [f"{n}\n{ts(a)} --> {ts(b)}\n{txt}\n" for n, (a, b, txt) in enumerate(subs, start=1)]
    destino = BASE.parent / "publicacion" / "subtitulos.es.srt"
    destino.write_text("\n".join(salida), encoding="utf-8")
    print(f"{len(subs)} subtítulos -> {destino}")


if __name__ == "__main__":
    main()
