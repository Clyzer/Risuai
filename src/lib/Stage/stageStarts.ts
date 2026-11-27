// How a story starts, read from the card. Risu offers two ways to begin a chat:
// the first message plus alternate greetings (picked with chat.fmIndex: -1 = first message,
// 0..n = alternateGreetings[n]), or a card that draws its own start menu with scripts.
import type { character, groupChat } from 'src/ts/storage/database.svelte'

export interface StageStart {
    /** Value for chat.fmIndex. */
    fmIndex: number
    title: string
    preview: string
    category: string
}

export type StageStartMode = 'greetings' | 'ownMenu' | 'single'

/** Plain text from a greeting: no HTML, no {{cbs}}, no markdown marks. */
function plain(text: string) {
    return (text ?? '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\{\{[\s\S]*?\}\}/g, ' ')
        .replace(/[*_`>#~|]+/g, ' ')
        .replace(/[ \t]+/g, ' ')
}

function describe(text: string, fmIndex: number, fallbackTitle: string): StageStart {
    const lines = plain(text)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    let first = lines[0] ?? ''
    let category = ''
    const tag = first.match(/^\[([^\]]{1,24})\]\s*(.*)$/)
    if (tag) {
        category = tag[1].trim()
        first = tag[2].trim() || lines[1] || ''
    }
    const title = (first || fallbackTitle).slice(0, 70)
    const preview = lines
        .slice(tag && !tag[2].trim() ? 2 : 1)
        .join(' ')
        .slice(0, 180)
    return { fmIndex, title, preview, category }
}

/** The card renders its own start screen: a Lua trigger, or a first message that is just a marker. */
export function hasOwnStartMenu(char: character | groupChat) {
    const c = char as character
    const usesLua = (c.triggerscript ?? []).some((t) => t.effect?.some((e) => e.type === 'triggerlua'))
    const markerFirstMessage = /^[A-Z0-9_:\-]{4,64}$/.test((c.firstMessage ?? '').trim())
    return usesLua || markerFirstMessage
}

export function startMode(char: character | groupChat): StageStartMode {
    const c = char as character
    if ((c.alternateGreetings ?? []).filter((g) => g?.trim()).length > 0) return 'greetings'
    if (hasOwnStartMenu(char)) return 'ownMenu'
    return 'single'
}

export function listStarts(char: character | groupChat, mainLabel: string, numbered: (n: number) => string): StageStart[] {
    const c = char as character
    const starts: StageStart[] = [describe(c.firstMessage ?? '', -1, mainLabel)]
    ;(c.alternateGreetings ?? []).forEach((g, i) => {
        if (g?.trim()) starts.push(describe(g, i, numbered(i + 2)))
    })
    return starts
}
