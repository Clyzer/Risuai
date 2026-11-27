# Fase 0: qué hace por dentro una historia real

Tarjeta analizada: **Argenta Academy v1.0.5** (RisuRealm `93055c20-a51c-4956-b7e8-60bea2dc1a43`, formato `.charx`, 32 MB).
Primero se analizó el archivo y después se probó dentro de Risu con el módulo de imágenes (ver el final).

## Cómo está armada

| Parte | Qué tiene |
|---|---|
| `first_mes` | Solo el marcador `WKA_FM_MENU_V1`. La pantalla de inicio la dibuja el script. |
| `alternate_greetings` | **0**. Los "100 comienzos" no son saludos alternativos: viven dentro del script, con 100 portadas como assets de la tarjeta. |
| Lorebook | 716 entradas (~1 MB). |
| Módulo embebido (`module.risum`) | 1 trigger **Lua de ~1 MB** (4.200 líneas), 5 regex y el lorebook. Al importar, Risu lo funde con el personaje (`characterCards.ts`, líneas 158-167). |
| `backgroundHTML` | ~100 KB, un solo bloque `<style>` con todas las clases `wka-*`. **Sin esto los paneles de la tarjeta salen sin estilo.** |
| `lowLevelAccess` | `true` (usa un modelo auxiliar para elegir imágenes). |
| Imágenes de personajes y fondos | **No vienen en la tarjeta.** Están en un módulo aparte (~238 MB) que se baja desde un enlace de la descripción. |
| Datos de Realm (`/hub/info`) | Dicen `haslore: false`, `hasEmotion: false`, `hasAsset: false`. **No sirven para detectar el tipo.** |

## Cómo dibuja cada respuesta

El Lua escucha `editDisplay` y convierte el texto del modelo en HTML:

1. El modelo escribe etiquetas como `<img="codigo" with="otro" bg="lugar">`. Cinco regex (`editoutput`) las normalizan.
2. `pics()` recorre el texto línea por línea. Cada imagen de novela visual sale como **un bloque propio**,
   `<div class="wka-root wka-vn">`, separado por saltos de línea de los párrafos de narración.
3. Al final de la respuesta agrega el periódico, el panel de estado, la barra de acciones (`risu-btn`) y,
   solo en la última respuesta, `settings(id)`.
4. `settings(id)` mete un `<div class="wka-dock">` con **`position:fixed; inset:0; z-index:30`**:
   los botones flotantes (⚙, cuaderno, mensajería) en `right:16px; bottom:104px`, más paneles que se
   abren con checkbox y `label for=` (sin JavaScript).
5. Los botones usan `risu-btn`. Risu los atiende en `Chat.svelte` (`handleButtonTriggerWithin`, línea 305),
   con un listener **por mensaje** que llama a `runLuaInteractionTrigger`.

## Qué cambia en el plan

1. **Reusar `Chat.svelte` para cada mensaje, no escribir otro renderizador.** Ahí viven el parseo, el
   `editDisplay` del Lua y el manejo de `risu-btn`. El tema Stage agrega una rama propia en ese
   componente, igual que ya hace Aurora (línea 1241). Es capa de UI, no núcleo.
2. **La pantalla de juego tiene que montar `BackgroundDom`.** Sin él no hay estilos de la tarjeta.
3. **Ningún contenedor que envuelva los mensajes puede usar `transform`, `filter`, `backdrop-filter`,
   `perspective`, `contain` ni `will-change`.** Cualquiera de esos haría que el `position:fixed` de la
   tarjeta quede atado al contenedor en lugar de a la pantalla, y los paneles se romperían.
   La barra superior que se esconde puede moverse con `transform`, porque no envuelve los mensajes.
4. **Dejar libre la esquina inferior derecha** (más o menos 70 px de ancho y de 100 a 160 px desde abajo):
   ahí van los botones flotantes de la tarjeta.
