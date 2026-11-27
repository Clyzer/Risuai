// Risu's save loop only re-encodes the character that is open in a chat. Edits Stage makes from
// the story page, where no chat is open (linking a module, choosing Stories or Chats, the choices
// made when importing), would stay in memory and be gone after a reload. Every Stage edit asks
// for the same full re-encode Risu uses after deleting a character, then wakes the save loop with
// a copy of a top-level list it watches (same content, new array).
//
// stageSaveStatus drives the "Saving… / Saved" notice, so the player knows when a reload is safe.
// The loop clears requiresFullEncoderReload when it re-reads the database and clears saving.state
// after writing it, so both being off after an edit means that edit is on disk.
import type { character, groupChat } from 'src/ts/storage/database.svelte'
import { requiresFullEncoderReload } from 'src/ts/globalApi.svelte'
import { DBState } from 'src/ts/stores.svelte'

export const stageSaveStatus = $state({ phase: 'idle' as 'idle' | 'saving' | 'saved' })

export function persistCharacterEdit(char: character | groupChat | undefined) {
    if (!char) return
    requiresFullEncoderReload.state = true
    DBState.db.characterOrder = [...(DBState.db.characterOrder ?? [])]
    stageSaveStatus.phase = 'saving'
}
