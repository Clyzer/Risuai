<script lang="ts">
    // Stage theme shell: a phone-first launcher around Risu. It only reads the database and calls
    // the functions Risu already exposes; chat processing and storage are untouched.
    import { DBState, OpenRealmStore, selectedCharID } from 'src/ts/stores.svelte'
    import MobileHeader from '../Mobile/MobileHeader.svelte'
    import MobileBody from '../Mobile/MobileBody.svelte'
    import MobileFooter from '../Mobile/MobileFooter.svelte'
    import RealmMain from '../UI/Realm/RealmMain.svelte'
    import StageTabBar from './StageTabBar.svelte'
    import StageHome from './StageHome.svelte'
    import StageChats from './StageChats.svelte'
    import StageYou from './StageYou.svelte'
    import StageStoryDetail from './StageStoryDetail.svelte'
    import StageStartPicker from './StageStartPicker.svelte'
    import { stageNav } from './stageNav.svelte'
    import { language } from 'src/lang'

    // Over plain HTTP on a LAN address the browser hides crypto.subtle. Ordinary imports survive it
    // (saveAsset falls back to a uuid), but with account sync on, a .charx import first hashes the
    // whole file (CharXSkippableChecker) and stops there without any message. Warn only in that case.
    const noSubtle = typeof window !== 'undefined' && !window.crypto?.subtle
    let charxImportBlocked = $derived(noSubtle && !!DBState.db.account?.useSync)
    const dismissKey = 'risu-stage-insecure-dismissed:' + (typeof location !== 'undefined' ? location.origin : '')
    let insecureDismissed = $state(readDismissed())

    function readDismissed() {
        try {
            return localStorage.getItem(dismissKey) === '1'
        } catch {
            return false
        }
    }
    function dismissInsecure() {
        insecureDismissed = true
        try {
            localStorage.setItem(dismissKey, '1')
        } catch {}
    }

    // A story page whose character was deleted closes itself.
    $effect(() => {
        if (stageNav.detail !== null && !DBState.db.characters[stageNav.detail]) {
            stageNav.detail = null
        }
    })

    // "Import from Realm" in Risu's add-character dialog asks the app to show Realm.
    $effect(() => {
        if ($OpenRealmStore) {
            stageNav.tab = 'realm'
            OpenRealmStore.set(false)
        }
    })
</script>

<div class="stage-root">
    {#if $selectedCharID >= 0}
        <!-- Phase 1: the chat keeps Risu's mobile screen until the Stage play screen lands (phase 4). -->
        <div class="stage-legacy-chat">
            <MobileHeader />
            <MobileBody />
            <MobileFooter />
        </div>
    {:else if stageNav.startPicker !== null && DBState.db.characters[stageNav.startPicker]}
        <div class="stage-shell">
            <StageStartPicker index={stageNav.startPicker} />
        </div>
    {:else if stageNav.detail !== null}
        <div class="stage-shell">
            <StageStoryDetail index={stageNav.detail} />
        </div>
    {:else}
        <div class="stage-shell">
            {#if charxImportBlocked && !insecureDismissed}
                <div class="stage-insecure" role="alert">
                    <div>
                        <b>{language.stage.insecureTitle}</b>
                        <span>{language.stage.insecureBody}</span>
                    </div>
                    <button aria-label={language.close} onclick={dismissInsecure}>✕</button>
                </div>
            {/if}
            <div class="stage-page">
                {#if stageNav.tab === 'home'}
                    <StageHome />
                {:else if stageNav.tab === 'chats'}
                    <StageChats />
                {:else if stageNav.tab === 'realm'}
                    <div class="stage-realm"><RealmMain /></div>
                {:else}
                    <StageYou />
                {/if}
            </div>
            <StageTabBar />
        </div>
    {/if}
</div>

<style>
    /* Palette derived from the user's color scheme, so every Risu color preset still works. */
    .stage-root {
        --stage-bg: var(--risu-theme-darkbg);
        --stage-surface: color-mix(in oklab, var(--risu-theme-darkbg) 90%, var(--risu-theme-textcolor));
        --stage-raised: color-mix(in oklab, var(--risu-theme-darkbg) 82%, var(--risu-theme-textcolor));
        --stage-line: color-mix(in oklab, var(--risu-theme-textcolor) 9%, transparent);
        --stage-muted: var(--risu-theme-textcolor2);
        --stage-accent: #5b8cff;
        position: relative;
        width: 100%;
        height: 100%;
        min-width: 0;
        background: color-mix(in oklab, var(--risu-theme-darkbg) 80%, #000);
        color: var(--risu-theme-textcolor);
    }
    .stage-legacy-chat {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }
    /* Phone width everywhere; on a wide screen the app sits in a centered column. */
    .stage-shell {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 640px;
        height: 100%;
        margin: 0 auto;
        background: var(--stage-bg);
    }
    @media (min-width: 700px) {
        .stage-shell {
            border-left: 1px solid var(--stage-line);
            border-right: 1px solid var(--stage-line);
        }
    }
    .stage-insecure {
        flex: none;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin: calc(10px + env(safe-area-inset-top, 0px)) 12px 0;
        padding: 12px 14px;
        border-radius: 14px;
        background: color-mix(in oklab, #ffb84d 14%, var(--stage-bg));
        color: color-mix(in oklab, #ffcf85 85%, var(--risu-theme-textcolor));
        font-size: 13px;
        line-height: 1.45;
    }
    .stage-insecure div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }
    .stage-insecure b {
        font-size: 14px;
    }
    .stage-insecure button {
        flex: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
    }
    .stage-page {
        position: relative;
        flex: 1;
        min-height: 0;
    }
    .stage-realm {
        height: 100%;
        overflow-y: auto;
    }

    /* Shared building blocks for the Stage pages. */
    .stage-root :global(.stage-scroll) {
        height: 100%;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 0 16px 28px;
        padding-left: max(16px, env(safe-area-inset-left, 0px));
        padding-right: max(16px, env(safe-area-inset-right, 0px));
    }
    .stage-root :global(.stage-head) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 22px 0 14px;
        padding-top: calc(22px + env(safe-area-inset-top, 0px));
    }
    .stage-root :global(.stage-head h1) {
        margin: 0;
        font-size: 30px;
        font-weight: 800;
        letter-spacing: -0.025em;
    }
    .stage-root :global(.stage-toptabs) {
        display: flex;
        align-items: baseline;
        gap: 18px;
        min-width: 0;
    }
    .stage-root :global(.stage-toptabs button) {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 35%, transparent);
    }
    .stage-root :global(.stage-toptabs button.on) {
        color: var(--risu-theme-textcolor);
    }
    .stage-root :global(.stage-icon-btn) {
        flex: none;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 50%;
    }
    .stage-root :global(.stage-icon-btn:active) {
        background: var(--stage-surface);
    }
    .stage-root :global(.stage-empty) {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 40px 8px;
        text-align: center;
        color: var(--stage-muted);
        font-size: 15px;
        line-height: 1.5;
    }
    .stage-root :global(.stage-empty b) {
        color: var(--risu-theme-textcolor);
        font-size: 18px;
    }
    .stage-root :global(button:focus-visible) {
        outline: 2px solid var(--stage-accent);
        outline-offset: 2px;
    }
</style>
