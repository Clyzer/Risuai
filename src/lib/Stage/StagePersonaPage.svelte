<script lang="ts">
    // Personas: pick who you are, edit the active one, add or delete. Same data and helpers as Risu's
    // persona page (db.personas, changeUserPersona, saveUserPersona); the active persona is edited
    // through its db.username / personaPrompt / userIcon / userNote copies, as Risu does. Changing
    // the picture keeps the persona's id, so playthroughs bound to it stay bound.
    import { CheckIcon, ImageIcon, PinIcon, PlusIcon, Trash2Icon, UserRoundIcon } from '@lucide/svelte'
    import { v4 } from 'uuid'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { changeUserPersona, saveUserPersona } from 'src/ts/persona'
    import { saveImage } from 'src/ts/storage/database.svelte'
    import { selectSingleFile } from 'src/ts/util'
    import { alertConfirm, alertError } from 'src/ts/alert'
    import StagePage from './StagePage.svelte'
    import StageCover from './StageCover.svelte'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let char = $derived(DBState.db.characters[$selectedCharID])
    let chat = $derived(char?.chats?.[char.chatPage])
    let active = $derived(DBState.db.personas[DBState.db.selectedPersona])

    function pick(i: number) {
        if (i !== DBState.db.selectedPersona) changeUserPersona(i)
    }

    async function changeImage() {
        const file = await selectSingleFile(['png', 'jpg', 'jpeg', 'webp'])
        if (!file) return
        DBState.db.userIcon = await saveImage(file.data)
        saveUserPersona()
    }

    function add() {
        DBState.db.personas.push({ name: language.stage.addPersona, icon: '', personaPrompt: '', note: '', id: v4() })
        changeUserPersona(DBState.db.personas.length - 1)
    }

    async function remove() {
        if (DBState.db.personas.length <= 1) {
            alertError(language.stage.onlyOnePersona)
            return
        }
        if (!(await alertConfirm(language.stage.deletePersonaConfirm.replace('{}', DBState.db.username)))) return
        saveUserPersona()
        DBState.db.personas.splice(DBState.db.selectedPersona, 1)
        changeUserPersona(0, 'noSave')
    }

    function toggleBind() {
        if (!chat || !active) return
        if (chat.bindedPersona && chat.bindedPersona === active.id) {
            chat.bindedPersona = ''
            return
        }
        active.id ??= v4()
        chat.bindedPersona = active.id
    }
</script>

<StagePage title={language.persona ?? 'Persona'} {close}>
    {#snippet actions()}
        <button class="stage-pill-btn" aria-label={language.stage.addPersona} title={language.stage.addPersona} onclick={add}><PlusIcon size={22} /></button>
    {/snippet}

    <p class="stage-lead">{language.stage.personaIntro}</p>
    <div class="stage-list">
        {#each DBState.db.personas as p, i (p.id ?? i)}
            <button class="stage-row" class:on={i === DBState.db.selectedPersona} onclick={() => pick(i)}>
                <span class="stage-row-ic">{#if p.icon}<StageCover image={p.icon} alt="" />{:else}<UserRoundIcon size={18} />{/if}</span>
                <span class="stage-row-text">
                    <b>{p.name}</b>
                    {#if chat?.bindedPersona && chat.bindedPersona === p.id}<small>{language.stage.boundHere}</small>{/if}
                </span>
                {#if i === DBState.db.selectedPersona}<span class="stage-row-end"><CheckIcon size={18} />{language.stage.inUse}</span>{/if}
            </button>
        {/each}
    </div>

    {#if active}
        <div class="stage-section">{DBState.db.username}</div>
        <div class="stage-persona-head">
            <span class="stage-persona-pic">{#if DBState.db.userIcon}<StageCover image={DBState.db.userIcon} alt="" />{:else}<UserRoundIcon size={30} />{/if}</span>
            <button class="stage-btn" onclick={changeImage}><ImageIcon size={18} />{language.stage.changeImage}</button>
        </div>
        <label class="stage-field">
            {language.stage.personaName}
            <input class="stage-input" bind:value={DBState.db.username} oninput={saveUserPersona} />
        </label>
        <label class="stage-field">
            {language.stage.personaDescription}
            <textarea class="stage-input" rows="6" bind:value={DBState.db.personaPrompt} oninput={saveUserPersona}></textarea>
        </label>
        <label class="stage-field">
            {language.stage.personaNote}
            <textarea class="stage-input" rows="3" bind:value={DBState.db.userNote} oninput={saveUserPersona}></textarea>
        </label>
        {#if chat}
            <button class="stage-row stage-persona-bind" role="switch" aria-checked={!!chat.bindedPersona && chat.bindedPersona === active.id} onclick={toggleBind}>
                <span class="stage-row-ic"><PinIcon size={18} /></span>
                <span class="stage-row-text"><b>{language.stage.bindHere}</b></span>
                <i class="stage-switch" class:on={!!chat.bindedPersona && chat.bindedPersona === active.id}></i>
            </button>
        {/if}
        <div class="stage-btns">
            <button class="stage-btn danger" onclick={remove}><Trash2Icon size={18} />{language.stage.deletePersona}</button>
        </div>
    {/if}
</StagePage>

<style>
    .stage-persona-head {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 14px;
    }
    .stage-persona-pic {
        width: 72px;
        height: 72px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        overflow: hidden;
        background: var(--stage-surface);
        color: var(--stage-muted);
    }
    .stage-persona-bind {
        border-radius: 14px;
        background: var(--stage-surface);
    }
</style>
