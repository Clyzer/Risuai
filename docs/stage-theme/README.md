# Tema Stage

Tema opcional de Risu pensado para el celular, con forma de lanzador de juegos. Se activa en **Ajustes → Pantalla → Tema → Stage**. Es una capa de interfaz: no toca `src/ts/process/`, el formato de guardado ni el armado del prompt. Lo que Stage guarda vive en campos que Risu ya tiene (`extentions.risuStage` del personaje y el lorebook de cada partida).

El mockup original está en `mockup.html` y el análisis de una historia real (Argenta Academy) en `fase-0.md`.

## Pantallas

- **Barra inferior:** Inicio · Chats · Realm · Yo.
- **Inicio:** historias (juegos armados dentro de la tarjeta) y partidas recientes. El **+** revisa la tarjeta antes de importarla: qué trae, si va a Historias o a Chats, qué módulo necesita y si pide acceso avanzado.
- **Ficha de la historia:** resumen, cómo empezar, módulos que necesita (vincular, importar), partidas y las notas del creador plegadas.
- **Partida:** el contenido de la tarjeta a todo el ancho, con dos modos:
  - **Novela:** el chat como lo dibuja la tarjeta.
  - **Drama:** novela visual, una línea por pantalla, con fondo, personaje, nombre y las opciones de la tarjeta al final. Mientras se juega en Drama, la partida lleva una nota de formato en su propio lorebook.
- **Menú de la partida:** partidas, módulos, persona, modelo, lorebook, personaje, indicadores, variables y línea de tiempo, todo con pantallas propias.
- **Chats:** personajes uno a uno con estilo de mensajería (burbujas, foto, "escribiendo…"). No tienen Drama.
- **Realm:** buscar y descargar tarjetas.
- **Yo:** persona, modelos, módulos, plugins, pantalla, idioma, accesibilidad y ajustes avanzados. Los ajustes de Risu que son datos (`src/ts/setting/*Data`) se dibujan con el renderizador de Stage.
- **Diálogos:** avisos, confirmaciones, listas, progreso y el menú "+" son hojas de Stage.

## Uso en el celular

- El gesto atrás cierra lo que esté arriba y nunca sale de la app.
- Deslizar hacia abajo en Inicio, Chats, Yo, Realm o la ficha recarga la app (espera a que termine de guardar).
- La app instalada se dibuja debajo de las barras del sistema, y el teclado achica la pantalla en vez de taparla.

## Lo que sigue siendo de Risu

Pantallas profundas que cambian con cada versión de Risu y se abren desde un botón de Stage: Cuenta (login y sincronización), el editor completo del personaje (scripts, regex, assets), el contenido de los módulos, las opciones de los plugins y las opciones completas del modelo y de los otros modelos. También los diálogos poco comunes: elegir personaje o módulo, exportar tarjeta y login.

## Servidor propio

Detrás de un proxy en la misma máquina (por ejemplo `tailscale serve`), arrancá el servidor con `TRUST_PROXY=loopback`. Así el límite de pedidos cuenta cada dispositivo por separado.
