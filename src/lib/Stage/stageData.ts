// Read-only views over the database for the Stage theme. Nothing here writes to the database.
import type { Chat, character, groupChat } from 'src/ts/storage/database.svelte'

/**
 * Risu always keeps at least one chat per character, so an imported card already has an empty
 * "Chat 1". A chat counts as a playthrough only once something happened in it: messages, chat
 * variables (cards with their own start menu store the chosen opening there before any message),
 * or an opening other than the main one.
 */
export function isStarted(chat: Chat | undefined): boolean {
    if (!chat) return false
    return (chat.message?.length ?? 0) > 0 || Object.keys(chat.scriptstate ?? {}).length > 0 || (chat.fmIndex ?? -1) !== -1
}

/** Index of an untouched chat that a new playthrough can reuse, or -1. */
export function findUnusedChat(char: character | groupChat): number {
    if (char.type === 'group') return -1
    return (char.chats ?? []).findIndex((chat) => !isStarted(chat) && !chat.note?.trim() && !(chat.localLore?.length > 0))
}

export interface StageCharacterEntry {
    index: number
    name: string
    image: string
    /** Playthroughs actually started (empty chats are not counted). */
    chatCount: number
    lastInteraction: number
    /** Last time one of its playthroughs was opened, 0 when none was started. */
    lastPlayed: number
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
            chatCount: (c.chats ?? []).filter(isStarted).length,
            lastInteraction: c.lastInteraction || 0,
            lastPlayed: (c.chats ?? []).some(isStarted) ? c.lastInteraction || 0 : 0,
        }))
        .sort((a, b) => b.lastInteraction - a.lastInteraction || a.name.localeCompare(b.name))
}

export function listPlaythroughs(chars: (character | groupChat)[]): StagePlaythroughEntry[] {
    const out: StagePlaythroughEntry[] = []
    chars.forEach((c, charIndex) => {
        if (!c || !isListed(c)) return
        ;(c.chats ?? []).forEach((chat, chatIndex) => {
            if (!isStarted(chat)) return
            out.push({
                charIndex,
                chatIndex,
                charName: c.name || 'Unnamed',
                image: c.image,
                chatName: chat.name || `Chat ${chatIndex + 1}`,
                messageCount: chat.message?.length ?? 0,
                // Risu only stamps lastDate on chats that went through cold storage. The open chat
                // of a character was used when the character was, so it borrows lastInteraction.
                lastDate: chat.lastDate || (chatIndex === (c.chatPage ?? 0) ? c.lastInteraction || 0 : 0),
                isBranch: /\((Branch)( \d+)?\)$/.test(chat.name ?? ''),
            })
        })
    })
    return out.sort((a, b) => b.lastDate - a.lastDate || a.charIndex - b.charIndex || a.chatIndex - b.chatIndex)
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
