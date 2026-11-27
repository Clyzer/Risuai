<script lang="ts">
    // Full-screen Stage page (a sub page of the play menu, of You, of Realm...). Header with back,
    // a scrolling body that keeps clear of the system bars, and the back gesture closes it.
    import { ArrowLeftIcon } from '@lucide/svelte'
    import type { Snippet } from 'svelte'
    import { language } from 'src/lang'
    import { backLayer } from './stageBack'

    interface Props {
        title: string
        close: () => void
        /** Buttons at the right of the header. */
        actions?: Snippet
        /** Fixed area under the body (a save bar). */
        footer?: Snippet
        children: Snippet
        /** Stack above another page. */
        level?: number
    }

    let { title, close, actions, footer, children, level = 0 }: Props = $props()

    $effect(() => backLayer(() => close()))
</script>

<div class="stage-page-sheet" style:z-index={70 + level}>
    <header class="stage-page-top">
        <button class="stage-page-back" aria-label={language.stage.back} onclick={close}><ArrowLeftIcon size={22} /></button>
        <b>{title}</b>
        {#if actions}<div class="stage-page-actions">{@render actions()}</div>{/if}
    </header>
    <div class="stage-page-body">
        {@render children()}
    </div>
    {#if footer}
        <div class="stage-page-foot">{@render footer()}</div>
    {/if}
</div>

<style>
    .stage-page-sheet {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        background: var(--stage-bg);
        color: var(--risu-theme-textcolor);
    }
    .stage-page-top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 56px;
        padding: env(safe-area-inset-top, 0px) 8px 0 4px;
        border-bottom: 1px solid var(--stage-line);
    }
    .stage-page-top b {
        flex: 1;
        min-width: 0;
        font-size: 17px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .stage-page-back {
        flex: none;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 50%;
    }
    .stage-page-actions {
        flex: none;
        display: flex;
        align-items: center;
        gap: 2px;
    }
    .stage-page-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 14px 16px calc(28px + env(safe-area-inset-bottom, 0px));
    }
    .stage-page-foot {
        flex: none;
        padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid var(--stage-line);
        background: var(--stage-bg);
    }
</style>
