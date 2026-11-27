// User actions started from the Stage theme. Each one is an explicit tap and reuses Risu's own
// functions (readModule, the same new-chat shape SideChatList creates, changeChar).
import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertError, alertNormal, alertWait } from 'src/ts/alert'
import { changeChar } from 'src/ts/characters'
import { readModule } from 'src/ts/process/modules'
import { DBState } from 'src/ts/stores.svelte'
import { findCharacterbyId, selectFileByDom } from 'src/ts/util'
import type { Chat } from 'src/ts/storage/database.svelte'
import { findUnusedChat, isStarted } from './stageData'

export function linkModule(charIndex: number, moduleId: string) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    const current = char.modules ?? []
    if (!current.includes(moduleId)) {
        char.modules = [...current, moduleId]
    }
}

export function unlinkMissingModules(charIndex: number, missingIds: string[]) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    char.modules = (char.modules ?? []).filter((id) => !missingIds.includes(id))
}

/**
 * Imports a .risum module and links it to the story. The picker accepts any file on purpose:
 * Android hides files with extensions it does not know (like .risum) when the picker filters.
 */
export async function importModuleForStory(charIndex: number) {
    const files = await selectFileByDom(['*'], 'single')
    const file = files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.risum')) {
        alertError(language.stage.moduleWrongFile)
        return
    }
    alertWait(language.stage.moduleImporting)
    try {
        const module = await readModule(Buffer.from(await file.arrayBuffer()))
        if (!module) return // readModule already told the user what went wrong
        DBState.db.modules.push(module)
        linkModule(charIndex, module.id)
        alertNormal(language.stage.moduleLinked.replace('{}', module.name))
    } catch (error) {
        console.error(error)
        alertError(language.errors.noData)
    }
}

/**
 * Starts a new playthrough the same way Risu's "New Chat" button does, then opens it.
 * fmIndex picks the opening: -1 is the first message, 0..n an alternate greeting.
 */
export function startNewPlaythrough(charIndex: number, fmIndex: number = -1) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    // Reuse the empty chat Risu keeps around (for example "Chat 1" right after an import).
    const unused = findUnusedChat(char)
    if (unused !== -1) {
        char.chats[unused].fmIndex = fmIndex
        char.chatPage = unused
        changeChar(charIndex)
        return
    }
    const chat: Chat = {
        message: [],
        note: '',
        name: `${language.newChat} ${char.chats.length + 1}`,
        localLore: [],
        fmIndex,
        id: v4(),
    }
    if (char.type === 'group') {
        for (const id of char.characters) {
            chat.message.push({ saying: id, role: 'char', data: findCharacterbyId(id).firstMessage })
        }
    }
    char.chats.unshift(chat)
    char.chatPage = 0
    changeChar(charIndex)
}

/**
 * Opens the playthrough the player was last in: the open chat if it was started, otherwise the
 * started chat with the newest lastDate, otherwise the first started one.
 */
export function continueStory(charIndex: number) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    const current = char.chatPage ?? 0
    if (!isStarted(char.chats[current])) {
        let best = -1
        let bestDate = -1
        char.chats.forEach((chat, i) => {
            if (!isStarted(chat)) return
            const d = chat.lastDate || 0
            if (d > bestDate) {
                bestDate = d
                best = i
            }
        })
        if (best !== -1) char.chatPage = best
    }
    changeChar(charIndex)
}
