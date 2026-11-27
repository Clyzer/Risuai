// What a story needs before it plays well, worked out from data Risu already keeps.
// Risu has no field that says "this card requires module X", so the only hard facts are the
// modules linked to the character; the rest is a hint read from the creator's notes.
import type { character, groupChat } from 'src/ts/storage/database.svelte'
import type { RisuModule } from 'src/ts/process/modules'

export interface StageModuleInfo {
    id: string
    name: string
    assetCount: number
}

export interface StageRequirements {
    /** Modules linked to this character that are installed. */
    linked: StageModuleInfo[]
    /** Module ids linked to this character whose module is no longer installed. */
    missingLinked: string[]
    /** Installed modules, not linked here, whose name contains the story's name. */
    suggested: StageModuleInfo[]
    /** Modules switched on for every chat (they also apply to this story). */
    global: StageModuleInfo[]
    /** The creator's notes talk about a separate module file. */
    notesMentionModule: boolean
    /** The card asked for low level access (Lua, auxiliary model calls). */
    lowLevelAccess: boolean
    /** Something here deserves a look before playing. */
    needsAttention: boolean
}

const MODULE_HINT = /\.risum\b|\bmodules?\b|módulo|모듈|モジュール|模块|模組/i

function normalize(text: string) {
    return (text ?? '')
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
}

function info(m: RisuModule): StageModuleInfo {
    return { id: m.id, name: m.name || m.id, assetCount: m.assets?.length ?? 0 }
}

export function storyRequirements(
    char: character | groupChat,
    modules: RisuModule[],
    enabledModules: string[] = []
): StageRequirements {
    const linkedIds = char.modules ?? []
    const byId = new Map(modules.map((m) => [m.id, m]))
    const linked = linkedIds.filter((id) => byId.has(id)).map((id) => info(byId.get(id)))
    const missingLinked = linkedIds.filter((id) => !byId.has(id))
    const global = enabledModules.filter((id) => byId.has(id)).map((id) => info(byId.get(id)))

    // Match the module name against the story name, with and without bracketed parts, so that
    // "Argenta Academy (ES)" still finds "🏰 Argenta Academy (아르젠타 아카데미) · Assets".
    const names = [normalize(char.name), normalize((char.name ?? '').replace(/[([{][^)\]}]*[)\]}]/g, ' '))].filter((n) => n.length >= 3)
    const suggested =
        names.length > 0
            ? modules
                  .filter((m) => !linkedIds.includes(m.id) && !enabledModules.includes(m.id))
                  .filter((m) => names.some((n) => normalize(m.name).includes(n)))
                  .map(info)
            : []

    const notesMentionModule = MODULE_HINT.test((char as character).creatorNotes ?? '')
    const hasAnyModule = linked.length > 0 || global.length > 0
    const lowLevelAccess = !!(char as character).lowLevelAccess

    return {
        linked,
        missingLinked,
        suggested,
        global,
        notesMentionModule,
        lowLevelAccess,
        needsAttention: missingLinked.length > 0 || suggested.length > 0 || (notesMentionModule && !hasAnyModule),
    }
}
