"""Genera los textos de YouTube (publicacion/youtube.md y publicacion/descripcion.txt).

Los capítulos se calculan con timeline.json, así coinciden con el video renderizado.
El link de la comunidad se toma de produccion/enlaces.json: edítalo ahí (no en las salidas, que se regeneran).
"""

import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
PUB = BASE.parent / "publicacion"

TITULO = "De Excel aburrido a dashboard ejecutivo en 5 minutos con Claude (el prompt que cambia todo)"
ALTERNATIVAS = [
    "Deja de hacer dashboards en PowerPoint: Claude los hace mejor en 5 minutos",
    "El prompt de 2 pasos para que Claude cree dashboards que tu gerente sí va a entender",
    "Claude + Excel: dashboards financieros sin saber programar",
]
PROMPT_1 = (
    "Soy jefe de planeamiento financiero en una empresa comercial. Tengo que presentar el análisis de gastos "
    "por área del mes. Crea un dashboard en HTML con diseño moderno, oscuro y con efecto neón. Incluye: análisis "
    "por área, análisis por categoría y un gráfico de cascada (waterfall) con la variación frente al año pasado. "
    "Hazlo como el mejor diseñador de dashboards y programador web."
)
PROMPT_2 = """ROL: Actúa como un experto en diseño de dashboards, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene los gastos de la empresa por área y categoría, comparando septiembre 2026 con septiembre 2025.

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que el gerente general y el CFO entiendan en menos de un minuto.

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas, lógica y las métricas más importantes. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles, los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo."""
CAPITULOS = [  # (id de la línea donde arranca la escena, margen, nombre)
    (None, 0, "De Excel a dashboard"),
    ("p1a", 0.3, "Por qué tus reportes no funcionan"),
    ("d1a", 0.4, "Los datos (paso 0)"),
    ("tipeo1", 0.2, "Demo: el prompt rápido"),
    ("q1a", 0.3, "Demo: el prompt de 5 partes"),
    ("i0", 0.3, "Las 3 ideas clave"),
    ("c1a", 0.3, "Plantillas y comunidad"),
    ("e1a", 0.3, "Lo que viene"),
]
TAGS = [
    "claude", "claude ai", "anthropic", "dashboard", "dashboard en excel", "dashboard financiero", "excel",
    "inteligencia artificial", "ia para finanzas", "prompt engineering", "prompts para claude", "análisis de datos",
    "kpi", "fp&a", "control de gestión", "reporte de gastos", "cierre de mes", "power bi", "no code",
    "automatización", "finanzas", "konek",
]
CANAL = (
    "Konek | Finanzas & IA — Domina la tecnología para trabajar de forma más inteligente y tomar el control total "
    "de tu dinero. Te enseñamos a construir sistemas de gestión, automatizar procesos y tomar decisiones financieras "
    "con Inteligencia Artificial (Claude, ChatGPT y herramientas No-Code)."
)


def mmss(t):
    t = int(t)
    return f"{t // 60}:{t % 60:02d}"


