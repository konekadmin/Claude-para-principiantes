"""Genera los archivos del logo de Konek (SVG con textos convertidos a trazos, sin depender de fuentes).

Salidas en marca/:
  konek-simbolo.svg                 el símbolo (K de nodos conectados)
  konek-logo-horizontal-oscuro.svg  símbolo + "Konek" + "FINANZAS & IA", para fondos oscuros
  konek-logo-horizontal-claro.svg   lo mismo para fondos claros
  konek-avatar.svg                  avatar cuadrado para el canal (fondo oscuro, símbolo centrado)
Los PNG se exportan con: node marca/exportar_png.cjs

Requiere: pip install fonttools  y las fuentes Inter / Inter Display (https://rsms.me/inter/).
"""

import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

DIR = Path(__file__).resolve().parent
FUENTES = [Path("/usr/share/fonts/opentype/inter"), Path.home() / "Library/Fonts", Path("C:/Windows/Fonts")]
CIAN, VIOLETA = "#22d3ee", "#a78bfa"


def fuente(nombre):
    for d in FUENTES:
        if (d / nombre).exists():
            return TTFont(d / nombre)
    sys.exit(f"No encuentro {nombre}. Instala Inter (https://rsms.me/inter/) o ajusta FUENTES.")


def texto_a_trazo(font, texto, tam, x, y, espaciado=0.0):
    """Devuelve (path_d, ancho) del texto con la línea base en y."""
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    k = tam / font["head"].unitsPerEm
    d, cx = [], x
    for ch in texto:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, cx, y)))
        d.append(pen.getCommands())
        cx += hmtx[g][0] * k + espaciado * tam
    return " ".join(d), cx - x - espaciado * tam


def simbolo(id_grad, x=0, y=0, escala=1.0):
    """El símbolo en un cuadro de 120x120 (mismo dibujo que el video)."""
    return f"""<g transform="translate({x} {y}) scale({escala})">
  <defs><linearGradient id="{id_grad}" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{CIAN}"/><stop offset="1" stop-color="{VIOLETA}"/></linearGradient></defs>
  <g stroke="url(#{id_grad})" stroke-width="10" stroke-linecap="round" fill="none"><path d="M34 18 V102"/><path d="M34 62 L90 22"/><path d="M52 50 L90 98"/></g>
  <g fill="url(#{id_grad})"><circle cx="34" cy="18" r="10"/><circle cx="34" cy="102" r="10"/><circle cx="90" cy="22" r="10"/><circle cx="90" cy="98" r="10"/><circle cx="34" cy="62" r="8"/></g>
</g>"""


def svg(w, h, cuerpo):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">\n{cuerpo}\n</svg>\n'


def main():
    display = fuente("InterDisplay-ExtraBold.otf")
    semibold = fuente("Inter-SemiBold.otf")

    (DIR / "konek-simbolo.svg").write_text(svg(120, 120, simbolo("g")), encoding="utf-8")

    palabra, w1 = texto_a_trazo(display, "Konek", 84, 148, 78)
    lema, w2 = texto_a_trazo(semibold, "FINANZAS & IA", 17.5, 151, 110, espaciado=0.32)
    ancho = 148 + max(w1, w2 + 3) + 24
    for nombre, tinta, lema_color in (("oscuro", "#ffffff", "#b9c3d6"), ("claro", "#0b1222", "#4b5563")):
        cuerpo = simbolo("g" + nombre) + f'\n<path d="{palabra}" fill="{tinta}"/>\n<path d="{lema}" fill="{lema_color}"/>'
        (DIR / f"konek-logo-horizontal-{nombre}.svg").write_text(svg(ancho, 120, cuerpo), encoding="utf-8")

    avatar = (f'<defs><radialGradient id="bgav" cx="0.7" cy="0.2" r="0.9"><stop offset="0" stop-color="#12304a"/>'
              f'<stop offset="1" stop-color="#070b14"/></radialGradient></defs>\n<rect width="800" height="800" fill="url(#bgav)"/>\n'
              + simbolo("gav", 160, 160, 480 / 120))
    (DIR / "konek-avatar.svg").write_text(svg(800, 800, avatar), encoding="utf-8")
    print("SVG listos en", DIR)


if __name__ == "__main__":
    main()
