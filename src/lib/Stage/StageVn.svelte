<script lang="ts">
    // Drama: the story as a visual novel. One line per screen over the latest image of the story,
    // with the speaker's name, a typewriter reveal, and the card's own buttons as choices at the
    // end. The chat underneath stays mounted (invisible) so the card keeps working; see stageVn.ts.
    import { ArrowLeftIcon, ChevronLeftIcon, ScrollTextIcon } from '@lucide/svelte'
    import { onDestroy, tick, untrack } from 'svelte'
    import { backLayer } from './stageBack'
    import { language } from 'src/lang'
    import { readScene, type VnScene } from './stageVn'

    interface Props {
        /** Risu's chat list (.default-chat-screen). */
        root: HTMLElement | null
        /** Changes when another playthrough opens. */
        chatKey: string
        /** Speaker for unattributed quotes (a one-on-one chat); null in stories. */
        fallbackSpeaker: string | null
        userName: string
        generating: boolean
        /** The character's or story's own image, for replies without pictures. */
        portrait: string | null
        /** One-on-one chat: the portrait stands in front; a story only uses it, blurred, as the backdrop. */
        portraitInFront: boolean
        /** Set to false while the newest message is an interface (a start menu): the chat shows instead. */
        active?: boolean
    }

    let { root, chatKey, fallbackSpeaker, userName, generating, portrait, portraitInFront, active = $bindable(false) }: Props = $props()

    const EMPTY: VnScene = { beats: [], choices: [], newest: -Infinity, firstOfNewest: -1, ui: false, fixed: [], withHidden: new Set() }
    let scene = $state.raw<VnScene>(EMPTY)
    let index = $state(0)
    let shown = $state(0)
    let inputHeight = $state(72)
    /** data-chat-index of the reply shown as the card draws it ("See full reply"), or null. */
    let fullView = $state<number | null>(null)

    let lastNewest = -Infinity
    let lastChat = ''
    let observer: MutationObserver | null = null
    let sizeObserver: ResizeObserver | null = null
    let rebuildTimer: ReturnType<typeof setTimeout> | null = null
    let revealTimer: ReturnType<typeof setInterval> | null = null
    let marked: HTMLElement[] = []

    const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

    let beat = $derived(scene.beats[index])
    let text = $derived(beat?.text ?? '')
    let atEnd = $derived(index >= scene.beats.length - 1 && shown >= text.length)
    let spriteUrl = $derived(beat?.sprite ?? (portraitInFront ? portrait : null))
    let backdropUrl = $derived(beat?.bg ?? beat?.sprite ?? portrait)
    // Position within the current message, which is what the counter shows.
    let messageBeats = $derived(beat ? scene.beats.filter((b) => b.message === beat.message) : [])
    let messagePos = $derived(beat ? messageBeats.indexOf(beat) + 1 : 0)

    function markFixed(list: HTMLElement[]) {
        for (const el of marked) if (!list.includes(el)) el.classList.remove('stage-vn-keep')
        for (const el of list) el.classList.add('stage-vn-keep')
        marked = list
    }

    function reveal(full = false) {
        if (revealTimer) clearInterval(revealTimer)
        revealTimer = null
        if (full || reduceMotion) {
            shown = Infinity
            return
        }
        shown = 0
        revealTimer = setInterval(() => {
            shown += 2
            if (shown >= text.length && revealTimer) {
                clearInterval(revealTimer)
                revealTimer = null
            }
        }, 28)
    }

    function rebuild() {
        if (!root) return
        const before = scene.beats[index]
        const next = readScene(root, { fallbackSpeaker, userName })
        if (chatKey !== lastChat) {
            lastChat = chatKey
            lastNewest = -Infinity
        }
        scene = next
        active = fullView === null && !next.ui && next.beats.length > 0
        markFixed(active ? next.fixed : [])
        if (next.newest > lastNewest && next.firstOfNewest >= 0) {
            // A new reply (or a new playthrough) with its first line rendered: start there. Until
            // Risu renders (or streams) that line, the previous one stays on screen.
            lastNewest = next.newest
            index = Math.max(0, next.firstOfNewest)
            reveal()
            return
        }
        const same = before ? next.beats.findIndex((b) => b.key === before.key) : -1
        index = same >= 0 ? same : Math.min(index, Math.max(0, next.beats.length - 1))
        // A line still being streamed keeps revealing; otherwise it stays as it was.
        if (!revealTimer && shown !== Infinity && shown < (next.beats[index]?.text.length ?? 0)) reveal()
    }

    function scheduleRebuild() {
        if (rebuildTimer) clearTimeout(rebuildTimer)
        rebuildTimer = setTimeout(rebuild, 160)
    }

    $effect(() => {
        const el = root
        void chatKey
        observer?.disconnect()
        sizeObserver?.disconnect()
        if (!el) return
        // untrack: rebuild reads the current line, which must not restart this effect on every tap.
        untrack(rebuild)
        // Structure and text only: the classes this component adds do not retrigger it.
        observer = new MutationObserver(scheduleRebuild)
        observer.observe(el, { childList: true, subtree: true, characterData: true })
        const bar = el.querySelector<HTMLElement>('.risu-chat-input-bar')
        if (bar) {
            sizeObserver = new ResizeObserver(() => (inputHeight = bar.offsetHeight))
            sizeObserver.observe(bar)
        }
    })

    onDestroy(() => {
        observer?.disconnect()
        sizeObserver?.disconnect()
        if (rebuildTimer) clearTimeout(rebuildTimer)
        if (revealTimer) clearInterval(revealTimer)
        markFixed([])
        active = false
    })

    function next() {
        if (shown < text.length) {
            reveal(true)
            return
        }
        if (index < scene.beats.length - 1) {
            index++
            reveal()
        }
    }

    function previous() {
        if (index > 0) {
            index--
            reveal(true)
        }
    }

    function onTap(e: MouseEvent) {
        if ((e.target as HTMLElement)?.closest?.('button,a,input,textarea')) return
        next()
    }

    function onKey(e: KeyboardEvent) {
        if (!active) return
        if ((e.target as HTMLElement)?.closest?.('textarea,input,[contenteditable]')) return
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            next()
            e.preventDefault()
        } else if (e.key === 'ArrowLeft') {
            previous()
            e.preventDefault()
        }
    }

    // "See full reply": the chat shows again at that reply, exactly as the card draws it (panels,
    // newspaper, thoughts, interactive parts all work, they are the originals). Back returns here.
    async function openFull(message: number) {
        fullView = message
        active = false
        markFixed([])
        await tick()
        root?.querySelector(`.risu-chat[data-chat-index="${message}"]`)?.scrollIntoView({ block: 'start' })
    }

    function closeFull() {
        fullView = null
        rebuild()
    }

    $effect(() => {
        if (fullView !== null) return backLayer(closeFull)
    })

    function choose(target: HTMLElement) {
        target.click()
    }

    function cssUrl(url: string | null) {
        return url ? `url("${url.replace(/"/g, '%22')}")` : undefined
    }