def main():
    tl = json.loads((BASE / "timeline.json").read_text(encoding="utf-8"))
    link = json.loads((BASE / "enlaces.json").read_text(encoding="utf-8"))["comunidad"]
    caps = [(0 if k is None else tl["items"][k]["start"] - m, n) for k, m, n in CAPITULOS]
    capitulos = "\n".join(f"{mmss(t)} {n}" for t, n in caps)
    fin = {"start": tl["items"]["pantalla_final"]["start"], "end": tl["items"]["endscreen"]["end"]}

    desc = f"""De un Excel exportado del ERP a un dashboard ejecutivo en minutos, con Claude. Pero lo importante no es el dashboard: es el prompt de 2 pasos que hace que Claude piense como un analista antes de diseñar. Funciona con gastos, ventas, cobranzas, inventario… con lo que tengas.

📥 Plantilla completa del prompt de 5 partes (ventas, gastos, cobranzas e inventario) + Excel de práctica, en la comunidad: [LINK_COMUNIDAD]
🏢 ¿Dashboards conectados a los datos de tu empresa o automatizaciones a medida? Escríbenos desde el mismo link.

⏱️ Capítulos
{capitulos}

🧩 PROMPT 1 · El prompt rápido
{PROMPT_1}

🧠 PROMPT 2 · El prompt de 5 partes (en el mismo chat, con el Excel adjunto)
{PROMPT_2}

✅ Antes de presentar
• Revisa que los totales cuadren con tu Excel.
• Revisa que los insights tengan sentido de negocio y que no haya cifras inventadas.
• Pídele a Claude que te muestre cómo calculó cada KPI.
• Si vas a usar datos reales, revisa antes las políticas de tu organización sobre subir información a herramientas de IA.

💬 ¿Qué reporte te quita más tiempo cada mes? Déjalo en los comentarios: con esas respuestas armo los próximos videos.

📺 Próximo video: Tu reporte mensual se hace solo: automatiza dashboards con Claude.

Inspiración: video de Nicolas Boucher, "Claude: Build Financial Dashboards in Minutes" (mayo 2026). La idea se adaptó; el ejemplo, los datos y los prompts son propios.

Nota: los datos del ejemplo son ficticios. La interfaz de chat que aparece es una recreación; los dashboards del video los programó Claude para este ejemplo, siguiendo lo que piden los prompts. Narración con voz sintética (Supertonic 3).

{CANAL}

#Claude #Excel #Dashboard"""

    desc = desc.replace("[LINK_COMUNIDAD]", link)
    assert len(desc) <= 5000, len(desc)
    tags = ", ".join(TAGS)
    assert len(tags) <= 500, len(tags)
    (PUB / "descripcion.txt").write_text(desc + "\n", encoding="utf-8")

    md = f"""# Publicación en YouTube — De Excel a dashboard ejecutivo con Claude

Canal: **Konek | Finanzas & IA** · Duración: **{mmss(tl['duracion'])}** · Voz: Supertonic 3, M1 (masculina)

> Antes de publicar, pon el link real de la comunidad en Skool en `produccion/enlaces.json` y vuelve a correr `python3 produccion/descripcion.py` (actualiza la descripción y el comentario fijado).

## Título

{TITULO}

Alternativas para la prueba A/B de títulos (Probar y comparar):

{chr(10).join(f"- {a}" for a in ALTERNATIVAS)}

## Miniatura

- `miniatura.png` — lista para subir (1280×720).
- `miniatura-espacio-cara.png` — misma composición con el lado derecho libre para tu cara con expresión de sorpresa (como pedía el guion). `guia-cara.png` es una guía transparente del lugar sugerido para superponerla en tu editor. Guarda tu versión con otro nombre: `armar_video.sh` regenera las miniaturas. Se editan desde `produccion/escenas/miniatura.html`.

## Descripción

Está completa en `descripcion.txt` (lista para copiar y pegar, {len(desc)} de 5.000 caracteres). Capítulos calculados del video final:

```
{capitulos}
```

## Etiquetas

```
{tags}
```

## Comentario fijado

```
¿Qué reporte te quita más tiempo cada mes? Cuéntamelo aquí 👇 Con tus respuestas armo los próximos videos.
Plantilla completa del prompt de 5 partes + Excel de práctica: {link}
```

## Configuración recomendada

| Campo | Valor |
| --- | --- |
| Idioma del video | Español |
| Subtítulos | Subir `subtitulos.es.srt` como español (sincronizados con la locución) |
| Categoría | Educación (o Ciencia y tecnología) |
| Audiencia | No, no es contenido creado para niños |
| Capítulos automáticos | Desactivados: ya van en la descripción |
| Lista de reproducción | Claude para finanzas (o la serie de dashboards) |
| Contenido alterado o sintético | La narración usa voz sintética, pero no imita a una persona real ni muestra hechos realistas falsos. Revisa la política vigente de YouTube al subir; la descripción ya lo aclara. |

## Pantalla final ({mmss(fin['start'])} – {mmss(fin['end'])})

Los últimos 20 segundos dejan marcos vacíos para los elementos de YouTube:

1. **Video** (arriba al centro; la locución dice «el video está aquí arriba» al comenzar la pantalla final): el siguiente video, *Tu reporte mensual se hace solo*. Mientras no exista, usa «Mejor para el espectador» o una lista de reproducción.
2. **Suscribirse** (círculo abajo a la izquierda).
3. **Otro video o lista** (rectángulo abajo a la derecha).

Arrastra cada elemento sobre su marco en el editor de pantalla final.

## Tarjetas sugeridas

- {mmss(tl['items']['c1b']['start'])} — enlace a la comunidad (si el canal tiene habilitados los vínculos) o a la lista de reproducción.
- {mmss(tl['items']['e2b']['start'])} — siguiente video, cuando esté publicado.
"""
    (PUB / "youtube.md").write_text(md, encoding="utf-8")
    print("ok: descripcion.txt", len(desc), "caracteres; tags", len(tags))
    print(capitulos)


if __name__ == "__main__":
    main()
