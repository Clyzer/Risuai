<script lang="ts">
    // The story's or character's everyday fields: picture, name, description, first message and
    // alternate greetings, plus this playthrough's author's note. Same fields and avatar flow as
    // Risu's editor (selectCharImg). Scripts, regex, assets and the rest: Risu's full editor.
    import { ImageIcon, PlusIcon, SlidersHorizontalIcon, Trash2Icon, UsersIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { selectCharImg } from 'src/ts/characters'
    import { findCharacterbyId } from 'src/ts/util'
    import type { character } from 'src/ts/storage/database.svelte'
    import StagePage from './StagePage.svelte'
    import StageCover from './StageCover.svelte'

    interface Props {
        close: () => void
        openFullEditor: () => void
    }

    let { close, openFullEditor }: Props = $props()

    let charIndex = $derived($selectedCharID)
    let char = $derived(DBState.db.characters[charIndex])
    let single = $derived(char?.type !== 'group' ? (char as character) : null)
    let chat = $derived(char?.chats?.[char.chatPage])

    function addGreeting() {
        if (!single) return
        single.alternateGreetings = [...(single.alternateGreetings ?? []), '']
    }

    function removeGreeting(i: number) {
        if (!single) return
        single.alternateGreetings = single.alternateGreetings.filter((_, j) => j !== i)
    }
</script>

<StagePage title={language.stage.editCharacter} {close}>
    {#if char}
        <div class="stage-char-head">
            <span class="stage-char-pic">{#if char.image}<StageCover image={char.image} alt="" />{/if}</span>
            <button class="stage-btn" onclick={() => selectCharImg(charIndex)}><ImageIcon size={18} />{language.stage.changeImage}</button>
        </div>
        <label class="stage-field">
            {language.stage.personaName}
            <input class="stage-input" bind:value={char.name} />
        </label>

        {#if single}
            <label class="stage-field">
                {language.stage.charDescription}
                <textarea class="stage-input" rows="8" bind:value={single.desc}></textarea>
            </label>
            <label class="stage-field">
                {language.stage.charFirstMessage}
                <textarea class="stage-input" rows="6" bind:value={single.firstMessage}></textarea>
            </label>
            <div class="stage-section">{language.stage.charGreetings}</div>
            {#each single.alternateGreetings ?? [] as _, i}
                <div class="stage-field">
                    <span class="stage-greet-head">
                        {language.stage.greetingN.replace('{}', String(i + 1))}
                        <button class="stage-pill-btn" aria-label={language.stage.removeGreeting} onclick={() => removeGreeting(i)}><Trash2Icon size={18} /></button>
                    </span>
                    <textarea class="stage-input" rows="4" bind:value={single.alternateGreetings[i]}></textarea>
                </div>
            {/each}
            <button class="stage-btn block" onclick={addGreeting}><PlusIcon size={18} />{language.stage.addGreeting}</button>
        {:else}
            <div class="stage-section">{language.stage.groupMembers}</div>
            <div class="stage-list">
                {#each (char as { characters?: string[] }).characters ?? [] as id}
                    {@const member = findCharacterbyId(id)}
                    <div class="stage-row">
                        <span class="stage-row-ic">{#if member?.image}<StageCover image={member.image} alt="" />{:else}<UsersIcon size={18} />{/if}</span>
                        <span class="stage-row-text"><b>{member?.name ?? id}</b></span>
                    </div>
                {/each}
            </div>
        {/if}

        {#if chat}
            <div class="stage-section">{language.stage.authorNote}</div>
            <textarea class="stage-input" rows="4" bind:value={chat.note}></textarea>
            <p class="stage-note">{language.stage.authorNoteHint}</p>
        {/if}

        <div class="stage-btns">
            <button class="stage-btn block" onclick={openFullEditor}><SlidersHorizontalIcon size={18} />{language.stage.fullEditor}</button>
        </div>
        <p class="stage-note">{language.stage.fullEditorHint}</p>
    {/if}
</StagePage>

<style>
    .stage-char-head {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 14px;
    }
    .stage-char-pic {
        width: 84px;
        height: 84px;
        flex: none;
        border-radius: 18px;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-greet-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
</style>
