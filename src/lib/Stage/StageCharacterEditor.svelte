<script lang="ts">
    // Risu's own character editor (CharConfig) over the play screen. On phones Risu hides the
    // editor's section tabs and shows them in MobileFooter, which needs MobileSideBar = 2.
    import { onDestroy, onMount } from 'svelte'
    import { ArrowLeftIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { MobileGUI, MobileSideBar } from 'src/ts/stores.svelte'
    import CharConfig from '../SideBars/CharConfig.svelte'
    import MobileFooter from '../Mobile/MobileFooter.svelte'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    onMount(() => MobileSideBar.set(2))
    onDestroy(() => MobileSideBar.set(0))
</script>

<div class="stage-editor">
    <header class="stage-editor-top">
        <button class="stage-editor-back" aria-label={language.stage.back} onclick={close}>
            <ArrowLeftIcon size={22} />
        </button>
        <b>{language.stage.editCharacter}</b>
    </header>
    <div class="stage-editor-body">
        <CharConfig />
    </div>
    {#if $MobileGUI}
        <MobileFooter />
    {/if}
</div>

<style>
    .stage-editor {
        position: absolute;
        inset: 0;
        z-index: 70;
        display: flex;
        flex-direction: column;
        background: var(--stage-bg);
    }
    .stage-editor-top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 56px;
        padding: env(safe-area-inset-top, 0px) 12px 0 4px;
        border-bottom: 1px solid var(--stage-line);
    }
    .stage-editor-top b {
        font-size: 17px;
    }
    .stage-editor-back {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 50%;
    }
    .stage-editor-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 12px;
    }
</style>
