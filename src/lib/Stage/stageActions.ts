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

/** Starts a new playthrough the same way Risu's "New Chat" button does, then opens it. */
export function startNewPlaythrough(charIndex: number) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    const chat: Chat = {
        message: [],
        note: '',
        name: `${language.newChat} ${char.chats.length + 1}`,
        localLore: [],
        fmIndex: -1,
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

/** Opens the most recently played chat of a character. */
export function continueStory(charIndex: number) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    let best = char.chatPage ?? 0
    let bestDate = -1
    char.chats.forEach((chat, i) => {
        const d = chat.lastDate || 0
        if (d > bestDate) {
            bestDate = d
            best = i
        }
    })
    if (bestDate > 0) char.chatPage = best
    changeChar(charIndex)
}
