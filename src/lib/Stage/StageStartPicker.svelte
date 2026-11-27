<script lang="ts">
    import { ArrowLeftIcon, ChevronRightIcon, InfoIcon, SearchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import { stageNav } from './stageNav.svelte'
    import { listStarts } from './stageStarts'
    import { startNewPlaythrough } from './stageActions'

    interface Props {
        index: number
    }

    let { index }: Props = $props()

    let query = $state('')
    let category = $state('')

    let starts = $derived(
        DBState.db.characters[index]
            ? listStarts(DBState.db.characters[index], language.stage.mainStart, (n) => language.stage.numberedStart.replace('{}', String(n)))
            : []
    )
    let categories = $derived([...new Set(starts.map((s) => s.category).filter(Boolean))])
    let shown = $derived(
        starts.filter((s) => {
            if (category && s.category !== category) return false
            const q = query.trim().toLocaleLowerCase()
            return !q || (s.title + ' ' + s.preview).toLocaleLowerCase().includes(q)
        })
    )

    function pick(fmIndex: number) {
        // Read the prop before closing: it is bound to stageNav.startPicker and turns null with it.
        const charIndex = index
        stageNav.startPicker = null
        startNewPlaythrough(charIndex, fmIndex)
    }
</script>

<div class="stage-picker">
    <header class="stage-picker-top">
        <button class="stage-icon-btn" aria-label={language.stage.back} onclick={() => (stageNav.startPicker = null)}>
            <ArrowLeftIcon size={22} />
        </button>
        <b>{language.stage.chooseStart}</b>
    </header>
    <div class="stage-picker-body">
        <label class="stage-search">
            <SearchIcon size={18} />
            <input type="search" bind:value={query} placeholder={language.stage.searchStarts.replace('{}', String(starts.length))} autocomplete="off" />
        </label>
        {#if categories.length > 0}
            <div class="stage-chips">
                <button class:on={category === ''} onclick={() => (category = '')}>{language.stage.all}</button>
                {#each categories as c}
                    <button class:on={category === c} onclick={() => (category = c)}>{c}</button>
                {/each}
            </div>
        {/if}
        {#each shown as s (s.fmIndex)}
            <button class="stage-start" onclick={() => pick(s.fmIndex)}>
                <span class="stage-start-text">
                    {#if s.category}<small>{s.category}</small>{/if}
                    <b>{s.title}</b>
                    {#if s.preview}<span>{s.preview}</span>{/if}
                </span>
                <ChevronRightIcon size={18} />
            </button>
        {:else}
            <p class="stage-picker-empty">{language.stage.noStartMatch}</p>
        {/each}
        <p class="stage-picker-note"><InfoIcon size={14} /><span>{language.stage.startsNote}</span></p>
    </div>
</div>

<style>
    .stage-picker {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--stage-bg);
    }
    .stage-picker-top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 58px;
        padding: env(safe-area-inset-top, 0px) 12px 0 4px;
        border-bottom: 1px solid var(--stage-line);
    }
    .stage-picker-top b {
        font-size: 18px;
    }
    .stage-picker-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 14px 16px 28px;
    }
    .stage-search {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 48px;
        padding: 0 14px;
        border-radius: 12px;
        background: var(--stage-surface);
        color: var(--stage-muted);
    }
    .stage-search input {
        flex: 1;
        min-width: 0;
        background: none;
        border: 0;
        outline: none;
        font-size: 16px;
        color: var(--risu-theme-textcolor);
    }
    .stage-chips {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        margin: 12px -16px 0;
        padding: 0 16px 4px;
        scrollbar-width: none;
    }
    .stage-chips button {
        flex: none;
        height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 600;
        background: var(--stage-surface);
        color: var(--stage-muted);
    }
    .stage-chips button.on {
        background: var(--stage-raised);
        color: var(--risu-theme-textcolor);
    }
    .stage-start {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 14px 0;
        border-bottom: 1px solid var(--stage-line);
        text-align: left;
        color: var(--stage-muted);
    }
    .stage-start-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .stage-start-text small {
        font-size: 12px;
        font-weight: 700;
        color: var(--stage-accent);
    }
    .stage-start-text b {
        font-size: 17px;
        color: var(--risu-theme-textcolor);
    }
    .stage-start-text span {
        font-size: 14px;
        line-height: 1.45;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .stage-picker-empty {
        padding: 24px 0;
        text-align: center;
        color: var(--stage-muted);
    }
    .stage-picker-note {
        display: flex;
        gap: 8px;
        margin: 14px 0 0;
        font-size: 12px;
        line-height: 1.45;
        color: var(--stage-muted);
    }
    .stage-picker-note :global(svg) {
        flex: none;
        margin-top: 2px;
    }
</style>
