// User actions started from the Stage theme. Each one is an explicit tap and reuses Risu's own
// functions (readModule, the same new-chat shape SideChatList creates, changeChar).
import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertClear, alertError, alertNormal, alertWait } from 'src/ts/alert'
import { changeChar, createNewCharacter, createNewGroup } from 'src/ts/characters'
import { importCharacterProcess } from 'src/ts/characterCards'
import { importPreset } from 'src/ts/storage/database.svelte'
import { checkCharOrder } from 'src/ts/globalApi.svelte'
import { previewCard, routeOf } from './stageImportPreview'
import { setStageKind, type StageKind } from './stageKinds'
import { alertAddCharacter } from 'src/ts/alert'
import { stageNav } from './stageNav.svelte'
import { readModule, type RisuModule } from 'src/ts/process/modules'
import { DBState } from 'src/ts/stores.svelte'
import { findCharacterbyId, selectFileByDom } from 'src/ts/util'
import type { Chat } from 'src/ts/storage/database.svelte'
import { findUnusedChat, isStarted } from './stageData'
import { persistCharacterEdit } from './stageSave.svelte'

export function linkModule(charIndex: number, moduleId: string) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    const current = char.modules ?? []
    if (!current.includes(moduleId)) {
        char.modules = [...current, moduleId]
        persistCharacterEdit(char)
    }
}

export function unlinkMissingModules(charIndex: number, missingIds: string[]) {
    const char = DBState.db.characters[charIndex]
    if (!char) return
    char.modules = (char.modules ?? []).filter((id) => !missingIds.includes(id))
    persistCharacterEdit(char)
}

/**
 * Picks a .risum file and installs it with Risu's readModule. The picker accepts any file on
 * purpose: Android hides files with extensions it does not know (like .risum) when it filters.
 */
export async function importModuleFile(): Promise<RisuModule | null> {
    const files = await selectFileByDom(['*'], 'single')
    const file = files?.[0]
    if (!file) return null
    if (!file.name.toLowerCase().endsWith('.risum')) {
        alertError(language.stage.moduleWrongFile)
        return null
    }
    alertWait(language.stage.moduleImporting)
    try {
        const module = await readModule(Buffer.from(await file.arrayBuffer()))
        if (!module) return null // readModule already told the user what went wrong
        DBState.db.modules.push(module)
        alertClear()
        return module
    } catch (error) {
        console.error(error)
        alertError(language.errors.noData)
        return null
    }
}

/** Imports a module and links it to the story. */
export async function importModuleForStory(charIndex: number) {
    const module = await importModuleFile()
    if (!module) return
    linkModule(charIndex, module.id)
    alertNormal(language.stage.moduleLinked.replace('{}', module.name))
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

/**
 * The Stage "+" button. Same choices as Risu's add-character dialog, but an imported card is not
 * opened as a chat: StageApp notices the new character and shows its story page instead.
 * Characters created from scratch still open, because that is where Risu lets you edit them.
 */
export async function addFromStage() {
    const before = DBState.db.characters.length
    const choice = await alertAddCharacter()
    switch (choice) {
        case 'importFromRealm':
            stageNav.detail = null
            stageNav.tab = 'realm'
            return
        case 'importCharacter':
            await pickAndReview()
            return
        case 'createfromScratch':
            createNewCharacter()
            break
        case 'createGroup':
            createNewGroup()
            break
        default:
            return
    }
    if (DBState.db.characters.length > before) {
        changeChar(DBState.db.characters.length - 1)
    }
}

/**
 * Stage import: pick one file and, for character cards, read it and show the review page before
 * anything is saved. Several files at once, or a card that cannot be read, use Risu's own import.
 */
export async function pickAndReview() {
    const files = await selectFileByDom(['*'], 'multiple')
    if (!files || files.length === 0) return
    if (files.length > 1) {
        for (const file of files) await importAnyFile(file)
        return
    }
    const file = files[0]
    if (routeOf(file.name) !== 'character') {
        await importAnyFile(file)
        return
    }
    alertWait(language.stage.reading)
    const preview = await previewCard(file)
    alertClear()
    if (!preview) {
        await importAnyFile(file)
        return
    }
    stageNav.importReview = { file, preview }
}

/** Imports one file the way Risu's drop handler does (presets, modules or characters). */
export async function importAnyFile(file: File) {
    const route = routeOf(file.name)
    if (route === 'preset') {
        await importPreset({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })
        alertNormal(language.successImport)
        return
    }
    if (route === 'module') {
        const module = await readModule(Buffer.from(await file.arrayBuffer()))
        if (module) {
            DBState.db.modules.push(module)
            alertNormal(language.successImport)
        }
        return
    }
    await importCharacterProcess({ name: file.name, data: file })
    checkCharOrder()
}

/** Confirms the review: Risu's import, then the choices made on the review page. */
export async function confirmImport(kind: StageKind, linkModuleIds: string[]) {
    const review = stageNav.importReview
    if (!review) return
    const before = DBState.db.characters.length
    closeReview()
    await importCharacterProcess({ name: review.file.name, data: review.file })
    checkCharOrder()
    const after = DBState.db.characters.length
    if (after <= before) return
    const index = after - 1
    const char = DBState.db.characters[index]
    setStageKind(char, kind)
    for (const id of linkModuleIds) linkModule(index, id)
    stageNav.detail = index
}

export function closeReview() {
    const review = stageNav.importReview
    if (review?.preview.coverUrl) URL.revokeObjectURL(review.preview.coverUrl)
    stageNav.importReview = null
}
