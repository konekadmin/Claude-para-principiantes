# Guion YouTube — De Excel a dashboard ejecutivo con Claude

Oct 18, 2026 · @Someone

## Ficha del video

**Título sugerido:** De Excel aburrido a dashboard ejecutivo en 5 minutos con Claude (el prompt que cambia todo)

**Alternativas para test A/B:**

- Deja de hacer dashboards en PowerPoint: Claude los hace mejor en 5 minutos
- El prompt de 2 pasos para que Claude cree dashboards que tu gerente sí va a entender
- Claude + Excel: dashboards financieros sin saber programar

| Campo | Definición |
| --- | --- |
| Tono | Conversacional con autoridad: cercano, directo, de alguien que lo usa en el trabajo real |
| Duración objetivo | 8–10 minutos (aprox. 1.300 palabras habladas) |
| Audiencia | Emprendedores, analistas y jefes de área en LatAm que quieren aplicar IA de forma estructurada |
| Promesa | Salir del video con un método replicable, no solo un dashboard bonito |
| Inspiración | Video de Nicolas Boucher, "Claude: Build Financial Dashboards in Minutes" (mayo 2026). Se adapta la idea; ejemplo, datos y prompts son propios |

Convención del guion: **\[PANTALLA\]** = lo que se ve, **\[VOZ\]** = lo que dices a cámara o en off.

## 1. Hook (0:00–0:30)

**\[PANTALLA\]** Arranca directo con el dashboard terminado: fondo oscuro, KPIs brillando, el cursor pasa sobre el mapa de calor y aparece un tooltip. Corte rápido a la hoja de Excel original, gris y llena de números.

**\[VOZ\]**

> Esto… era esto. Una hoja de Excel exportada del sistema, la misma que tienes tú todos los meses.
>
> Y esto es lo que Claude hizo con ella en menos de cinco minutos. Sin Power BI, sin programar una línea, sin pelearme con PowerPoint a las once de la noche.
>
> Pero lo que te voy a mostrar hoy no es el dashboard. Es el prompt de dos pasos que hace que Claude piense como un analista antes de diseñar. Ese prompt funciona con ventas, con gastos, con inventario, con lo que tengas. Quédate hasta el final, porque ahí está la diferencia entre un gráfico bonito y una herramienta que tu gerente realmente usa.

**\[PANTALLA\]** Logo del canal, 2 segundos. Sin intro larga.

## 2. Problema (0:30–1:30)

**\[PANTALLA\]** B-roll: alguien copiando y pegando tablas en PowerPoint, ajustando colores de un gráfico, reloj marcando tarde.

**\[VOZ\]**

> Seamos honestos. El cierre de mes en la mayoría de empresas se ve así: bajas el reporte del ERP, lo pasas a Excel, armas tablas dinámicas, copias los gráficos a PowerPoint y rezas para que nadie pregunte "¿y esto por qué subió?".
>
> Son horas, a veces días, solo para mostrar números. Y lo peor es que el resultado casi nunca responde lo que la gerencia quiere saber: dónde está el problema y qué hacemos.
>
> Muchos ya probaron pedirle a una IA "hazme un dashboard". Y sí, sale algo. Pero sale genérico: gráficos que no cuentan una historia, KPIs que nadie pidió, y un diseño que no aguanta una reunión con el CFO.
>
> El problema no es la herramienta. Es cómo le estamos pidiendo las cosas.

**\[PANTALLA\]** Texto en pantalla: *"El problema no es la IA. Es el prompt."*

## 3. Desarrollo de la solución (1:30–5:30)

### Paso 0 — Los datos (1:30–2:00)

**\[PANTALLA\]** Excel de ejemplo: gastos por área (Ventas, Operaciones, TI, RR.HH., Finanzas, Marketing) y por categoría (personal, servicios, viajes, software, alquiler), comparando septiembre 2026 vs septiembre 2025, en soles.

**\[VOZ\]**

