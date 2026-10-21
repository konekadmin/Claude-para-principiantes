"""Arma los dashboards interactivos de material/ en un solo HTML cada uno (sin dependencias)."""

from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
ESC = BASE / "produccion" / "escenas"

PAGINA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
html, body {{ margin: 0; background: #070b14; min-height: 100%; }}
#stage {{ transform-origin: 0 0; width: 1600px; height: 900px; }}
#wrap {{ overflow: hidden; margin: 0 auto; }}
#marco {{ overflow-x: auto; }}
.nota {{ font: 12px Inter, system-ui, sans-serif; color: #7d89a3; text-align: center; padding: 10px 16px 18px; }}
{css}
</style>
</head>
<body>
<div id="marco"><div id="wrap"><div id="stage"></div></div></div>
<div class="nota">{nota} · se ve mejor en computadora</div>
<script>
{data}
</script>
<script>
{viz}
</script>
<script>
(function () {{
  const dash = KonekViz.createDashboard({kind}, document.getElementById("stage"), {{ progress: 0 }});
  dash.enableInteraction();
  function fit() {{
    // en pantallas angostas no se achica de más: se puede desplazar en horizontal
    const s = Math.max(0.55, Math.min(window.innerWidth / 1600, 1.25));
    const st = document.getElementById("stage"), w = document.getElementById("wrap");
    st.style.transform = "scale(" + s + ")";
    w.style.width = 1600 * s + "px";
    w.style.height = 900 * s + "px";
  }}
  window.addEventListener("resize", fit);
  fit();
  const t0 = performance.now();
  (function anim(now) {{
    const p = Math.min(1, (now - t0) / 1400);
    dash.setState({{ progress: p }});
    if (p < 1) requestAnimationFrame(anim);
  }})(t0);
}})();
</script>
</body>
</html>
"""

SALIDAS = [
    (1, "dashboard-1-prompt-rapido.html", "Gastos por área · prompt rápido",
     "Dashboard 1 · resultado del prompt rápido · datos ficticios · pasa el cursor sobre los gráficos para ver el detalle"),
    (2, "dashboard-2-prompt-5-partes.html", "Gastos sep 2026 · prompt de 5 partes",
     "Dashboard 2 · resultado del prompt de 5 partes · datos ficticios · usa los filtros por área y pasa el cursor sobre los gráficos"),
]


def main():
    css = (ESC / "konek-viz.css").read_text(encoding="utf-8")
    data = (ESC / "data.js").read_text(encoding="utf-8")
    viz = (ESC / "konek-viz.js").read_text(encoding="utf-8")
    for kind, nombre, titulo, nota in SALIDAS:
        html = PAGINA.format(titulo=titulo, nota=nota, css=css, data=data, viz=viz, kind=kind)
        (BASE / "material" / nombre).write_text(html, encoding="utf-8")
        print("ok", nombre)


if __name__ == "__main__":
    main()
