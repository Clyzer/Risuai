<script lang="ts">
    // Playthroughs of the open story: Risu's chat list as Stage rows. Uses Risu's own data and
    // helpers (changeChatTo, createChatCopyName, exportChat, chat.bindedPersona). Deleting keeps the
    // right playthrough open (Risu's list always jumps to the first one).
    import { CheckIcon, CopyIcon, DownloadIcon, EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon, UserRoundIcon } from '@lucide/svelte'
    import { v4 } from 'uuid'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { changeChatTo, createChatCopyName } from 'src/ts/globalApi.svelte'
    import { exportChat } from 'src/ts/characters'
    import { alertConfirm, alertError } from 'src/ts/alert'
    import { coldStorageHeader } from 'src/ts/process/coldstorageData'
    import { getUserName } from 'src/ts/util'
    import type { Chat } from 'src/ts/storage/database.svelte'
    import StagePage from './StagePage.svelte'
    import StageSheet from './StageSheet.svelte'
    import { startMode } from './stageStarts'
    import { startNewPlaythrough } from './stageActions'
    import { stageNav } from './stageNav.svelte'
    import { timeAgo } from './stageData'
    import { previewText } from './stageKinds'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let charIndex = $derived($selectedCharID)
    let char = $derived(DBState.db.characters[charIndex])
    let menuFor = $state<number | null>(null)
    let renaming = $state<number | null>(null)
    let renameValue = $state('')

    function isCold(chat: Chat) {
        return (chat.message?.[0]?.data ?? '').startsWith(coldStorageHeader)
    }

    function lastTime(chat: Chat) {
        const msgs = chat.message ?? []
        return msgs.length ? (msgs[msgs.length - 1].time ?? 0) : 0
    }

    function summary(chat: Chat) {
        if (isCold(chat)) return language.stage.coldStored
        const msgs = chat.message ?? []
        if (!msgs.length) return language.stage.emptyPlaythrough
        return previewText(msgs[msgs.length - 1].data, getUserName(), char?.name ?? '')
    }

    function personaName(chat: Chat) {
        if (!chat.bindedPersona) return null
        return DBState.db.personas.find((p) => p.id === chat.bindedPersona)?.name ?? null
    }

    function open(i: number) {
        if (i !== char.chatPage) changeChatTo(i)
        close()
    }

    function newOne() {
        if (startMode(char as never) === 'greetings') {
            // Stories with several openings start from the opening picker.
            stageNav.startPicker = charIndex
            selectedCharID.set(-1)
            return
        }
        startNewPlaythrough(charIndex)
        close()
    }

    function startRename(i: number) {
        menuFor = null
        renaming = i
        renameValue = char.chats[i].name
    }

    function saveRename() {
        if (renaming !== null && renameValue.trim()) char.chats[renaming].name = renameValue.trim()
        renaming = null
    }

    function copy(i: number) {
        menuFor = null
        const copy = $state.snapshot(char.chats[i]) as Chat
        copy.name = createChatCopyName(copy.name, 'Copy')
        copy.id = v4()
        char.chats.unshift(copy)
        changeChatTo(0)
    }

    function togglePersona(i: number) {
        menuFor = null
        const chat = char.chats[i]
        if (chat.bindedPersona) {
            chat.bindedPersona = ''
            return
        }
        const persona = DBState.db.personas[DBState.db.selectedPersona]
        if (!persona) return
        persona.id ??= v4()
        chat.bindedPersona = persona.id
    }

    function exportOne(i: number) {
        menuFor = null
        exportChat(i)
    }

    async function remove(i: number) {
        menuFor = null
        if (char.chats.length <= 1) {
            alertError(language.stage.onlyOnePlaythrough)
            return
        }
        if (!(await alertConfirm(language.stage.deletePlaythroughConfirm.replace('{}', char.chats[i].name)))) return
        const current = char.chatPage
        char.chats.splice(i, 1)
        char.chats = char.chats
        const next = i < current ? current - 1 : i === current ? Math.min(i, char.chats.length - 1) : current
        changeChatTo(next)
    }
</script>

<StagePage title={language.stage.playthroughs} {close}>
    {#snippet actions()}
        <button class="stage-pill-btn" aria-label={language.stage.newPlaythrough} title={language.stage.newPlaythrough} onclick={newOne}><PlusIcon size={22} /></button>
    {/snippet}

    {#if char}
        <div class="stage-list">
            {#each char.chats as chat, i (chat.id ?? i)}
                <div class="stage-row" class:on={i === char.chatPage}>
                    {#if renaming === i}
                        <!-- svelte-ignore a11y_autofocus -->
                        <input
                            class="stage-input"
                            bind:value={renameValue}
                            autofocus
                            onkeydown={(e) => {
                                if (e.key === 'Enter') saveRename()
                                if (e.key === 'Escape') renaming = null
                            }}
                        />
                        <button class="stage-pill-btn" aria-label={language.save} onclick={saveRename}><CheckIcon size={20} /></button>
                    {:else}
                        <button class="stage-row-main" onclick={() => open(i)}>
                            <span class="stage-row-text">
                                <b>{chat.name}</b>
                                <small>{summary(chat)}</small>
                                <small>
                                    {#if i === char.chatPage}{language.stage.openNow} · {/if}{#if !isCold(chat)}{language.stage.messagesCount.replace('{}', String(chat.message?.length ?? 0))}{/if}{#if lastTime(chat)} · {timeAgo(lastTime(chat))}{/if}{#if personaName(chat)} · {language.stage.personaBoundTo.replace('{}', personaName(chat) ?? '')}{/if}
                                </small>
                            </span>
                        </button>
                        <button class="stage-pill-btn" aria-label={language.stage.messageActions} onclick={() => (menuFor = i)}><EllipsisIcon size={20} /></button>
                    {/if}
                </div>
            {/each}
        </div>
        <div class="stage-btns">
            <button class="stage-btn primary" onclick={newOne}><PlusIcon size={18} />{language.stage.newPlaythrough}</button>
        </div>
    {/if}
</StagePage>

{#if menuFor !== null && char?.chats[menuFor]}
    {@const i = menuFor}
    <StageSheet title={char.chats[i].name} close={() => (menuFor = null)}>
        <div class="stage-list">
            <button class="stage-row" onclick={() => startRename(i)}><span class="stage-row-ic"><PencilIcon size={18} /></span><span class="stage-row-text"><b>{language.stage.rename}</b></span></button>
            <button class="stage-row" onclick={() => copy(i)}><span class="stage-row-ic"><CopyIcon size={18} /></span><span class="stage-row-text"><b>{language.stage.copyPlaythrough}</b></span></button>
            <button class="stage-row" onclick={() => togglePersona(i)}>
                <span class="stage-row-ic"><UserRoundIcon size={18} /></span>
                <span class="stage-row-text">
                    <b>{char.chats[i].bindedPersona ? language.stage.unbindPersona : language.stage.usePersonaHere}</b>
                    {#if !char.chats[i].bindedPersona}<small>{DBState.db.personas[DBState.db.selectedPersona]?.name ?? ''}</small>{/if}
                </span>
            </button>
            <button class="stage-row" onclick={() => exportOne(i)}><span class="stage-row-ic"><DownloadIcon size={18} /></span><span class="stage-row-text"><b>{language.stage.exportPlaythrough}</b></span></button>
            <button class="stage-row" onclick={() => remove(i)}><span class="stage-row-ic" style="color:#ff8a8a"><Trash2Icon size={18} /></span><span class="stage-row-text"><b style="color:#ff8a8a">{language.stage.deletePlaythrough}</b></span></button>
        </div>
    </StageSheet>
{/if}
