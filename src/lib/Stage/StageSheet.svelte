<script lang="ts">
    // Bottom sheet: dialogs and action lists. Tapping outside or going back closes it (unless the
    // sheet is waiting on something that must not be dismissed).
    import type { Snippet } from 'svelte'
    import { backLayer } from './stageBack'

    interface Props {
        title?: string
        /** Text under the title. */
        subtitle?: string
        close?: () => void
        /** false: tapping outside and back do nothing (progress, required answers). */
        dismissible?: boolean
        children: Snippet
        level?: number
    }

    let { title, subtitle, close, dismissible = true, children, level = 0 }: Props = $props()

    $effect(() => backLayer(() => dismissible && close?.()))
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="stage-sheet-scrim" style:z-index={90 + level} onclick={() => dismissible && close?.()}></div>
<div class="stage-sheet" role="dialog" aria-modal="true" aria-label={title} style:z-index={91 + level}>
    <div class="stage-sheet-grip" aria-hidden="true"></div>
    {#if title}<h2>{title}</h2>{/if}
    {#if subtitle}<p class="stage-sheet-sub">{subtitle}</p>{/if}
    <div class="stage-sheet-body">
        {@render children()}
    </div>
</div>

<style>
    .stage-sheet-scrim {
        position: fixed;
        inset: 0;
        background: rgb(0 0 0 / 0.5);
        animation: stage-sheet-fade 0.2s ease-out;
    }
    .stage-sheet {
        position: fixed;
        left: 50%;
        bottom: 0;
        width: 100%;
        max-width: 640px;
        max-height: min(86vh, 86dvh);
        display: flex;
        flex-direction: column;
        translate: -50% 0;
        padding: 8px 18px calc(16px + env(safe-area-inset-bottom, 0px));
        border-radius: 22px 22px 0 0;
        background: var(--stage-raised, var(--risu-theme-darkbg));
        color: var(--risu-theme-textcolor);
        box-shadow: 0 -10px 40px rgb(0 0 0 / 0.4);
        animation: stage-sheet-up 0.25s ease-out;
    }
    .stage-sheet-grip {
        flex: none;
        width: 40px;
        height: 4px;
        margin: 0 auto 10px;
        border-radius: 2px;
        background: color-mix(in oklab, var(--risu-theme-textcolor) 25%, transparent);
    }
    h2 {
        flex: none;
        margin: 4px 0 6px;
        font-size: 18px;
        font-weight: 800;
    }
    .stage-sheet-sub {
        flex: none;
        margin: 0 0 10px;
        font-size: 14px;
        line-height: 1.5;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 75%, transparent);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    .stage-sheet-body {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
    }
    @keyframes stage-sheet-up {
        from {
            translate: -50% 40px;
            opacity: 0;
        }
    }
    @keyframes stage-sheet-fade {
        from {
            opacity: 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .stage-sheet,
        .stage-sheet-scrim {
            animation: none;
        }
    }
</style>