> Este es el archivo. Una exportación del ERP con el gasto por área y por categoría, este año contra el año pasado. Nada especial. Los datos son ficticios, y ojo con esto: si vas a usar datos reales de tu empresa, revisa antes qué políticas tiene tu organización sobre subir información a herramientas de IA.

### Paso 1 — El prompt rápido (2:00–3:30)

**\[PANTALLA\]** Claude abierto. Escribes el prompt en vivo y adjuntas el archivo.

```
Soy jefe de planeamiento financiero en una empresa comercial. Tengo que presentar el análisis de gastos por área del mes. Crea un dashboard en HTML con diseño moderno, oscuro y con efecto neón. Incluye: análisis por área, análisis por categoría y un gráfico de cascada (waterfall) con la variación frente al año pasado. Hazlo como el mejor diseñador de dashboards y programador web.
```

**\[VOZ\]**

> Fíjate en tres cosas: le digo quién soy, para qué es y qué gráficos quiero. Adjunto el archivo… y listo.

**\[PANTALLA\]** Se genera el dashboard. Recorres: gasto total, variación vs año anterior, principal driver, cascada por área, mapa de calor área × categoría.

> Ya tenemos algo muy usable. El total, la variación, qué área explica la mayor parte del cambio. Y mi favorito: este mapa de calor que cruza área con categoría. En un vistazo ves dónde está el dolor. Esto en una reunión vale oro.
>
> Pero aquí está la trampa: este dashboard tiene lo que yo pedí. Y yo no siempre sé qué es lo mejor que se puede mostrar. Ahí entra el paso dos.

### Paso 2 — El prompt que piensa antes de diseñar (3:30–5:30)

**\[VOZ\]**

> En el mismo chat, en lugar de pedirle un dashboard, le pido que primero analice y me proponga. El prompt tiene cinco partes. Te las dejo en pantalla y en la descripción.

**\[PANTALLA\]** El prompt aparece por bloques, resaltando cada parte mientras la nombras.

```
ROL: Actúa como un experto en diseño de dashboards, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene los gastos de la empresa por área y categoría, comparando septiembre 2026 con septiembre 2025.

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que el gerente general y el CFO entiendan en menos de un minuto.

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas, lógica y las métricas más importantes. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles, los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.
```

> ¿Qué cambia? Que ya no le pido un dibujo. Le pido que piense como un analista que le va a presentar al directorio: primero entender, después proponer, al final construir.

**\[PANTALLA\]** Claude muestra su análisis y propuesta. Luego el dashboard nuevo. Comparación lado a lado con el primero.

> Mira la diferencia. Ahora hay narrativa: frases que explican qué pasó y por qué. Hay filtros por área. Hay métricas que yo ni había pensado, como el peso de cada categoría en el gasto total. Esto ya no es un reporte; es una historia financiera que se puede discutir en la reunión.

## 4. Las 3 ideas clave (5:30–7:30)

**\[PANTALLA\]** Fondo limpio, cada idea entra como tarjeta numerada.

**\[VOZ\]**

> Si te quedas con tres cosas de este video, que sean estas.

**Idea 1 — Primero que piense, después que construya.**

> La diferencia entre el primer y el segundo dashboard no fue el diseño. Fue que en el segundo le pedí analizar antes de crear. Cuando le das a Claude espacio para entender los datos, te propone cosas que tú no habrías pedido. Esto sirve para dashboards, para informes, para presentaciones… para casi todo.

**Idea 2 — El prompt tiene estructura: rol, datos, objetivo, análisis y propuesta.**

> No es magia, es método. Le dices quién debe ser, qué tiene en las manos, para quién es el resultado, qué debe revisar y qué debe entregarte. Guarda esa plantilla. Cambias el archivo y la reutilizas con ventas, cobranzas, inventario o lo que necesites.

**Idea 3 — La IA hace el 80%; tú pones el criterio y la validación.**

