<script lang="ts">
    // Modules of the open playthrough, with the same three levels Risu uses (getModules()):
    // on for everything (db.enabledModules, set in You → Modules), this playthrough (chat.modules),
    // and always with this story (char.modules).
    import { BlocksIcon, GlobeIcon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, ReloadGUIPointer, selectedCharID } from 'src/ts/stores.svelte'
    import StagePage from './StagePage.svelte'
    import { importModuleForStory } from './stageActions'
    import { persistCharacterEdit } from './stageSave.svelte'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let charIndex = $derived($selectedCharID)
    let char = $derived(DBState.db.characters[charIndex])
    let chat = $derived(char?.chats?.[char.chatPage])
    let modules = $derived([...(DBState.db.modules ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))

    function toggleChat(id: string) {
        if (!chat) return
        chat.modules ??= []
        chat.modules = chat.modules.includes(id) ? chat.modules.filter((m) => m !== id) : [...chat.modules, id]
        ReloadGUIPointer.set(Math.random())
    }

    function toggleStory(id: string) {
        if (!char) return
        const list = char.modules ?? []
        char.modules = list.includes(id) ? list.filter((m) => m !== id) : [...list, id]
        persistCharacterEdit(char)
        ReloadGUIPointer.set(Math.random())
    }
</script>

<StagePage title={language.modules} {close}>
    <p class="stage-lead">{language.stage.modulesIntro}</p>
    {#if modules.length === 0}
        <p class="stage-lead">{language.stage.noModules}</p>
    {:else}
        <div class="stage-list">
            {#each modules as m (m.id)}
                {@const global = (DBState.db.enabledModules ?? []).includes(m.id)}
                <div class="stage-mod">
                    <div class="stage-row">
                        <span class="stage-row-ic">{#if global}<GlobeIcon size={18} />{:else}<BlocksIcon size={18} />{/if}</span>
                        <span class="stage-row-text">
                            <b>{m.name || m.id}</b>
                            {#if m.description}<small>{m.description}</small>{/if}
                        </span>
                    </div>
                    {#if global}
                        <p class="stage-mod-global">{language.stage.moduleGlobal}</p>
                    {:else}
                        <button class="stage-mod-opt" role="switch" aria-checked={chat?.modules?.includes(m.id) ?? false} onclick={() => toggleChat(m.id)}>
                            <span>{language.stage.moduleThisPlaythrough}</span>
                            <i class="stage-switch" class:on={chat?.modules?.includes(m.id)}></i>
                        </button>
                        <button class="stage-mod-opt" role="switch" aria-checked={char?.modules?.includes(m.id) ?? false} onclick={() => toggleStory(m.id)}>
                            <span>{language.stage.moduleAlwaysStory}</span>
                            <i class="stage-switch" class:on={char?.modules?.includes(m.id)}></i>
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
    {#if char}
        <div class="stage-btns">
            <button class="stage-btn" onclick={() => importModuleForStory(charIndex)}><UploadIcon size={18} />{language.stage.importModule}</button>
        </div>
    {/if}
</StagePage>

<style>
    .stage-mod + .stage-mod {
        border-top: 1px solid var(--stage-line);
    }
    .stage-mod-opt {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 48px;
        padding: 0 14px 0 62px;
        font-size: 14px;
        color: inherit;
    }
    .stage-mod-global {
        margin: 0;
        padding: 0 14px 12px 62px;
        font-size: 13px;
        color: var(--stage-muted);
    }
</style>
