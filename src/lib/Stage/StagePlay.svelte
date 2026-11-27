<script lang="ts">
    // Stage play screen. It frames Risu's own chat screen (DefaultChatScreen: message list, input,
    // sending, rerolls, the card's Lua display and its buttons) and the card's backgroundHTML
    // (BackgroundDom, where cards keep their CSS). Nothing here renders messages itself.
    //
    // Cards such as Argenta put position:fixed panels inside their messages, so no element that
    // wraps the messages may use transform, filter, backdrop-filter, perspective, contain or
    // will-change: any of those would pin those panels to the wrapper instead of the screen.
    import { ArrowLeftIcon, MenuIcon } from '@lucide/svelte'
    import { untrack } from 'svelte'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import DefaultChatScreen from '../ChatScreens/DefaultChatScreen.svelte'
    import BackgroundDom from '../ChatScreens/BackgroundDom.svelte'
    import StagePlayDrawer from './StagePlayDrawer.svelte'
    import StageCharacterEditor from './StageCharacterEditor.svelte'
    import StageIndicatorsHud from './StageIndicatorsHud.svelte'
    import StageIndicatorsPage from './StageIndicatorsPage.svelte'
    import StageVariablesPage from './StageVariablesPage.svelte'
    import { getIndicators } from './stageIndicators'
    import { stageNav, type StagePlayPage } from './stageNav.svelte'
    import StagePlaythroughsPage from './StagePlaythroughsPage.svelte'
    import StageModulesPage from './StageModulesPage.svelte'
    import StagePersonaPage from './StagePersonaPage.svelte'
    import StageModelPage from './StageModelPage.svelte'
    import StageLorebookPage from './StageLorebookPage.svelte'
    import StageCharacterPage from './StageCharacterPage.svelte'
    import { backLayer } from './stageBack'
    import { stageKind } from './stageKinds'
    import { readMode, saveMode, setDramaFormat } from './stageDrama'
    import StageVn from './StageVn.svelte'
    import { doingChat } from 'src/ts/process/index.svelte'
    import { getUserName } from 'src/ts/util'
    import { getCharImage } from 'src/ts/characters'

    // Risu's input menu asks for its chat list or module menu through these; Stage's pages answer.
    let openChatList = $state(false)
    let openModuleList = $state(false)
    let drawerOpen = $state(false)
    let page = $state<StagePlayPage | null>(null)
    /** Risu's full character editor (scripts, regex, assets...), opened from Stage's own editor. */
    let fullEditorOpen = $state(false)

    $effect(() => {
        if (openChatList) {
            openChatList = false
            page = 'playthroughs'
        }
    })
    $effect(() => {
        if (openModuleList) {
            openModuleList = false
            page = 'modules'
        }
    })

    function openPage(next: StagePlayPage) {
        drawerOpen = false
        page = next
    }
    let barHidden = $state(false)

    let char = $derived(DBState.db.characters[$selectedCharID])
    let chat = $derived(char?.chats?.[char.chatPage])
    let indicators = $derived(getIndicators(char))

    // ---- Novel / Drama ----
    let mode = $state<'novel' | 'drama'>('novel')
    let playEl: HTMLElement | undefined = $state()
    let chatRoot = $state<HTMLElement | null>(null)
    let vnActive = $state(false)
    let fallbackSpeaker = $derived(char && char.type !== 'group' && stageKind(char) === 'chat' ? char.name : null)

    // The character's own image, for Drama lines without pictures.
    let portrait = $state<string | null>(null)
    $effect(() => {
        const image = char?.image
        let cancelled = false
        portrait = null
        if (image) {
            getCharImage(image, 'plain').then((url) => {
                if (!cancelled) portrait = url || null
            })
        }
        return () => {
            cancelled = true
        }
    })

    let currentChaId = ''
    $effect(() => {
        const id = char?.chaId ?? ''
        if (id !== currentChaId) {
            currentChaId = id
            mode = id ? readMode(id) : 'novel'
        }
    })

    // Risu's chat list (.default-chat-screen) appears once DefaultChatScreen has rendered.
    $effect(() => {
        void chat
        const el = playEl
        if (!el) return
        let frames = 0
        let raf = 0
        const find = () => {
            const found = el.querySelector<HTMLElement>('.default-chat-screen')
            if (found || frames++ > 60) chatRoot = found
            else raf = requestAnimationFrame(find)
        }
        find()
        return () => cancelAnimationFrame(raf)
    })

    // Drama adds its format note to this playthrough's own lorebook; Novel removes it.
    $effect(() => {
        const c = chat
        const drama = mode === 'drama'
        if (c) untrack(() => setDramaFormat(c, drama))
    })

    function setMode(next: 'novel' | 'drama') {
        mode = next
        if (char?.chaId) saveMode(char.chaId, next)
    }

    // Back goes where the player came from: the story page for stories, the Chats list for chats.
    function back() {
        const index = $selectedCharID
        drawerOpen = false
        if (char && stageKind(char) === 'chat') {
            stageNav.detail = null
            stageNav.tab = 'chats'
        } else {
            stageNav.detail = index >= 0 ? index : null
        }
        selectedCharID.set(-1)
    }

    // Back gesture: closes the open sub page or menu first, then leaves the playthrough.
    $effect(() => backLayer(back))
    $effect(() => {
        if (drawerOpen) return backLayer(() => (drawerOpen = false))
    })
    // Stage's own pages register their back step themselves (StagePage); these two do not.
    $effect(() => {
        if (page === 'indicators' || page === 'variables') return backLayer(() => (page = null))
    })
    $effect(() => {
        if (fullEditorOpen) return backLayer(() => (fullEditorOpen = false))
    })

    function openStoryPage() {
        const index = $selectedCharID
        drawerOpen = false
        stageNav.detail = index >= 0 ? index : null
        selectedCharID.set(-1)
    }

    // The chat list scrolls in reverse (newest at the bottom). Reading older messages hides the
    // bar to give the card the whole screen; heading back to the newest shows it again.
    let lastTop = 0
    function onScroll(e: Event) {
        const el = e.target as HTMLElement
        if (!el?.classList?.contains('default-chat-screen')) return
        const top = el.scrollTop
        const delta = top - lastTop
        if (Math.abs(delta) < 8) return
        barHidden = delta < 0 && top < -80
        lastTop = top
    }
