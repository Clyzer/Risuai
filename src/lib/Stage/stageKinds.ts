// Stories vs chats. A story is a game built inside the card (scripts, its own UI, many openings,
// a big lorebook, image modules); a chat is a character to talk to one-on-one. Detected from the
// card, overridable by the player. The override lives in the character's existing `extentions`
// field (Risu exports it with the card); prompts and chat processing never read it.
import type { character, groupChat } from 'src/ts/storage/database.svelte'
import { persistCharacterEdit } from './stageSave.svelte'

export type StageKind = 'story' | 'chat'

type WithExtensions = { extentions?: { [key: string]: any } }

function overrideOf(char: character | groupChat): StageKind | null {
    const k = (char as WithExtensions).extentions?.risuStage?.kind
    return k === 'story' || k === 'chat' ? k : null
}

/** What the card looks like, ignoring any override. */
export function detectedKind(char: character | groupChat): StageKind {
    if (char.type === 'group') return 'story'
    const c = char as character
    const usesLua = (c.triggerscript ?? []).some((t) => t.effect?.some((e) => e.type === 'triggerlua'))
    const ownUi = (c.backgroundHTML ?? '').trim().length > 0
    const openings = (c.alternateGreetings ?? []).filter((g) => g?.trim()).length
    const bigLore = (c.globalLore?.length ?? 0) >= 15
    const linkedModules = (c.modules?.length ?? 0) > 0
    return usesLua || ownUi || openings >= 2 || bigLore || linkedModules ? 'story' : 'chat'
}

export function stageKind(char: character | groupChat): StageKind {
    return overrideOf(char) ?? detectedKind(char)
}

export function isKindOverridden(char: character | groupChat): boolean {
    return overrideOf(char) !== null
}

/** Explicit choice from the story page. Choosing what the card already looks like clears the override. */
export function setStageKind(char: character | groupChat, kind: StageKind) {
    const target = char as WithExtensions
    const ext = { ...(target.extentions ?? {}) }
    const stage = { ...(ext.risuStage ?? {}) }
    if (detectedKind(char) === kind) delete stage.kind
    else stage.kind = kind
    if (Object.keys(stage).length > 0) ext.risuStage = stage
    else delete ext.risuStage
    target.extentions = ext
    persistCharacterEdit(char)
}

/** Short plain-text preview of a message for chat lists. */
export function previewText(text: string, userName: string, charName: string): string {
    return (text ?? '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\{\{user\}\}/gi, userName || 'You')
        .replace(/\{\{char\}\}/gi, charName)
        .replace(/\{\{[\s\S]*?\}\}/g, ' ')
        .replace(/[*_`#>~|]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
}
