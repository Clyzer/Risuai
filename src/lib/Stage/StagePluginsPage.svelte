<script lang="ts">
    // Plugins: turn on or off, import, delete (same steps as Risu's plugin page: loadPlugins after
    // each change). A plugin's own arguments are set in Risu's plugin page.
    import { PuzzleIcon, SlidersHorizontalIcon, Trash2Icon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, SettingsMenuIndex, settingsOpen } from 'src/ts/stores.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import { importPlugin, loadPlugins } from 'src/ts/plugins/plugins.svelte'
    import StagePage from './StagePage.svelte'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    function toggle(i: number) {
        const plugin = DBState.db.plugins[i]
        plugin.enabled = !plugin.enabled
        DBState.db.plugins[i] = plugin
        loadPlugins()
    }

    async function remove(i: number) {
        const plugin = DBState.db.plugins[i]
        if (!(await alertConfirm(language.stage.deletePluginConfirm.replace('{}', plugin.displayName ?? plugin.name)))) return
        if (DBState.db.currentPluginProvider === plugin.name) DBState.db.currentPluginProvider = ''
        const plugins = DBState.db.plugins ?? []
        plugins.splice(i, 1)
        DBState.db.plugins = plugins
        loadPlugins()
    }

    function options() {
        SettingsMenuIndex.set(4)
        settingsOpen.set(true)
    }
</script>

<StagePage title={language.plugin} {close}>
    {#snippet actions()}
        <button class="stage-pill-btn" aria-label={language.stage.importPlugin} title={language.stage.importPlugin} onclick={() => importPlugin()}><UploadIcon size={21} /></button>
    {/snippet}

    <p class="stage-lead">{language.stage.pluginsIntro}</p>
    {#if !DBState.db.plugins?.length}
        <p class="stage-lead">{language.stage.noPlugins}</p>
    {:else}
        <div class="stage-list">
            {#each DBState.db.plugins as plugin, i (plugin.name)}
                <div class="stage-row">
                    <span class="stage-row-ic"><PuzzleIcon size={18} /></span>
                    <span class="stage-row-text"><b>{plugin.displayName ?? plugin.name}</b>{#if plugin.versionOfPlugin}<small>v{plugin.versionOfPlugin}</small>{/if}</span>
                    <button class="stage-pill-btn" aria-label={language.stage.deletePlugin} onclick={() => remove(i)}><Trash2Icon size={18} /></button>
                    <button role="switch" aria-checked={!!plugin.enabled} aria-label={plugin.displayName ?? plugin.name} onclick={() => toggle(i)}><i class="stage-switch" class:on={!!plugin.enabled}></i></button>
                </div>
            {/each}
        </div>
    {/if}
    <div class="stage-btns">
        <button class="stage-btn" onclick={() => importPlugin()}><UploadIcon size={18} />{language.stage.importPlugin}</button>
        <button class="stage-btn" onclick={options}><SlidersHorizontalIcon size={18} />{language.stage.pluginOptions}</button>
    </div>
</StagePage>
