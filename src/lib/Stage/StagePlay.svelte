<script lang="ts">
    // Stage play screen. It frames Risu's own chat screen (DefaultChatScreen: message list, input,
    // sending, rerolls, the card's Lua display and its buttons) and the card's backgroundHTML
    // (BackgroundDom, where cards keep their CSS). Nothing here renders messages itself.
    //
    // Cards such as Argenta put position:fixed panels inside their messages, so no element that
    // wraps the messages may use transform, filter, backdrop-filter, perspective, contain or
    // will-change: any of those would pin those panels to the wrapper instead of the screen.
    import { ArrowLeftIcon, ChevronsLeftIcon, ChevronsRightIcon, MenuIcon } from '@lucide/svelte'
    import { onDestroy, untrack } from 'svelte'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import DefaultChatScreen from '../ChatScreens/DefaultChatScreen.svelte'
    import BackgroundDom from '../ChatScreens/BackgroundDom.svelte'
    import ChatList from '../Others/ChatList.svelte'
    import ModuleChatMenu from '../Setting/Pages/Module/ModuleChatMenu.svelte'
    import StagePlayDrawer from './StagePlayDrawer.svelte'
    import StageCharacterEditor from './StageCharacterEditor.svelte'
    import StageIndicatorsHud from './StageIndicatorsHud.svelte'
    import StageIndicatorsPage from './StageIndicatorsPage.svelte'
    import StageVariablesPage from './StageVariablesPage.svelte'
    import { getIndicators } from './stageIndicators'
    import { stageNav } from './stageNav.svelte'
    import { stageKind } from './stageKinds'
    import { applyStep, buildSteps, clearMarks, isInteractiveTarget, readMode, saveMode, type DramaStep } from './stageDrama'

    let openChatList = $state(false)
    let openModuleList = $state(false)
    let drawerOpen = $state(false)
    let editorOpen = $state(false)
    let indicatorsOpen = $state(false)
    let variablesOpen = $state(false)
    let barHidden = $state(false)

    let char = $derived(DBState.db.characters[$selectedCharID])
    let chat = $derived(char?.chats?.[char.chatPage])
    let indicators = $derived(getIndicators(char))

    // ---- Novel / Drama ----
    let mode = $state<'novel' | 'drama'>('novel')
    let playEl: HTMLElement | undefined = $state()
    let steps: DramaStep[] = []
    let stepIndex = $state(0)
    let stepCount = $state(0)
    let newestIndex = -Infinity
    let observer: MutationObserver | null = null
    let rebuildTimer: ReturnType<typeof setTimeout> | null = null

    let currentChaId = ''
    $effect(() => {
        const id = char?.chaId ?? ''
        if (id !== currentChaId) {
            currentChaId = id
            mode = id ? readMode(id) : 'novel'
        }
    })

    function chatRoot() {
        return playEl?.querySelector<HTMLElement>('.default-chat-screen') ?? null
    }

    function firstStepOf(index: number) {
        return steps.findIndex((s) => s.index === index)
    }

    /** Recomputes the steps. A new message jumps to its first step; otherwise the place is kept. */
    function rebuild(startAtNewest = false) {
        const root = chatRoot()
        if (!root || mode !== 'drama') return
        const before = steps[stepIndex]
        steps = buildSteps(root)
        stepCount = steps.length
        const newest = steps.length ? steps[steps.length - 1].index : -Infinity
        if (startAtNewest || newest > newestIndex) {
            stepIndex = Math.max(0, firstStepOf(newest))
        } else if (before) {
            const same = steps.findIndex((s) => s.message === before.message && (s.blocks?.[0] ?? null) === (before.blocks?.[0] ?? null))
            stepIndex = same >= 0 ? same : Math.min(stepIndex, Math.max(0, steps.length - 1))
        }
        newestIndex = newest
        applyStep(root, steps[stepIndex])
    }

    function scheduleRebuild() {
        if (rebuildTimer) clearTimeout(rebuildTimer)
        rebuildTimer = setTimeout(() => rebuild(false), 150)
    }

    function go(delta: number) {
        if (steps.length === 0) return
        stepIndex = Math.min(Math.max(0, stepIndex + delta), steps.length - 1)
        const root = chatRoot()
        if (root) applyStep(root, steps[stepIndex])
    }

    function setMode(next: 'novel' | 'drama') {
        mode = next
        if (char?.chaId) saveMode(char.chaId, next)
    }

    // Start or stop the step controller when the mode or the chat changes.
    $effect(() => {
        const active = mode === 'drama'
        const root = chatRoot()
        void chat
        observer?.disconnect()
        observer = null
        if (!root) return
        if (!active) {
            clearMarks(root)
            return
        }
        // untrack: rebuild reads stepIndex, which must not restart this effect on every step.
        untrack(() => {
            newestIndex = -Infinity
            rebuild(true)
        })
        // Only structure changes (new messages, streamed blocks, the card re-rendering). Our own
        // class changes are attribute changes and do not retrigger this.
        observer = new MutationObserver(scheduleRebuild)
        observer.observe(root, { childList: true, subtree: true })
    })

    onDestroy(() => {
        observer?.disconnect()
        if (rebuildTimer) clearTimeout(rebuildTimer)
    })

    function onStageTap(e: MouseEvent) {
        if (mode !== 'drama' || isInteractiveTarget(e.target)) return
        go(1)
    }

    function onKey(e: KeyboardEvent) {
        if (mode !== 'drama') return
        const t = e.target as HTMLElement
        if (t?.closest?.('textarea,input,[contenteditable]')) return
        if (e.key === 'ArrowRight' || e.key === ' ') {
            go(1)
            e.preventDefault()
        } else if (e.key === 'ArrowLeft') {
            go(-1)
            e.preventDefault()
        }
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
    <div class="stage-play" class:drama={mode === 'drama'} bind:this={playEl} onscrollcapture={onScroll} style:--stage-top-space={indicators.length > 0 ? '100px' : '56px'}>
        <div class="stage-play-bg"><BackgroundDom /></div>
        <div class="stage-play-chat" onclick={onStageTap}>
            <DefaultChatScreen bind:openChatList bind:openModuleList />
        </div>

        {#if mode === 'drama' && stepCount > 0}
            <div class="stage-drama-nav">
                <button aria-label={language.stage.previous} disabled={stepIndex === 0} onclick={() => go(-1)}><ChevronsLeftIcon size={20} /></button>
                <span>{stepIndex + 1} / {stepCount}</span>
                <button aria-label={language.stage.next} disabled={stepIndex >= stepCount - 1} onclick={() => go(1)}><ChevronsRightIcon size={20} /></button>
            </div>
        {/if}

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
            <StagePlayDrawer
                close={() => (drawerOpen = false)}
                exit={back}
                openStoryPage={openStoryPage}
                openChatList={() => {
                    drawerOpen = false
                    openChatList = true
                }}
                openModuleList={() => {
                    drawerOpen = false
                    openModuleList = true
                }}
                openEditor={() => {
                    drawerOpen = false
                    editorOpen = true
                }}
                openIndicators={() => {
                    drawerOpen = false
                    indicatorsOpen = true
                }}
                openVariables={() => {
                    drawerOpen = false
                    variablesOpen = true
                }}
            />
        {/if}

        {#if editorOpen}
            <StageCharacterEditor close={() => (editorOpen = false)} />
        {/if}
        {#if indicatorsOpen}
            <StageIndicatorsPage close={() => (indicatorsOpen = false)} />
        {/if}
        {#if variablesOpen}
            <StageVariablesPage close={() => (variablesOpen = false)} />
        {/if}
    </div>

    {#if openChatList}
        <ChatList close={() => (openChatList = false)} />
    {:else if openModuleList}
        <ModuleChatMenu close={() => (openModuleList = false)} />
    {/if}
{/if}

<svelte:window onkeydown={onKey} />

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
    /* ---- Drama: one block per screen, centered. Hiding only (no clones) keeps the card working. ---- */
    /* The list is column-reverse: flex-start keeps the input at the bottom, and auto margins
       center the visible message in the space above it. */
    .stage-play.drama :global(.default-chat-screen) {
        justify-content: flex-start;
    }
    .stage-play.drama :global(.default-chat-screen > :is(.stage-drama-msg, :has(.stage-drama-msg))) {
        margin-top: auto;
        margin-bottom: auto;
    }
    .stage-play.drama :global(.default-chat-screen > :not(.risu-chat-input-bar):not(.stage-drama-msg):not(:has(.stage-drama-msg))) {
        display: none;
    }
    .stage-play.drama :global(.risu-chat:not(.stage-drama-msg)) {
        display: none;
    }
    .stage-play.drama :global(.stage-drama-msg:not(.stage-drama-whole) .chattext > :not(.stage-drama-on):not(.stage-drama-keep)) {
        display: none;
    }
    .stage-play.drama :global(.stage-drama-msg .risu-stage-tools) {
        display: none;
    }
    .stage-play.drama :global(.stage-drama-on) {
        animation: stage-drama-in 0.25s ease-out;
    }
    @keyframes -global-stage-drama-in {
        from {
            opacity: 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .stage-play.drama :global(.stage-drama-on) {
            animation: none;
        }
    }
    .stage-drama-nav {
        position: absolute;
        left: 50%;
        bottom: calc(84px + env(safe-area-inset-bottom, 0px));
        z-index: 35;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px;
        border-radius: 999px;
        background: color-mix(in oklab, var(--stage-bg) 88%, transparent);
        border: 1px solid var(--stage-line);
        translate: -50% 0;
        font-size: 13px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }
    .stage-drama-nav span {
        min-width: 56px;
        text-align: center;
    }
    .stage-drama-nav button {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 50%;
    }
    .stage-drama-nav button:disabled {
        opacity: 0.3;
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
