<script lang="ts">
    // Pills under the play screen's top bar, one per indicator of the story.
    import type { Chat, character, groupChat } from 'src/ts/storage/database.svelte'
    import { barRatio, readIndicator, type StageIndicator } from './stageIndicators'

    interface Props {
        indicators: StageIndicator[]
        char: character | groupChat
        chat: Chat | undefined
        hidden?: boolean
    }

    let { indicators, char, chat, hidden = false }: Props = $props()
</script>

<div class="stage-hud" class:hidden>
    {#each indicators as ind (ind.id)}
        {@const value = readIndicator(ind, char, chat)}
        {@const ratio = ind.display === 'bar' ? barRatio(value, ind.max) : null}
        <div class="stage-pill" title={ind.label}>
            <b>{ind.label}</b>
            {#if ratio !== null}
                <span class="stage-pill-bar"><i style:width="{ratio * 100}%"></i></span>
                <span class="stage-pill-num">{value}{ind.max && ind.max !== 100 ? `/${ind.max}` : ''}</span>
            {:else}
                <span class="stage-pill-text">{value || '—'}</span>
            {/if}
        </div>
    {/each}
</div>

<style>
    .stage-hud {
        position: absolute;
        top: calc(56px + env(safe-area-inset-top, 0px));
        left: 0;
        right: 0;
        z-index: 39;
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 2px 12px 8px;
        scrollbar-width: none;
        transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .stage-hud::-webkit-scrollbar {
        display: none;
    }
    .stage-hud.hidden {
        transform: translateY(-160%);
        opacity: 0;
        pointer-events: none;
    }
    .stage-pill {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 34px;
        max-width: 70vw;
        padding: 0 12px;
        border-radius: 999px;
        background: color-mix(in oklab, var(--stage-bg) 82%, transparent);
        border: 1px solid var(--stage-line);
        font-size: 13px;
        white-space: nowrap;
    }
    .stage-pill b {
        font-weight: 700;
    }
    .stage-pill-bar {
        width: 56px;
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        background: color-mix(in oklab, var(--risu-theme-textcolor) 15%, transparent);
    }
    .stage-pill-bar i {
        display: block;
        height: 100%;
        border-radius: 3px;
        background: var(--stage-accent);
        transition: width 0.5s ease;
    }
    .stage-pill-num {
        font-variant-numeric: tabular-nums;
        color: var(--stage-muted);
    }
    .stage-pill-text {
        overflow: hidden;
        text-overflow: ellipsis;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 85%, transparent);
    }
</style>