> Claude te arma el dashboard en minutos, pero el que se para frente al gerente eres tú. Antes de presentar, revisa que los totales cuadren con tu Excel, que los insights tengan sentido de negocio y que no haya cifras inventadas. Pídele incluso que te muestre cómo calculó cada KPI. La velocidad no sirve si pierdes la confianza en la primera pregunta.

**\[PANTALLA\]** Resumen de las 3 tarjetas en una sola imagen (ideal para screenshot).

## 5. Llamado a la acción (7:30–8:30)

**\[PANTALLA\]** Vista de la comunidad en Skool: sección de plantillas, el prompt descargable, miembros comentando.

**\[VOZ\]**

> Te dejé los dos prompts en la descripción. Pero si quieres ir un paso más allá, en nuestra comunidad tenemos la plantilla completa del prompt de cinco partes, adaptada para ventas, gastos, cobranzas e inventario, más el archivo de ejemplo para que practiques sin usar datos de tu empresa.
>
> Ahí también compartimos casos reales de cómo estamos aplicando Claude en empresas, y puedes preguntar directamente sobre tu caso. El link está en la descripción.
>
> Y si en tu empresa necesitan llevar esto a otro nivel, con dashboards conectados a sus propios datos o automatizaciones a medida, también lo hacemos. Escríbenos desde el mismo link.
>
> Ahora, un favor rápido: déjame en los comentarios qué reporte te quita más tiempo cada mes. Con esas respuestas armo los próximos videos.

**\[PANTALLA\]** Botón de suscripción animado + texto: *"Comenta: ¿qué reporte te quita más tiempo?"*

## 6. Cierre y puente al siguiente video (8:30–9:30)

**\[PANTALLA\]** Vuelves al dashboard final. Lento zoom-out.

**\[VOZ\]**

> Hoy pasamos de un Excel exportado a un dashboard que puedes llevar a cualquier reunión. Pero hay un detalle: el próximo mes vas a tener que hacerlo otra vez. Nuevo archivo, nuevo chat, nuevo prompt.
>
> ¿Y si no tuvieras que hacerlo nunca más? En el siguiente video te muestro cómo convertir este dashboard en un reporte que se actualiza solo cada mes: subes el archivo nuevo, o mejor aún, lo conectas a tus datos, y Claude hace el resto, incluida la narrativa para gerencia.
>
> El video está aquí arriba. Nos vemos ahí.

**\[PANTALLA\]** Pantalla final (end screen) con el siguiente video y el link de la comunidad, 20 segundos.

**Título tentativo del siguiente video:** *Tu reporte mensual se hace solo: automatiza dashboards con Claude*

## 7. Notas de producción

**Miniatura:** mitad izquierda Excel gris y apagado, mitad derecha dashboard oscuro con neón azul/verde (estilo del collage de referencia). Texto grande: *"EXCEL → DASHBOARD en 5 MIN"*. Tu cara con expresión de sorpresa al lado del dashboard.

**B-roll sugerido (inspirado en el collage):** cascada (waterfall) con barras verdes y rojas, mapa de calor tipo treemap, tarjetas de KPI con anillos de progreso, gráficos de barras y líneas con brillo neón sobre fondo de oficina nocturna.

**Preparar antes de grabar:**

- [ ] Excel ficticio de gastos (6 áreas × 5 categorías, 2025 vs 2026, en soles)
- [ ] Correr ambos prompts antes y guardar los dashboards por si la demo en vivo falla
- [ ] Captura del dashboard 1 y 2 para la comparación lado a lado
- [ ] Link de la comunidad Skool y descripción con los dos prompts
- [ ] Crédito a Nicolas Boucher en la descripción como inspiración

**Capítulos para la descripción:**

1. 0:00 De Excel a dashboard
2. 0:30 Por qué tus reportes no funcionan
3. 1:30 Demo: el prompt rápido
4. 3:30 Demo: el prompt de 5 partes
5. 5:30 Las 3 ideas clave
6. 7:30 Plantillas y comunidad
7. 8:30 Lo que viene
