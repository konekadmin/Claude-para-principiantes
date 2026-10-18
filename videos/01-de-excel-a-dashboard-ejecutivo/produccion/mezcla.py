"""Mezcla final del audio: locución + colchón musical suave (sintetizado aquí, sin derechos de terceros).

La música solo suena en la cortinilla del logo y en la pantalla final, donde no hay voz, ~14 dB por debajo de ella.
Uso: python3 produccion/mezcla.py [voz.wav]   (por defecto audio/narracion.flac; ensamblar.sh le pasa la voz ya masterizada)
Salida: produccion/audio/mezcla.wav
"""

import sys

import json
from pathlib import Path

import numpy as np
import soundfile as sf

BASE = Path(__file__).resolve().parent
SR = 44100
NOTA = {"A2": 110.0, "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.0, "A3": 220.0,
        "B3": 246.94, "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.0, "A4": 440.0, "B4": 493.88}


def voz_pad(freq, dur, rng):
    """Una nota de pad: varias ondas casi sinusoidales desafinadas, con vibrato lento."""
    t = np.arange(int(dur * SR)) / SR
    x = np.zeros_like(t)
    for det in (-0.07, 0.0, 0.06):
        f = freq * 2 ** (det / 12)
        fase = rng.uniform(0, 2 * np.pi)
        lfo = 1 + 0.002 * np.sin(2 * np.pi * 0.25 * t + fase)
        ph = 2 * np.pi * np.cumsum(f * lfo) / SR + fase
        x += np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    return x / 3


def envolvente(n, ataque, caida):
    e = np.ones(n)
    a, r = int(ataque * SR), int(caida * SR)
    e[:a] = np.linspace(0, 1, a) ** 2
    e[-r:] *= np.linspace(1, 0, r) ** 1.5
    return e


def acorde(notas, dur, rng, ataque=1.2, caida=1.6):
    n = int(dur * SR)
    x = sum(voz_pad(NOTA[k], dur, rng) for k in notas) / len(notas)
    return x[:n] * envolvente(n, ataque, caida)


def paso_bajo(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):  # filtro de un polo, dos pasadas
        acc = (1 - a) * v + a * acc
        y[i] = acc
    acc = 0.0
    for i, v in enumerate(y):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def reverb(x, rng, seg=2.2, mezcla=0.35):
    n = int(seg * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * seg / 6.0))
    ir /= np.sqrt(np.sum(ir ** 2))
    m = len(x) + n
    tam = 1 << (m - 1).bit_length()
    hum = np.fft.irfft(np.fft.rfft(x, tam) * np.fft.rfft(ir, tam), tam)[:m]
    seco = np.concatenate([x, np.zeros(n)])
    return (1 - mezcla) * seco + mezcla * hum


def main():
    rng = np.random.default_rng(7)
    tl = json.loads((BASE / "timeline.json").read_text(encoding="utf-8"))
    global SR
    voz, SR = sf.read(sys.argv[1] if len(sys.argv) > 1 else BASE / "audio" / "narracion.flac", dtype="float32")
    if voz.ndim > 1:
        voz = voz.mean(axis=1)
    total = len(voz)
    musica = np.zeros(total + 4 * SR)

    def poner(x, t0):
        i = int(t0 * SR)
        j = min(len(musica), i + len(x))
        musica[i:j] += x[: j - i]

    # cortinilla del logo: un acorde que crece y se apaga
    logo = tl["items"]["logo"]
    d = logo["end"] - logo["start"] + 1.0
    poner(paso_bajo(acorde(["C3", "G3", "B3", "D4", "E4"], d, rng, 0.5, 1.4), 2200) * 0.9, logo["start"] - 0.2)

    # pantalla final: progresión lenta Am9 - Fmaj9 - Cmaj9 - G6
    fin = tl["items"]["endscreen"]
    t0, largo = fin["start"] - 0.4, fin["end"] - fin["start"] + 0.4
    prog = [["A2", "E3", "G3", "B3", "C4"], ["F3", "A3", "C4", "E4", "G4"], ["C3", "G3", "B3", "D4", "E4"], ["G3", "B3", "D4", "E4", "A4"]]
    paso = largo / len(prog)
    for k, notas in enumerate(prog):
        poner(paso_bajo(acorde(notas, paso + 1.6, rng, 1.0, 1.8), 1800), t0 + k * paso)
    # fundido de salida al final del video
    a, b = int((fin["end"] - 4.0) * SR), int(fin["end"] * SR)
    musica[a:b] *= np.linspace(1, 0, b - a) ** 2
    musica[b:] = 0

    musica = reverb(musica, rng)[: total]
    # el pad queda ~14 dB por debajo de la voz (RMS medido en las frases y en la pantalla final)
    def rms(x, a, b):
        return np.sqrt(np.mean(x[int(a * SR): int(b * SR)] ** 2)) + 1e-12
    frases = [it for it in tl["items"].values() if not it.get("gap")]
    rms_voz = np.sqrt(np.mean([rms(voz, it["start"], it["end"]) ** 2 for it in frases]))
    rms_pad = rms(musica, fin["start"] + 1, fin["end"] - 4)
    musica *= rms_voz * 10 ** (-14 / 20) / rms_pad
    mezcla = voz + musica.astype(np.float32)
    pico = np.max(np.abs(mezcla))
    if pico > 0.98:
        mezcla *= 0.98 / pico
    sf.write(BASE / "audio" / "mezcla.wav", mezcla, SR, subtype="PCM_16")
    print(f"mezcla.wav: {len(mezcla) / SR:.1f} s, pico {20 * np.log10(np.max(np.abs(mezcla))):.1f} dBFS")


if __name__ == "__main__":
    main()