</script>

{#if char}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="stage-play" class:vn={mode === 'drama' && vnActive} bind:this={playEl} onscrollcapture={onScroll} style:--stage-top-space={indicators.length > 0 ? '100px' : '56px'}>
        <div class="stage-play-bg"><BackgroundDom /></div>
        <div class="stage-play-chat">
            <DefaultChatScreen bind:openChatList bind:openModuleList />
            {#if mode === 'drama'}
                <StageVn
                    root={chatRoot}
                    chatKey={`${char.chaId}:${char.chatPage}`}
                    {fallbackSpeaker}
                    userName={getUserName()}
                    generating={$doingChat}
                    {portrait}
                    portraitInFront={fallbackSpeaker !== null}
                    bind:active={vnActive}
                />
            {/if}
        </div>

        <header class="stage-play-top" class:hidden={barHidden}>
            <button class="stage-play-btn" aria-label={language.stage.back} onclick={back}>
                <ArrowLeftIcon size={22} />
            </button>
            <div class="stage-play-title">
                <b>{char.name}</b>
                {#if chat?.name}<span>{chat.name}</span>{/if}
            </div>
            <div class="stage-mode" role="tablist" aria-label={language.stage.readingMode}>
                <button role="tab" aria-selected={mode === 'novel'} class:on={mode === 'novel'} onclick={() => setMode('novel')}>{language.stage.novel}</button>
                <button role="tab" aria-selected={mode === 'drama'} class:on={mode === 'drama'} onclick={() => setMode('drama')}>{language.stage.drama}</button>
            </div>
            <button class="stage-play-btn" aria-label={language.stage.playMenu} onclick={() => (drawerOpen = true)}>
                <MenuIcon size={22} />
            </button>
        </header>

        {#if indicators.length > 0}
            <StageIndicatorsHud {indicators} {char} {chat} hidden={barHidden} />
        {/if}

        {#if drawerOpen}
            <StagePlayDrawer close={() => (drawerOpen = false)} exit={back} {openStoryPage} open={openPage} />
        {/if}

        {#if page === 'playthroughs'}
            <StagePlaythroughsPage close={() => (page = null)} />
        {:else if page === 'modules'}
            <StageModulesPage close={() => (page = null)} />
        {:else if page === 'persona'}
            <StagePersonaPage close={() => (page = null)} />
        {:else if page === 'model'}
            <StageModelPage close={() => (page = null)} />
        {:else if page === 'lorebook'}
            <StageLorebookPage close={() => (page = null)} />
        {:else if page === 'character'}
            <StageCharacterPage close={() => (page = null)} openFullEditor={() => (fullEditorOpen = true)} />
        {:else if page === 'indicators'}
            <StageIndicatorsPage close={() => (page = null)} />
        {:else if page === 'variables'}
            <StageVariablesPage close={() => (page = null)} />
        {/if}
        {#if fullEditorOpen}
            <StageCharacterEditor close={() => (fullEditorOpen = false)} />
        {/if}
    </div>
{/if}


<style>
    .stage-play {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-width: 0;
        overflow: hidden;
        background: var(--stage-bg);
    }
    .stage-play-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }
    .stage-play-bg > :global(*) {
        pointer-events: auto;
    }
    .stage-play-chat {
        position: relative;
        flex: 1;
        min-height: 0;
        display: flex;
    }
    /* Room for the floating top bar above the oldest message. */
    .stage-play :global(.default-chat-screen) {
        padding-top: calc(var(--stage-top-space, 56px) + env(safe-area-inset-top, 0px));
    }
    /* Messages (Chat.svelte's "stage" branch): the card's content gets the full width. */
    .stage-play :global(.risu-chat > div) {
        margin: 0;
        padding: 2px 0;
    }
    .stage-play :global(.risu-stage-msg) {
        width: 100%;
        min-width: 0;
    }
    /* .chattext is an inline <span> holding block content; as a block its padding reaches the text. */
    .stage-play :global(.risu-stage-char .chattext) {
        display: block;
        max-width: 100%;
        padding: 0 14px;
    }
    .stage-play :global(.risu-stage-user) {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        padding: 6px 14px;
    }
    .stage-play :global(.risu-stage-bubble) {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 18px 18px 6px 18px;
        background: var(--stage-raised);
    }
    .stage-play :global(.risu-stage-bubble .chattext) {
        max-width: 100%;
    }
    .stage-play :global(.risu-stage-act) {
        min-width: 40px;
        height: 36px;
        padding: 0 10px;
        display: inline-grid;
        place-items: center;
        border-radius: 999px;
        color: var(--stage-muted);
    }
    .stage-play :global(.risu-stage-act.primary) {
        padding: 0 18px;
        background: var(--stage-accent);
        color: #fff;
        font-weight: 700;
    }
    .stage-play :global(.risu-stage-page) {
        font-size: 12px;
        font-variant-numeric: tabular-nums;
    }
    .stage-play :global(.risu-stage-tools) {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        padding: 4px 14px;
        color: var(--stage-muted);
        font-size: 13px;
    }
    /* ---- Drama: the visual novel (StageVn) covers the chat, which stays mounted but invisible so
       the card's scripts, buttons and fixed panels (marked stage-vn-keep) keep working. ---- */
    .stage-play.vn :global(.default-chat-screen) {
        visibility: hidden;
        overflow: hidden;
    }
    .stage-play.vn :global(.default-chat-screen > .risu-chat-input-bar),
    .stage-play.vn :global(.stage-vn-keep) {
        visibility: visible;
    }
    /* The creator's notes live on the story page; Risu's note card does not repeat them here. */
    .stage-play :global(.risu-creator-quote) {
        display: none;
    }
    .stage-mode {
        flex: none;
        display: flex;
        padding: 3px;
        border-radius: 999px;
        background: var(--stage-surface);
    }
    .stage-mode button {
        height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .stage-mode button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    /* Keep the input at the bottom while reading older messages, like Risu's "fixed chat textarea"
       option does (the list is column-reverse, so the input is its first child). */
    .stage-play :global(.default-chat-screen > .risu-chat-input-bar) {
        position: sticky;
        bottom: 0;
        z-index: 29;
        margin: 0;
        padding: 10px 0 calc(10px + env(safe-area-inset-bottom, 0px));
        background: linear-gradient(color-mix(in oklab, var(--stage-bg) 0%, transparent), var(--stage-bg) 35%);
        align-items: flex-end;
        gap: 6px;
        padding-left: 6px;
        padding-right: 8px;
    }
    /* Input bar like a messaging app: the chat actions (⋯) on the left, apart from Send; the text
       field as a pill; Send (and Stop while the reply is written) as the accent circle. */
    .stage-play :global(.risu-chat-input-bar > .risu-chat-options-btn) {
        order: -1;
        flex: none;
        width: 44px;
        height: 44px !important;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--stage-muted);
    }
    /* Risu's chat actions menu (⋯) becomes a bottom sheet with large rows. */
    .stage-play :global(.risu-chat-input-bar .risu-chat-menu) {
        position: fixed;
        top: auto;
        left: 50%;
        right: auto;
        bottom: 0;
        z-index: 95;
        width: 100%;
        max-width: 640px;
        max-height: 70vh;
        overflow-y: auto;
        translate: -50% 0;
        gap: 0;
        padding: 22px 10px calc(14px + env(safe-area-inset-bottom, 0px));
        border-radius: 22px 22px 0 0;
        background: var(--stage-raised);
        box-shadow: 0 -10px 40px rgb(0 0 0 / 0.5);
    }
    .stage-play :global(.risu-chat-input-bar .risu-chat-menu::before) {
        content: '';
        position: absolute;
        top: 8px;
        left: 50%;
        width: 40px;
        height: 4px;
        translate: -50% 0;
        border-radius: 2px;
        background: color-mix(in oklab, var(--risu-theme-textcolor) 25%, transparent);
    }
    .stage-play :global(.risu-chat-input-bar .risu-chat-menu > div) {
        min-height: 52px;
        padding: 0 12px;
        border-radius: 12px;
        font-size: 16px;
    }
    .stage-play :global(.risu-chat-input-bar .risu-chat-menu > div:active) {
        background: var(--stage-surface);
    }
    .stage-play :global(.risu-chat-input-bar .risu-chat-menu > div > svg) {
        flex: none;
        color: var(--stage-muted);
    }
    .stage-play :global(.risu-chat-input-bar > textarea.text-input-area) {
        min-height: 44px;
        margin: 0;
        padding: 10px 16px;
        border: 1px solid var(--stage-line);
        border-radius: 22px;
        background: var(--stage-surface);
        font-size: 16px;
        line-height: 1.4;
    }
    .stage-play :global(.risu-chat-input-bar > button:not(.risu-chat-options-btn)) {
        flex: none;
        width: 44px;
        height: 44px !important;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--stage-accent);
        color: #fff;
    }
    /* The top bar floats over the chat; it may move with transform because it does not wrap messages. */
    .stage-play-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 40;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 56px;
        padding: env(safe-area-inset-top, 0px) 8px 0 4px;
        background: linear-gradient(var(--stage-bg) 55%, color-mix(in oklab, var(--stage-bg) 0%, transparent));
        transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .stage-play-top.hidden {
        transform: translateY(-110%);
        opacity: 0;
        pointer-events: none;
    }
    .stage-play-btn {
        flex: none;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 50%;
    }
    .stage-play-btn:active {
        background: var(--stage-surface);
    }
    .stage-play-title {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        line-height: 1.25;
    }
    .stage-play-title b {
        font-size: 16px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-play-title span {
        font-size: 12px;
        color: var(--stage-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
