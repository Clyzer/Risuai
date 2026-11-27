// Read-only views over the database for the Stage theme. Nothing here writes to the database.
import type { character, groupChat } from 'src/ts/storage/database.svelte'

export interface StageCharacterEntry {
    index: number
    name: string
    image: string
    chatCount: number
    lastInteraction: number
}

export interface StagePlaythroughEntry {
    charIndex: number
    chatIndex: number
    charName: string
    image: string
    chatName: string
    messageCount: number
    lastDate: number
    isBranch: boolean
}

function isListed(c: character | groupChat) {
    return !c.trashTime && c.chaId !== '§playground'
}

export function listCharacters(chars: (character | groupChat)[]): StageCharacterEntry[] {
    return chars
        .map((c, index) => ({ c, index }))
        .filter(({ c }) => c && isListed(c))
        .map(({ c, index }) => ({
            index,
            name: c.name || 'Unnamed',
            image: c.image,
            chatCount: c.chats?.length ?? 0,
            lastInteraction: c.lastInteraction || 0,
        }))
        .sort((a, b) => b.lastInteraction - a.lastInteraction || a.name.localeCompare(b.name))
}

export function listPlaythroughs(chars: (character | groupChat)[]): StagePlaythroughEntry[] {
    const out: StagePlaythroughEntry[] = []
    chars.forEach((c, charIndex) => {
        if (!c || !isListed(c)) return
        ;(c.chats ?? []).forEach((chat, chatIndex) => {
            out.push({
                charIndex,
                chatIndex,
                charName: c.name || 'Unnamed',
                image: c.image,
                chatName: chat.name || `Chat ${chatIndex + 1}`,
                messageCount: chat.message?.length ?? 0,
                lastDate: chat.lastDate || 0,
                isBranch: /\((Branch)( \d+)?\)$/.test(chat.name ?? ''),
            })
        })
    })
    return out.sort((a, b) => b.lastDate - a.lastDate)
}

const relative = new Intl.RelativeTimeFormat(typeof navigator !== 'undefined' ? navigator.languages : undefined, { numeric: 'auto', style: 'short' })

export function timeAgo(time: number): string {
    if (!time) return ''
    const diff = Date.now() - time
    const min = 60000, hour = 3600000, day = 86400000
    if (diff < hour) return relative.format(-Math.max(1, Math.floor(diff / min)), 'minute')
    if (diff < day) return relative.format(-Math.floor(diff / hour), 'hour')
    if (diff < 7 * day) return relative.format(-Math.floor(diff / day), 'day')
    if (diff < 30 * day) return relative.format(-Math.floor(diff / (7 * day)), 'week')
    if (diff < 365 * day) return relative.format(-Math.floor(diff / (30 * day)), 'month')
    return relative.format(-Math.floor(diff / (365 * day)), 'year')
}