5. **"Elegir comienzo" pasa a ser secundario.** Solo aparece si la tarjeta tiene `alternate_greetings`.
   Si no, *Nueva partida* crea el chat y la tarjeta muestra su propio menú, como en esta.
6. **Drama es viable sin que la tarjeta haga nada especial.** Los pasos son los hijos de primer nivel del
   mensaje ya renderizado. Regla:
   - un bloque con controles (`risu-btn`, `button`, `input`, `label[for]`, `form`, `select`) **no** es
     un paso: se queda visible siempre;
   - los demás bloques (párrafos, `wka-vn`, figuras) son un paso cada uno;
   - se ocultan con CSS (`display:none`) sobre el mismo DOM, sin clonar, para que los botones sigan
     funcionando.
7. **Detección de tipo:** trigger Lua, `backgroundHTML` grande, lorebook grande o `lowLevelAccess` ⇒
   historia. Se decide con la tarjeta ya descargada, no con los datos de Realm.
8. **Indicadores del tema apagados por defecto** cuando la tarjeta tiene su propio panel de estado, que
   es lo que pasa siempre que la tarjeta tiene `editDisplay` o `backgroundHTML`.
9. **Módulo de assets:** se puede mostrar qué módulos tiene vinculados el personaje (`character.modules`),
   pero no cuál le falta. El aviso "necesita módulo" se queda como texto del creador.

## Prueba dentro de la app

Risu en local (`pnpm dev`, con `VITE_RISU_LEGAL_CONFIGURED=TRUE` solo en el proceso de prueba), pantalla
de 390×844, la tarjeta importada (pide el permiso de acceso avanzado, como se esperaba) y el módulo
`Assets v1.1.0` (320 MB, 3.485 imágenes) vinculado al personaje en `character.modules`.

- **Risu le agrega el prefijo `x-risu-` a las clases** de la tarjeta (`wka-vn` pasa a ser `x-risu-wka-vn`),
  también en el CSS del `backgroundHTML`. El tema no tiene que tocar esas clases.
- **Pantalla de inicio** (mensaje `-1`): dos bloques de primer nivel, el menú y el dock, los dos con controles.
- **Una escena de inicio** ("7 Strokes of the Bell") deja estos bloques, en orden:
  `P` × 3 · `DIV.wka-vn` · `P` · `DIV.wka-vn` · `P` × 4 · `DIV.wka-vn` · `P` · `DIV.wka-vn` · `P` ·
  `FIGURE.wka-fm-scene` · `DIV.wka-news` (con controles) · `DIV.wka-fmbar` (con controles) ·
  `DIV.wka-bar` (con controles) · `DIV.wka-side` (dock, **alto 0**).
- **El dock queda fijo a la pantalla** (390×844 en `0,0`) en el diseño estándar. Los botones flotantes
  (🏫 💬 🗺 ⚙) se ven a la derecha, sobre el contenido.
- **En el diseño estándar la columna del avatar le roba ancho a la tarjeta**: el menú de inicio queda
  apretado y algunos textos se parten letra por letra. Confirma que en Stage el mensaje tiene que ir a
  todo el ancho.
- **Imágenes:** la escena tiene 112 `<img>` (con `loading="lazy"`); al abrirla había 6 cargadas. Memoria
  de JS: unos 137 MB en Chromium de escritorio. Falta medir en un celular real.

### Regla de Drama, ajustada con lo que se vio

1. Los bloques de **alto 0** (como el dock) se muestran siempre: ahí viven los paneles fijos.
2. Cada bloque **sin controles** (`P`, `wka-vn`, figuras) es un paso.
3. Los bloques **con controles** (periódico, barras) se juntan en **un último paso**, para no tapar la
   lectura en cada pantalla.
4. Todo sobre el mismo DOM, ocultando con CSS. Los botones siguen funcionando porque el listener de
   `Chat.svelte` está en el mensaje, no en cada bloque.
