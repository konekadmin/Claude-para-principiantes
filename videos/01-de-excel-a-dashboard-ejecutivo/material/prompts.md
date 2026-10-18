# Prompts del video — De Excel a dashboard ejecutivo con Claude

Adjunta siempre el Excel en el mismo mensaje. Usa datos ficticios o revisa antes las políticas de tu organización sobre subir información a herramientas de IA.

## Prompt 1 · El prompt rápido

```
Soy jefe de planeamiento financiero en una empresa comercial. Tengo que presentar el análisis de gastos por área del mes. Crea un dashboard en HTML con diseño moderno, oscuro y con efecto neón. Incluye: análisis por área, análisis por categoría y un gráfico de cascada (waterfall) con la variación frente al año pasado. Hazlo como el mejor diseñador de dashboards y programador web.
```

## Prompt 2 · El prompt de 5 partes (en el mismo chat)

```
ROL: Actúa como un experto en diseño de dashboards, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene los gastos de la empresa por área y categoría, comparando septiembre 2026 con septiembre 2025.

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que el gerente general y el CFO entiendan en menos de un minuto.

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas, lógica y las métricas más importantes. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles, los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.
```

## Plantilla reutilizable

| Parte | Qué responde | Ejemplo |
| --- | --- | --- |
| ROL | ¿Quién debe ser? | Experto en dashboards, análisis de datos y prompt engineering |
| DATOS | ¿Qué tiene en las manos? | Qué contiene el archivo, qué periodo y en qué moneda |
| OBJETIVO | ¿Para quién es el resultado? | Quién lo va a usar y en cuánto tiempo lo debe entender |
| ANÁLISIS | ¿Qué debe revisar? | Estructura, columnas, lógica, métricas clave y que los totales cuadren |
| PROPUESTA | ¿Qué debe entregarte? | KPIs, gráficos, filtros, insights, layout, el prompt final y el dashboard |

```
ROL: Actúa como un experto en diseño de dashboards, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene [QUÉ DATOS], de [PERIODO], en [MONEDA / UNIDAD].

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que [QUIÉN LO USA] entienda en menos de un minuto para [DECISIÓN QUE DEBE TOMAR].

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas, lógica y las métricas más importantes. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles, los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.
```

## Adaptaciones

### Ventas

```
ROL: Actúa como un experto en diseño de dashboards comerciales, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene las ventas del mes por vendedor, cliente, producto y canal, con la meta mensual y el mismo mes del año pasado.

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que el gerente comercial entienda en menos de un minuto: cuánto vendimos, contra la meta y contra el año pasado, y dónde estamos ganando o perdiendo.

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas y lógica. Calcula el cumplimiento de meta, el crecimiento interanual, el ticket promedio y la concentración por cliente. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles (vendedor, canal, producto), los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.
```

### Gastos

```
ROL: Actúa como un experto en diseño de dashboards financieros, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene los gastos del mes por área, categoría y centro de costo, comparados con el mismo mes del año pasado (y con el presupuesto, si está disponible).

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que el gerente general y el CFO entiendan en menos de un minuto: cuánto gastamos, qué explica la variación y qué hay que revisar.

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas y lógica. Identifica qué áreas y categorías explican la variación y separa lo recurrente de lo puntual cuando los datos lo permitan. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles, los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.
```

### Cobranzas

```
ROL: Actúa como un experto en diseño de dashboards de tesorería y cuentas por cobrar, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene la cartera por cobrar al cierre del mes: cliente, documento, fecha de emisión, fecha de vencimiento, monto, moneda y saldo pendiente.

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que el jefe de créditos y cobranzas y el CFO entiendan en menos de un minuto: cuánto nos deben, cuánto está vencido y a quién hay que llamar primero.

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas y lógica. Calcula la antigüedad de la cartera por tramos (0-30, 31-60, 61-90, +90 días), el porcentaje vencido, los días de cobro (DSO) y la concentración en los principales clientes. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles (cliente, tramo, moneda), los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.
```

### Inventario

```
ROL: Actúa como un experto en diseño de dashboards de operaciones e inventario, análisis de datos y prompt engineering.

DATOS: El Excel adjunto contiene el inventario al cierre del mes por producto, almacén y categoría: stock en unidades, costo unitario, valor total, ventas o consumo de los últimos 3 meses y fecha del último movimiento.

OBJETIVO: Quiero un dashboard simple, limpio, profesional e interactivo, que el gerente de operaciones y el CFO entiendan en menos de un minuto: cuánto capital tenemos inmovilizado, qué rota y qué no, y dónde hay riesgo de quiebre de stock.

ANÁLISIS: Antes de crear nada, analiza el archivo. Entiende su estructura, columnas y lógica. Calcula la rotación, los días de inventario, la clasificación ABC y los productos sin movimiento. Valida que los totales cuadren.

PROPUESTA: Propónme los KPIs principales, los mejores gráficos, filtros útiles (almacén, categoría, clase ABC), los insights de negocio clave y el layout ideal. Luego escribe el prompt perfecto para construir ese dashboard y ejecútalo.
```

## Antes de presentar

- Los totales del dashboard cuadran con tu Excel.
- Los insights tienen sentido de negocio y no hay cifras inventadas.
- Pídele a Claude: «Muéstrame cómo calculaste cada KPI».
