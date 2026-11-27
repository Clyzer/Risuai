// Reading mode of a playthrough (Novel or Drama) and the format note Drama adds to the prompt.
//
// Drama reads each reply as a visual novel (StageVn.svelte). To help it tell narration from speech
// and who is speaking, a playthrough in Drama carries one entry in its own chat lorebook
// (chat.localLore, Risu's per-playthrough lorebook): always active, high priority, and removed when
// the playthrough goes back to Novel. The card and the author's note are not touched.
import type { Chat, loreBook } from 'src/ts/storage/database.svelte'
import { language } from 'src/lang'

const MODE_KEY = 'risu-stage-mode:'

export function readMode(chaId: string): 'novel' | 'drama' {
    try {
        return localStorage.getItem(MODE_KEY + chaId) === 'drama' ? 'drama' : 'novel'
    } catch {
        return 'novel'
    }
}

export function saveMode(chaId: string, mode: 'novel' | 'drama') {
    try {
        localStorage.setItem(MODE_KEY + chaId, mode)
    } catch {}
}

const DRAMA_LORE_ID = 'risu-stage-drama-format'

const DRAMA_FORMAT = `[Stage · modo Drama: formato de lectura]
Esta partida se lee como novela visual, una línea por pantalla. Seguí escribiendo en el idioma de la historia.
- Si la historia ya marca personajes, imágenes o diálogos con su propio formato (etiquetas, paneles), usalo tal cual y no agregues otro.
- Si no, cada intervención hablada va en su propio párrafo, así: **Nombre**: «línea».
- La narración va en párrafos cortos, separada del diálogo. Las acciones se narran normalmente, sin asteriscos.
- Los pensamientos internos, si los hay, van solos en su párrafo y en cursiva.`

/** Adds or removes the Drama format entry in the playthrough's own lorebook. */
export function setDramaFormat(chat: Chat, on: boolean) {
    const list = chat.localLore ?? []
    const has = list.some((l) => l.id === DRAMA_LORE_ID)
    if (on && !has) {
        const entry: loreBook = {
            id: DRAMA_LORE_ID,
            key: '',
            secondkey: '',
            comment: language.stage.dramaLoreName,
            content: DRAMA_FORMAT,
            mode: 'normal',
            insertorder: 1000,
            alwaysActive: true,
            selective: false,
        }
        chat.localLore = [...list, entry]
    } else if (!on && has) {
        chat.localLore = list.filter((l) => l.id !== DRAMA_LORE_ID)
    }
}
