"""Voz del canal: Supertonic 3, voz M1 (masculina), configurada para español.

Lo comparten los videos (produccion/tts.py) y probar_voz.py:
  - CONFIG: voz, idioma, pasos y velocidad (voz.json)
  - texto_tts(): escritura fonética para que M1 pronuncie bien términos en inglés y siglas
  - motor(): crea el sintetizador (sherpa-onnx INT8 por defecto, o el paquete oficial `supertonic`)
  - recortar_silencio(): limpia el inicio y el final de cada toma
"""

import json
import re
import subprocess
from pathlib import Path

import numpy as np

DIR = Path(__file__).resolve().parent
CONFIG = json.loads((DIR / "voz.json").read_text(encoding="utf-8"))
MODELO_POR_DEFECTO = DIR / CONFIG["modelo"]
SR = 44100
ARCHIVOS_MODELO = ["duration_predictor.int8.onnx", "text_encoder.int8.onnx", "vector_estimator.int8.onnx",
                   "vocoder.int8.onnx", "tts.json", "unicode_indexer.bin", "voice.bin"]
# orden de las voces dentro de voice.bin (sherpa-onnx): F1..F5, M1..M5 -> M1 = sid 5
VOCES = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]

# Escritura fonética, validada transcribiendo las pruebas con Whisper. Los subtítulos usan el texto original.
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


def texto_tts(texto):
    for pat, rep in FONETICA:
        texto = re.sub(pat, rep, texto)
    return re.sub(r"\s+", " ", texto).strip()


def modelo_completo(d):
    """Los 7 archivos existen, no están vacíos y la instalación terminó (marca que deja instalar_voz.sh)."""
    return (d / ".instalado").is_file() and all((d / f).is_file() and (d / f).stat().st_size > 0 for f in ARCHIVOS_MODELO)


class SherpaBackend:
    """Supertonic 3 INT8 publicado por sherpa-onnx (instalar con voz/instalar_voz.sh)."""

    def __init__(self, modelo=None, voz="M1", pasos=12, velocidad=0.92, idioma="es"):
        import sherpa_onnx

        d = Path(modelo or MODELO_POR_DEFECTO)
        if not modelo_completo(d):
            if d.resolve() != MODELO_POR_DEFECTO.resolve():
                raise SystemExit(f"Falta el modelo o está incompleto en {d}. Ejecuta: bash voz/instalar_voz.sh")
            print("Instalando el modelo de voz (una sola vez)…")
            subprocess.run(["bash", str(DIR / "instalar_voz.sh")], check=True)
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
        try:
            self.tts = sherpa_onnx.OfflineTts(cfg)
        except RuntimeError as e:
            raise SystemExit(f"El modelo en {d} está dañado ({e}). Bórralo y ejecuta: bash voz/instalar_voz.sh")
        self.sid, self.pasos, self.velocidad, self.idioma = VOCES.index(voz), pasos, velocidad, idioma

    def __call__(self, texto):
        g = self.sherpa.GenerationConfig()
        g.sid, g.num_steps, g.speed = self.sid, self.pasos, self.velocidad
        g.extra["lang"] = self.idioma
        a = self.tts.generate(texto, g)
        assert a.sample_rate == SR, a.sample_rate
        return np.asarray(a.samples, dtype=np.float32)


class SupertonicBackend:
    """Paquete oficial `pip install supertonic` (descarga el modelo completo de Hugging Face).

    Usa voz/M1.json como estilo. El video publicado se hizo con SherpaBackend (modelo INT8)."""

    def __init__(self, voz="M1", pasos=12, velocidad=0.92, idioma="es"):
        from supertonic import TTS

        self.tts = TTS(auto_download=True)
        estilo = DIR / f"{voz}.json"
        self.style = (self.tts.get_voice_style_from_path(str(estilo)) if estilo.exists()
                      else self.tts.get_voice_style(voice_name=voz))
        self.pasos, self.velocidad, self.idioma = pasos, velocidad, idioma

    def __call__(self, texto):
        wav, _ = self.tts.synthesize(texto, voice_style=self.style, total_steps=self.pasos,
                                     speed=self.velocidad, lang=self.idioma, silence_duration=0.25)
        x = np.asarray(wav, dtype=np.float32).reshape(-1)
        sr = getattr(self.tts, "sample_rate", SR)
        assert sr == SR, sr
        return x


def motor(backend="sherpa", modelo=None, voz=None, pasos=None, velocidad=None, idioma=None):
    voz = voz or CONFIG["voz"]
    pasos = pasos or CONFIG["pasos"]
    velocidad = velocidad or CONFIG["velocidad"]
    idioma = idioma or CONFIG["idioma"]
    if backend == "sherpa":
        return SherpaBackend(modelo, voz, pasos, velocidad, idioma)
    return SupertonicBackend(voz, pasos, velocidad, idioma)


def recortar_silencio(x, umbral_db=-50.0, margen=0.07, margen_fin=0.08):
    """Quita el silencio inicial/final de una toma (las pausas se controlan aparte)."""
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
