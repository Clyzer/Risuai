<script lang="ts">
    // Stage theme shell: a phone-first launcher around Risu. It only reads the database and calls
    // the functions Risu already exposes; chat processing and storage are untouched.
    import { DBState, OpenRealmStore, selectedCharID } from 'src/ts/stores.svelte'
    import StagePlay from './StagePlay.svelte'
    import RealmMain from '../UI/Realm/RealmMain.svelte'
    import StageTabBar from './StageTabBar.svelte'
    import StageHome from './StageHome.svelte'
    import StageChats from './StageChats.svelte'
    import StageYou from './StageYou.svelte'
    import StageStoryDetail from './StageStoryDetail.svelte'
    import StageStartPicker from './StageStartPicker.svelte'
    import StageImportReview from './StageImportReview.svelte'
    import StageSaveNotice from './StageSaveNotice.svelte'
    import StagePullRefresh from './StagePullRefresh.svelte'
    import { onMount } from 'svelte'
    import { stageNav } from './stageNav.svelte'
    import { closeReview } from './stageActions'
    import { backLayer, startStageBack } from './stageBack'
    import { defaultColorScheme } from 'src/ts/gui/colorscheme'
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

    // A newly imported card (Stage "+", drag and drop, a Realm download) opens on its story page.
    // When Risu opens the chat itself (create from scratch, or "go to character on import" in
    // Accessibility) the chat shows first and the story page is waiting behind it.
    let knownCharacterCount = DBState.db.characters.length
    $effect(() => {
        const count = DBState.db.characters.length
        if (count > knownCharacterCount && $selectedCharID === -1) {
            stageNav.startPicker = null
            stageNav.detail = count - 1
        }
        knownCharacterCount = count
    })

    // A story page whose character was deleted closes itself.
    $effect(() => {
        if (stageNav.detail !== null && !DBState.db.characters[stageNav.detail]) {
            stageNav.detail = null
        }
    })

    // Edge to edge: the installed app draws under the status and navigation bars, and every Stage
    // screen pads itself with the system insets (Risu's own screens get them from the rule below).
    onMount(() => {
        const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
        if (viewport && !viewport.content.includes('viewport-fit')) {
            viewport.content = `${viewport.content}, viewport-fit=cover`
        }
        // The on-screen keyboard shrinks the page instead of covering it, so the input stays above it.
        if (viewport && !viewport.content.includes('interactive-widget')) {
            viewport.content = `${viewport.content}, interactive-widget=resizes-content`
        }
        document.documentElement.classList.add('risu-stage-edge')
    })

    // Back gesture: each open screen closes in turn; from another tab it returns to Home first.
    startStageBack()
    $effect(() => {
        if (stageNav.tab !== 'home') return backLayer(() => (stageNav.tab = 'home'))
    })
    $effect(() => {
        if (stageNav.detail !== null) return backLayer(() => (stageNav.detail = null))
    })
    $effect(() => {
        if (stageNav.startPicker !== null) return backLayer(() => (stageNav.startPicker = null))
    })
    $effect(() => {
        if (stageNav.importReview) return backLayer(closeReview)
    })

    // Installed app: Android paints the status bar with the page's theme-color, so it follows the
    // Stage background of the current color scheme. (The navigation bar takes the manifest's
    // theme_color, which cannot change at run time.)
    $effect(() => {
        const color = DBState.db.colorScheme?.darkbg || defaultColorScheme.darkbg
        let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        if (!meta) {
            meta = document.createElement('meta')
            meta.name = 'theme-color'
            document.head.appendChild(meta)
        }
        meta.content = color
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
        <StagePlay />
    {:else if stageNav.importReview}
        <div class="stage-shell">
            <StageImportReview />
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
    <StageSaveNotice />
    <StagePullRefresh />
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
        padding-top: env(safe-area-inset-top, 0px);
    }
    /* Risu's own screens shown while Stage is the theme (settings, first-run setup) keep clear of
       the system bars. Stage's screens pad themselves. */
    :global(html.risu-stage-edge main:not(:has(> .stage-root))) {
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
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

    /* ---- Shared parts of Stage's own pages and sheets ---- */
    .stage-root :global(.stage-section) {
        margin: 22px 0 8px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.02em;
        color: var(--stage-muted);
    }
    .stage-root :global(.stage-section:first-child) {
        margin-top: 4px;
    }
    .stage-root :global(.stage-lead) {
        margin: 0 0 12px;
        font-size: 14px;
        line-height: 1.5;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 78%, transparent);
    }
    .stage-root :global(.stage-list) {
        display: flex;
        flex-direction: column;
        border-radius: 16px;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-root :global(.stage-row) {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 56px;
        padding: 10px 14px;
        text-align: left;
        color: inherit;
    }
    .stage-root :global(.stage-list > .stage-row + .stage-row),
    .stage-root :global(.stage-list > * + .stage-row) {
        border-top: 1px solid var(--stage-line);
    }
    .stage-root :global(.stage-row.on) {
        background: color-mix(in oklab, var(--stage-accent) 14%, transparent);
    }
    .stage-root :global(.stage-row-main) {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        align-self: stretch;
        text-align: left;
        color: inherit;
    }
    .stage-root :global(.stage-row-ic) {
        flex: none;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        overflow: hidden;
        background: var(--stage-raised);
        color: var(--stage-muted);
    }
    .stage-root :global(.stage-row-ic img) {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .stage-root :global(.stage-row-text) {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .stage-root :global(.stage-row-text b) {
        font-size: 15px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .stage-root :global(.stage-row-text small) {
        font-size: 13px;
        color: var(--stage-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    .stage-root :global(.stage-row-end) {
        flex: none;
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--stage-muted);
        font-size: 14px;
    }
    .stage-root :global(.stage-field) {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
        font-size: 13px;
        font-weight: 600;
        color: var(--stage-muted);
    }
    .stage-root :global(.stage-field small) {
        font-weight: 400;
        line-height: 1.4;
    }
    .stage-root :global(.stage-input) {
        width: 100%;
        min-height: 46px;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid var(--stage-line);
        background: var(--stage-surface);
        color: var(--risu-theme-textcolor);
        font-size: 16px;
        font-weight: 400;
    }
    .stage-root :global(textarea.stage-input) {
        min-height: 110px;
        line-height: 1.5;
        resize: vertical;
    }
    .stage-root :global(.stage-input:focus) {
        outline: none;
        border-color: var(--stage-accent);
    }
    .stage-root :global(.stage-switch) {
        position: relative;
        flex: none;
        width: 48px;
        height: 28px;
        border-radius: 999px;
        background: color-mix(in oklab, var(--risu-theme-textcolor) 20%, transparent);
        transition: background 0.2s ease;
    }
    .stage-root :global(.stage-switch::after) {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #fff;
        transition: translate 0.2s ease;
    }
    .stage-root :global(.stage-switch.on) {
        background: var(--stage-accent);
    }
    .stage-root :global(.stage-switch.on::after) {
        translate: 20px 0;
    }
    .stage-root :global(.stage-btn) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 48px;
        padding: 0 18px;
        border-radius: 14px;
        background: var(--stage-raised);
        color: var(--risu-theme-textcolor);
        font-size: 15px;
        font-weight: 700;
    }
    .stage-root :global(.stage-btn.primary) {
        background: var(--stage-accent);
        color: #fff;
    }
    .stage-root :global(.stage-btn.danger) {
        background: color-mix(in oklab, #e5484d 22%, transparent);
        color: #ff8a8a;
    }
    .stage-root :global(.stage-btn.block) {
        width: 100%;
    }
    .stage-root :global(.stage-btn:disabled) {
        opacity: 0.45;
    }
    .stage-root :global(.stage-btns) {
        display: flex;
        gap: 10px;
        margin-top: 14px;
    }
    .stage-root :global(.stage-btns > .stage-btn) {
        flex: 1;
    }
    .stage-root :global(.stage-search) {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 46px;
        padding: 0 14px;
        margin-bottom: 12px;
        border-radius: 12px;
        background: var(--stage-surface);
        color: var(--stage-muted);
    }
    .stage-root :global(.stage-search input) {
        flex: 1;
        min-width: 0;
        background: none;
        border: 0;
        outline: none;
        font-size: 16px;
        color: var(--risu-theme-textcolor);
    }
    .stage-root :global(.stage-pill-btn) {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--stage-muted);
    }
    .stage-root :global(.stage-note) {
        display: flex;
        gap: 8px;
        margin: 12px 0;
        font-size: 13px;
        line-height: 1.45;
        color: var(--stage-muted);
    }
</style>
