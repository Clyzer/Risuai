<script lang="ts">
    // Model picker page: Risu's model list (getModelList) with search, recommended or all, and Risu's
    // one-off entries (OpenRouter, custom API...) gathered under "Other".
    import { CheckIcon, SearchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { getModelInfo, getModelList } from 'src/ts/model/modellist'
    import StagePage from './StagePage.svelte'

    interface Props {
        title: string
        value: string
        pick: (id: string) => void
        close: () => void
        level?: number
    }

    let { title, value, pick, close, level = 1 }: Props = $props()

    let query = $state('')
    let showAll = $state(false)
    let groups = $derived.by(() => {
        const q = query.trim().toLocaleLowerCase()
        const merged: { name: string; models: ReturnType<typeof getModelInfo>[] }[] = []
        for (const g of getModelList({ recommendedOnly: !showAll, groupedByProvider: true })) {
            const name = g.providerName === '@as-is' ? language.stage.otherModels : g.providerName
            const models = g.models.filter((m) => !q || `${m.fullName ?? m.name} ${m.id}`.toLocaleLowerCase().includes(q))
            const existing = merged.find((x) => x.name === name)
            if (existing) existing.models.push(...models)
            else merged.push({ name, models: [...models] })
        }
        return merged.filter((g) => g.models.length > 0)
    })
</script>

<StagePage {title} {close} {level}>
    <label class="stage-search">
        <SearchIcon size={18} />
        <input type="search" bind:value={query} placeholder={language.stage.searchModels} autocomplete="off" />
    </label>
    <button class="stage-row smp-all" role="switch" aria-checked={showAll} onclick={() => (showAll = !showAll)}>
        <span class="stage-row-text"><b>{language.stage.showAllModels}</b></span>
        <i class="stage-switch" class:on={showAll}></i>
    </button>
    {#each groups as g (g.name)}
        <div class="stage-section">{g.name}</div>
        <div class="stage-list">
            {#each g.models as m (m.id)}
                <button class="stage-row" class:on={m.id === value} onclick={() => pick(m.id)}>
                    <span class="stage-row-text"><b>{m.fullName ?? m.name}</b></span>
                    {#if m.id === value}<span class="stage-row-end"><CheckIcon size={18} /></span>{/if}
                </button>
            {/each}
        </div>
    {/each}
</StagePage>

<style>
    .smp-all {
        border-radius: 14px;
        background: var(--stage-surface);
    }
</style>
