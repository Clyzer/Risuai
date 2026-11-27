<script lang="ts">
    // "Saving… / Saved" pill for edits Stage makes (module links, Stories or Chats, indicators).
    import { CheckIcon, LoaderCircleIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { requiresFullEncoderReload, saving } from 'src/ts/globalApi.svelte'
    import { stageSaveStatus } from './stageSave.svelte'

    // Done once the loop has re-read the database for this edit and finished writing it.
    $effect(() => {
        if (stageSaveStatus.phase === 'saving' && !requiresFullEncoderReload.state && !saving.state) {
            stageSaveStatus.phase = 'saved'
        }
    })

    $effect(() => {
        if (stageSaveStatus.phase !== 'saved') return
        const timer = setTimeout(() => {
            if (stageSaveStatus.phase === 'saved') stageSaveStatus.phase = 'idle'
        }, 1800)
        return () => clearTimeout(timer)
    })
</script>

{#if stageSaveStatus.phase !== 'idle'}
    <div class="stage-save" class:done={stageSaveStatus.phase === 'saved'} role="status" aria-live="polite">
        {#if stageSaveStatus.phase === 'saving'}
            <LoaderCircleIcon size={16} class="stage-save-spin" />
            <span>{language.stage.savingChanges}</span>
        {:else}
            <CheckIcon size={16} />
            <span>{language.stage.changesSaved}</span>
        {/if}
    </div>
{/if}

<style>
    .stage-save {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + 10px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 95;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        background: color-mix(in oklab, var(--stage-bg) 88%, var(--risu-theme-textcolor));
        border: 1px solid var(--stage-line);
        box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
        font-size: 14px;
        font-weight: 600;
        color: var(--risu-theme-textcolor);
        pointer-events: none;
    }
    .stage-save.done {
        color: #34c77b;
    }
    .stage-save :global(.stage-save-spin) {
        animation: stage-save-spin 0.9s linear infinite;
    }
    @keyframes stage-save-spin {
        to {
            transform: rotate(360deg);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .stage-save :global(.stage-save-spin) {
            animation: none;
        }
    }
</style>
