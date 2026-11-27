# Tema Stage (propuesta)

Mockup navegable para celular de un tema nuevo y opcional para Risu: `mockup.html` (abrilo en el navegador).

## Ideas principales

- **Barra inferior:** Inicio · Chats · Realm · Yo.
- **Historias:** juegos completos armados dentro de la tarjeta. Cada una tiene su ficha (módulos que necesita, partidas, descripción), un selector de comienzos (saludos alternativos) y dos modos:
  - **Novela:** el HTML de la tarjeta a todo el ancho, con scroll.
  - **Drama:** el mismo contenido, bloque por bloque y a pantalla completa.
- **Chats:** personajes de conversación uno a uno, con estilo de mensajería.
- **Importación:** detecta si una tarjeta es historia o chat, avisa si falta el módulo de assets y pide el acceso avanzado como hoy.
- **Indicadores:** opcionales. Leen variables del chat o un regex sobre la respuesta, y vienen apagados si la tarjeta ya trae su propio panel de estado.

## Restricción

No se toca el núcleo de Risu: nada de `src/ts/process/`, ni del formato de guardado, ni del armado del prompt. El tema es una capa de UI nueva en `src/lib` más su opción en el selector de temas. El tipo (historia o chat) y los indicadores se guardan en el campo `extentions` que ya tiene cada personaje.

## Pendiente de verificar con tarjetas reales

1. Que Drama pueda separar en bloques el HTML de cada tarjeta.
2. Las categorías de los comienzos, que dependen de una etiqueta que pone el creador.
3. La detección de módulos requeridos, que hoy solo sale de la descripción.
