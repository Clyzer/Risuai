// Risu's save loop only re-encodes the character that is open in a chat. Edits Stage makes from
// the story page, where no chat is open (linking a module, choosing Stories or Chats, the choices
// made when importing), would stay in memory and be gone after a reload. For those, ask for the
// same full re-encode Risu uses after deleting a character, then wake the save loop with a copy
// of a top-level list it watches (same content, new array).
import { get } from 'svelte/store'
import type { character, groupChat } from 'src/ts/storage/database.svelte'
import { requiresFullEncoderReload } from 'src/ts/globalApi.svelte'
import { DBState, selectedCharID } from 'src/ts/stores.svelte'

export function persistCharacterEdit(char: character | groupChat | undefined) {
    if (!char) return
    // The open character is already saved by Risu on every change.
    if (DBState.db.characters[get(selectedCharID)] === char) return
    requiresFullEncoderReload.state = true
    DBState.db.characterOrder = [...(DBState.db.characterOrder ?? [])]
}
