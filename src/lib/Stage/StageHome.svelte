<script lang="ts">
    import { AlertTriangleIcon, MessageSquareIcon, PlayIcon, PlusIcon, GitBranchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import { addCharacter, changeChar } from 'src/ts/characters'
    import { storyRequirements } from './stageRequirements'
    import { continueStory } from './stageActions'
    import StageCover from './StageCover.svelte'
    import { stageNav } from './stageNav.svelte'
    import { listCharacters, listPlaythroughs, timeAgo, type StagePlaythroughEntry } from './stageData'

    let characters = $derived(listCharacters(DBState.db.characters))
    let playthroughs = $derived(stageNav.homeView === 'playthroughs' ? listPlaythroughs(DBState.db.characters) : [])
    let latest = $derived([...characters].filter((c) => c.lastPlayed > 0).sort((a, b) => b.lastPlayed - a.lastPlayed)[0])
    // Which stories have something to check (a module that looks missing, a link to a deleted module).
    let attention = $derived(
        new Set(
            characters
                .filter((c) => storyRequirements(DBState.db.characters[c.index], DBState.db.modules ?? [], DBState.db.enabledModules ?? []).needsAttention)
                .map((c) => c.index)
        )
    )

    function openStory(index: number) {
        stageNav.detail = index
    }

    function continueLatest(index: number) {
        if (attention.has(index)) openStory(index)
        else continueStory(index)
    }

    function openPlaythrough(p: StagePlaythroughEntry) {
        DBState.db.characters[p.charIndex].chatPage = p.chatIndex
        changeChar(p.charIndex)
    }
</script>

<div class="stage-scroll">
    <header class="stage-head">
        <div class="stage-toptabs" role="tablist">
            <button role="tab" aria-selected={stageNav.homeView === 'stories'} class:on={stageNav.homeView === 'stories'} onclick={() => (stageNav.homeView = 'stories')}>
                {language.stage.stories}
            </button>
            <button role="tab" aria-selected={stageNav.homeView === 'playthroughs'} class:on={stageNav.homeView === 'playthroughs'} onclick={() => (stageNav.homeView = 'playthroughs')}>
                {language.stage.playthroughs}
            </button>
        </div>
        <button class="stage-icon-btn" aria-label={language.stage.add} onclick={() => addCharacter()}>
            <PlusIcon size={24} />
        </button>
    </header>

    {#if stageNav.homeView === 'stories'}
        {#if characters.length === 0}
            <div class="stage-empty">
                <b>{language.stage.emptyHomeTitle}</b>
                <span>{language.stage.emptyHomeBody}</span>
            </div>
        {:else}
            {#if latest}
                <button class="stage-continue" onclick={() => continueLatest(latest.index)}>
                    <StageCover image={latest.image} />
                    <span class="stage-continue-shade"></span>
                    <span class="stage-continue-text">
                        <small>{language.stage.lastPlayed}</small>
                        <strong>{latest.name}</strong>
                        <span>{timeAgo(latest.lastPlayed)}</span>
                    </span>
                    <span class="stage-play"><PlayIcon size={22} fill="currentColor" /></span>
                </button>
            {/if}
            <div class="stage-grid">
                {#each characters as c (c.index)}
                    <button class="stage-card" onclick={() => openStory(c.index)}>
                        <span class="stage-card-cover">
                            <StageCover image={c.image} alt="" />
                            {#if attention.has(c.index)}
                                <span class="stage-card-flag" title={language.stage.attention}><AlertTriangleIcon size={16} /></span>
                            {/if}
                        </span>
                        <span class="stage-card-title">{c.name}</span>
                        <span class="stage-card-meta">
                            {#if c.chatCount === 0}
                                {language.stage.neverPlayed}
                            {:else}
                                <MessageSquareIcon size={13} />
                                {c.chatCount === 1 ? language.stage.playthroughCountOne : language.stage.playthroughCount.replace('{}', String(c.chatCount))}
                                {#if c.lastPlayed}· {timeAgo(c.lastPlayed)}{/if}
                            {/if}
                        </span>
                    </button>
                {/each}
            </div>
        {/if}
    {:else}
        <div class="stage-list">
            {#each playthroughs as p (p.charIndex + ':' + p.chatIndex)}
                <button class="stage-play-row" onclick={() => openPlaythrough(p)}>
                    <span class="stage-play-thumb"><StageCover image={p.image} /></span>
                    <span class="stage-play-text">
                        <b>{p.charName}</b>
                        <span class="stage-play-chat">
                            {#if p.isBranch}<GitBranchIcon size={14} />{/if}
                            {p.chatName}
                        </span>
                        <span class="stage-play-meta">
                            {#if p.lastDate}<span>{timeAgo(p.lastDate)}</span>{/if}
                            {#if p.messageCount > 0}
                                <MessageSquareIcon size={13} />
                                {p.messageCount}
                            {/if}
                        </span>
                    </span>
                </button>
            {:else}
                <div class="stage-empty">
                    <b>{language.stage.emptyHomeTitle}</b>
                    <span>{language.stage.emptyHomeBody}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .stage-continue {
        position: relative;
        display: block;
        width: 100%;
        aspect-ratio: 16 / 10;
        border-radius: 18px;
        overflow: hidden;
        margin-bottom: 22px;
        text-align: left;
        background: var(--stage-surface);
    }
    .stage-continue :global(.stage-cover-img) {
        position: absolute;
        inset: 0;
    }
    .stage-continue-shade {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 35%, rgb(0 0 0 / 0.82));
    }
    .stage-continue-text {
        position: absolute;
        left: 16px;
        right: 76px;
        bottom: 14px;
        display: flex;
        flex-direction: column;
        color: #fff;
        min-width: 0;
    }
    .stage-continue-text small {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.85;
    }
    .stage-continue-text strong {
        font-size: 20px;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-continue-text span {
        font-size: 13px;
        opacity: 0.8;
    }
    .stage-play {
        position: absolute;
        right: 16px;
        bottom: 14px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #fff;
        color: #111;
    }
    .stage-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 20px 10px;
    }
    .stage-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        text-align: left;
    }
    .stage-card-flag {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: rgb(20 16 8 / 0.7);
        color: #ffcf85;
    }
    .stage-card-cover {
        position: relative;
        display: block;
        aspect-ratio: 3 / 4;
        border-radius: 12px;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-card-title {
        margin-top: 8px;
        font-size: 16px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-card-meta,
    .stage-play-meta {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 2px;
        font-size: 13px;
        color: var(--stage-muted);
        white-space: nowrap;
        overflow: hidden;
    }
    .stage-list {
        display: flex;
        flex-direction: column;
    }
    .stage-play-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 0;
        text-align: left;
        width: 100%;
    }
    .stage-play-thumb {
        flex: none;
        width: 72px;
        height: 96px;
        border-radius: 9px;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-play-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }
    .stage-play-text b {
        font-size: 18px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-play-chat {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 15px;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 75%, transparent);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