</script>

<svelte:window onkeydown={onKey} />

{#if fullView !== null}
    <button class="stage-vn-return" onclick={closeFull}><ArrowLeftIcon size={16} />{language.stage.backToDrama}</button>
{/if}

{#if active && beat}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="stage-vn" style:--vn-input={`${inputHeight}px`} onclick={onTap}>
        <div class="stage-vn-bg" class:blur={!beat.bg} style:background-image={cssUrl(backdropUrl)}></div>
        {#if spriteUrl}
            {#key spriteUrl}
                <img class="stage-vn-sprite" class:alone={!beat.bg} src={spriteUrl} alt="" draggable="false" />
            {/key}
        {/if}
        {#if beat.place}
            <div class="stage-vn-place">{beat.place}</div>
        {/if}

        {#if atEnd && !generating && scene.choices.length > 0}
            <div class="stage-vn-choices">
                {#each scene.choices.filter((c) => !c.utility) as choice}
                    <button onclick={() => choose(choice.target)}>{choice.label}</button>
                {/each}
                {#if scene.choices.some((c) => c.utility)}
                    <div class="stage-vn-tools">
                        {#each scene.choices.filter((c) => c.utility) as tool}
                            <button onclick={() => choose(tool.target)}>{tool.label}</button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        <div class="stage-vn-box" class:narration={!beat.speaker} class:user={beat.role === 'user'}>
            {#if beat.speaker}
                <div class="stage-vn-name">{beat.speaker}</div>
            {/if}
            <p class="stage-vn-text" class:italic={beat.italic} aria-live="polite">{text.slice(0, shown)}</p>
            <div class="stage-vn-meta">
                <button class="stage-vn-back" aria-label={language.stage.previous} disabled={index === 0} onclick={previous}>
                    <ChevronLeftIcon size={18} />
                </button>
                <span>{messagePos} / {messageBeats.length}</span>
                <button
                    class="stage-vn-full"
                    class:has={scene.withHidden.has(beat.message)}
                    aria-label={language.stage.fullReply}
                    title={language.stage.fullReply}
                    onclick={() => openFull(beat.message)}
                >
                    <ScrollTextIcon size={17} />
                </button>
                {#if atEnd && generating}
                    <span class="stage-vn-typing" aria-label={language.stage.writing}><i></i><i></i><i></i></span>
                {:else if !atEnd}
                    <span class="stage-vn-more" aria-hidden="true">▼</span>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .stage-vn {
        position: absolute;
        inset: 0 0 var(--vn-input) 0;
        z-index: 1;
        overflow: hidden;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        background: var(--stage-bg);
    }
    .stage-vn-bg {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        transition: background-image 0.4s ease;
    }
    .stage-vn-bg.blur {
        filter: blur(18px) brightness(0.55);
        transform: scale(1.1);
    }
    .stage-vn-bg::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(transparent 55%, color-mix(in oklab, var(--stage-bg) 70%, transparent));
    }
    .stage-vn-sprite {
        position: absolute;
        left: 50%;
        bottom: 0;
        max-width: 100%;
        height: 78%;
        object-fit: contain;
        object-position: center bottom;
        translate: -50% 0;
        animation: stage-vn-in 0.3s ease-out;
        pointer-events: none;
    }
    /* A picture without a scene behind it (an illustration): shown whole above the box. */
    .stage-vn-sprite.alone {
        top: calc(var(--stage-top-space, 56px) + env(safe-area-inset-top, 0px) + 8px);
        bottom: 150px;
        height: auto;
        max-height: calc(100% - var(--stage-top-space, 56px) - 160px);
        object-position: center;
        border-radius: 14px;
    }
    .stage-vn-place {
        position: absolute;
        top: calc(var(--stage-top-space, 56px) + env(safe-area-inset-top, 0px) + 6px);
        left: 12px;
        padding: 4px 12px;
        border-radius: 999px;
        background: color-mix(in oklab, var(--stage-bg) 75%, transparent);
        font-size: 13px;
        font-weight: 700;
        pointer-events: none;
    }
    .stage-vn-box {
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 8px;
        min-height: 128px;
        padding: 18px 16px 8px;
        border-radius: 16px;
        background: color-mix(in oklab, var(--stage-bg) 86%, transparent);
        border: 1px solid color-mix(in oklab, var(--risu-theme-textcolor) 14%, transparent);
        box-shadow: 0 10px 30px rgb(0 0 0 / 0.45);
        backdrop-filter: blur(6px);
    }
    .stage-vn-name {
        position: absolute;
        top: -15px;
        left: 14px;
        max-width: calc(100% - 28px);
        padding: 4px 14px;
        border-radius: 999px;
        background: var(--stage-accent);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-vn-box.user .stage-vn-name {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .stage-vn-text {
        margin: 0;
        min-height: 3.2em;
        font-size: 17px;
        line-height: 1.55;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    .stage-vn-text.italic {
        font-style: italic;
    }
    .stage-vn-box.narration .stage-vn-text {
        color: color-mix(in oklab, var(--risu-theme-textcolor) 86%, transparent);
    }
    .stage-vn-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        font-size: 12px;
        color: var(--stage-muted);
        font-variant-numeric: tabular-nums;
    }
    .stage-vn-back {
        width: 36px;
        height: 32px;
        display: grid;
        place-items: center;
        margin-left: -8px;
        border-radius: 8px;
        color: var(--stage-muted);
    }
    .stage-vn-back:disabled {
        opacity: 0.3;
    }
    .stage-vn-full {
        position: relative;
        width: 36px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        color: var(--stage-muted);
        opacity: 0.45;
    }
    .stage-vn-full.has {
        opacity: 1;
    }
    .stage-vn-full.has::after {
        content: '';
        position: absolute;
        top: 4px;
        right: 6px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--stage-accent);
    }
    .stage-vn-return {
        position: absolute;
        top: calc(var(--stage-top-space, 56px) + env(safe-area-inset-top, 0px) + 8px);
        left: 50%;
        z-index: 36;
        translate: -50% 0;
        display: flex;
        align-items: center;
        gap: 6px;
        height: 38px;
        padding: 0 16px;
        border-radius: 999px;
        background: var(--stage-accent);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 6px 18px rgb(0 0 0 / 0.35);
    }
    .stage-vn-more {
        margin-left: auto;
        color: var(--stage-accent);
        animation: stage-vn-bob 1s ease-in-out infinite;
    }
    .stage-vn-typing {
        margin-left: auto;
        display: flex;
        gap: 4px;
    }
    .stage-vn-typing i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--stage-accent);
        animation: stage-vn-dot 1s ease-in-out infinite;
    }
    .stage-vn-typing i:nth-child(2) {
        animation-delay: 0.15s;
    }
    .stage-vn-typing i:nth-child(3) {
        animation-delay: 0.3s;
    }
    .stage-vn-choices {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 150px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: calc(100% - 230px);
        overflow-y: auto;
    }
    .stage-vn-tools {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
    }
    .stage-vn-choices .stage-vn-tools button {
        min-height: 34px;
        padding: 4px 12px;
        border-radius: 999px;
        background: color-mix(in oklab, var(--stage-bg) 82%, transparent);
        border: 1px solid color-mix(in oklab, var(--risu-theme-textcolor) 18%, transparent);
        font-size: 13px;
        font-weight: 600;
    }
    .stage-vn-choices > button {
        min-height: 48px;
        padding: 10px 16px;
        border-radius: 14px;
        background: color-mix(in oklab, var(--stage-bg) 82%, transparent);
        border: 1px solid color-mix(in oklab, var(--stage-accent) 55%, transparent);
        font-size: 15px;
        font-weight: 600;
        text-align: left;
        animation: stage-vn-in 0.25s ease-out;
    }
    @keyframes stage-vn-in {
        from {
            opacity: 0;
        }
    }
    @keyframes stage-vn-bob {
        50% {
            translate: 0 3px;
        }
    }
    @keyframes stage-vn-dot {
        50% {
            opacity: 0.3;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .stage-vn-sprite,
        .stage-vn-choices button,
        .stage-vn-more,
        .stage-vn-typing i {
            animation: none;
        }
    }
</style>
