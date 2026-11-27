<script lang="ts">
    // A You page made of Risu's data-driven settings: optional tabs (one per group) and optional
    // search across every option, accordions included.
    import { SearchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import type { SettingItem } from 'src/ts/setting/types'
    import { checkCondition, getLabel } from 'src/ts/setting/utils'
    import { DBState } from 'src/ts/stores.svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import StagePage from './StagePage.svelte'
    import StageSettings from './StageSettings.svelte'

    interface Props {
        title: string
        sections: { title: string; items: SettingItem[] }[]
        searchable?: boolean
        close: () => void
    }

    let { title, sections, searchable = false, close }: Props = $props()

    let tab = $state(0)
    let query = $state('')

    function flatten(items: SettingItem[]): SettingItem[] {
        return items.flatMap((i) => (i.type === 'accordion' ? flatten(i.options?.children ?? []) : [i]))
    }

    let results = $derived.by(() => {
        const q = query.trim().toLocaleLowerCase()
        if (!q) return null
        // Only options that are showing count (some appear with "show unrecommended" and the like).
        const ctx = { db: DBState.db, modelInfo: getModelInfo(DBState.db.aiModel), subModelInfo: getModelInfo(DBState.db.subModel) }
        return flatten(sections.flatMap((s) => s.items)).filter(
            (i) => i.type !== 'header' && checkCondition(i, ctx) && `${getLabel(i)} ${(i.keywords ?? []).join(' ')}`.toLocaleLowerCase().includes(q)
        )
    })
</script>

<StagePage {title} {close}>
    {#if searchable}
        <label class="stage-search">
            <SearchIcon size={18} />
            <input type="search" bind:value={query} placeholder={language.stage.searchSettings} autocomplete="off" />
        </label>
    {/if}
    {#if results}
        {#if results.length === 0}
            <p class="stage-lead">{language.stage.noSettingMatch}</p>
        {:else}
            <StageSettings items={results} />
        {/if}
    {:else}
        {#if sections.length > 1}
            <div class="ssp-tabs" role="tablist">
                {#each sections as s, i}
                    <button role="tab" aria-selected={tab === i} class:on={tab === i} onclick={() => (tab = i)}>{s.title}</button>
                {/each}
            </div>
        {/if}
        <StageSettings items={sections[tab]?.items ?? []} />
    {/if}
</StagePage>

<style>
    .ssp-tabs {
        display: flex;
        gap: 4px;
        padding: 3px;
        margin-bottom: 14px;
        border-radius: 999px;
        background: var(--stage-surface);
    }
    .ssp-tabs button {
        flex: 1;
        min-height: 38px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .ssp-tabs button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
</style>
