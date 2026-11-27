<script lang="ts">
    // Installed modules: turn one on for everything (db.enabledModules), see which stories link it,
    // import (unfiltered picker, Risu's readModule) and delete (same steps as Risu's module page).
    // Editing a module's content (its lorebook, regex, triggers) stays in Risu's module editor.
    import { BlocksIcon, PencilIcon, Trash2Icon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, SettingsMenuIndex, settingsOpen } from 'src/ts/stores.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import StagePage from './StagePage.svelte'
    import { importModuleFile } from './stageActions'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let modules = $derived([...(DBState.db.modules ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))

    function usedBy(id: string) {
        return DBState.db.characters.filter((c) => ((c as { modules?: string[] }).modules ?? []).includes(id)).length
    }

    function toggleGlobal(id: string) {
        const list = DBState.db.enabledModules ?? []
        DBState.db.enabledModules = list.includes(id) ? list.filter((m) => m !== id) : [...list, id]
    }

    async function remove(id: string, name: string) {
        if (!(await alertConfirm(language.stage.deleteModuleConfirm.replace('{}', name)))) return
        DBState.db.enabledModules = (DBState.db.enabledModules ?? []).filter((m) => m !== id)
        DBState.db.modules = DBState.db.modules.filter((m) => m.id !== id)
    }

    function editInRisu() {
        SettingsMenuIndex.set(14)
        settingsOpen.set(true)
    }
</script>

<StagePage title={language.modules} {close}>
    {#snippet actions()}
        <button class="stage-pill-btn" aria-label={language.stage.importModule} title={language.stage.importModule} onclick={importModuleFile}><UploadIcon size={21} /></button>
    {/snippet}

    <p class="stage-lead">{language.stage.modulesManageIntro}</p>
    {#if modules.length === 0}
        <p class="stage-lead">{language.stage.noModules}</p>
    {:else}
        <div class="stage-list">
            {#each modules as m (m.id)}
                {@const global = (DBState.db.enabledModules ?? []).includes(m.id)}
                {@const stories = usedBy(m.id)}
                <div class="smm">
                    <div class="stage-row">
                        <span class="stage-row-ic"><BlocksIcon size={18} /></span>
                        <span class="stage-row-text">
                            <b>{m.name || m.id}</b>
                            <small>
                                {#if m.assets?.length}{m.assets.length} {language.stage.images}{/if}{#if m.assets?.length && m.lorebook?.length} · {/if}{#if m.lorebook?.length}{m.lorebook.length} {language.stage.loreEntries}{/if}{#if stories} · {language.stage.linkedStories.replace('{}', String(stories))}{/if}
                            </small>
                        </span>
                        <button class="stage-pill-btn" aria-label={language.stage.deleteModule} onclick={() => remove(m.id, m.name)}><Trash2Icon size={18} /></button>
                    </div>
                    <button class="smm-opt" role="switch" aria-checked={global} onclick={() => toggleGlobal(m.id)}>
                        <span>{language.stage.moduleOnForAll}</span>
                        <i class="stage-switch" class:on={global}></i>
                    </button>
                </div>
            {/each}
        </div>
    {/if}
    <div class="stage-btns">
        <button class="stage-btn" onclick={importModuleFile}><UploadIcon size={18} />{language.stage.importModule}</button>
        <button class="stage-btn" onclick={editInRisu}><PencilIcon size={18} />{language.stage.editModulesInRisu}</button>
    </div>
</StagePage>

<style>
    .smm + .smm {
        border-top: 1px solid var(--stage-line);
    }
    .smm-opt {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 48px;
        padding: 0 14px 0 62px;
        font-size: 14px;
        color: inherit;
    }
</style>
