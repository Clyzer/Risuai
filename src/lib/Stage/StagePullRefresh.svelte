<script lang="ts">
    // Pull down from the top of a Stage page to reload the app, as in the browser: an installed app
    // does not get Chrome's own pull-to-refresh. It waits for pending saves before reloading.
    import { RefreshCwIcon } from '@lucide/svelte'
    import { onMount } from 'svelte'
    import { saving } from 'src/ts/globalApi.svelte'
    import { stageSaveStatus } from './stageSave.svelte'

    // Pages that reload when pulled at the top. The play screen is not one: there, scrolling up
    // reads older messages.
    const SCROLLERS = '.stage-scroll, .stage-detail-scroll, .stage-realm'
    const TRIGGER = 80
    const MAX = 130

    let pull = $state(0)
    let reloading = $state(false)
    let tracking = false
    let startX = 0
    let startY = 0
    let scroller: HTMLElement | null = null

    // True when the touch is inside something that is itself scrolled down (a list inside Realm).
    function scrolledBetween(target: Element, root: HTMLElement) {
        for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
            if (el.scrollTop > 0) return true
        }
        return root.scrollTop > 0
    }

    function onStart(e: TouchEvent) {
        tracking = false
        if (reloading || e.touches.length !== 1) return
        const target = e.target as Element
        if (target.closest?.('input, textarea, select, [contenteditable="true"]')) return
        scroller = target.closest?.(SCROLLERS) as HTMLElement | null
        if (!scroller || scrolledBetween(target, scroller)) return
        tracking = true
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
    }

    function onMove(e: TouchEvent) {
        if (!tracking || !scroller) return
        const dy = e.touches[0].clientY - startY
        const dx = Math.abs(e.touches[0].clientX - startX)
        if (dy <= 0 || dx > dy || scroller.scrollTop > 0) {
            tracking = dy >= 0 && dx <= Math.max(dy, 12) && scroller.scrollTop <= 0
            pull = 0
            return
        }
        pull = Math.min(MAX, dy * 0.5)
    }

    function onEnd() {
        if (!tracking) return
        tracking = false
        if (pull >= TRIGGER) reload()
        else pull = 0
    }

    async function reload() {
        reloading = true
        pull = TRIGGER
        // Risu saves half a second after the last change; then wait for any save in progress.
        await new Promise((r) => setTimeout(r, 700))
        const until = Date.now() + 8000
        while ((saving.state || stageSaveStatus.phase === 'saving') && Date.now() < until) {
            await new Promise((r) => setTimeout(r, 150))
        }
        location.reload()
    }

    onMount(() => {
        const opts: AddEventListenerOptions = { passive: true, capture: true }
        document.addEventListener('touchstart', onStart, opts)
        document.addEventListener('touchmove', onMove, opts)
        document.addEventListener('touchend', onEnd, opts)
        document.addEventListener('touchcancel', onEnd, opts)
        return () => {
            document.removeEventListener('touchstart', onStart, opts)
            document.removeEventListener('touchmove', onMove, opts)
            document.removeEventListener('touchend', onEnd, opts)
            document.removeEventListener('touchcancel', onEnd, opts)
        }
    })
</script>

{#if pull > 0 || reloading}
    <div
        class="stage-ptr"
        class:ready={pull >= TRIGGER}
        style:transform="translate(-50%, {pull - 44}px)"
        style:opacity={Math.min(1, pull / TRIGGER)}
        aria-hidden="true"
    >
        <span class:spin={reloading} style:transform={reloading ? undefined : `rotate(${pull * 3}deg)`}>
            <RefreshCwIcon size={20} />
        </span>
    </div>
{/if}

<style>
    .stage-ptr {
        position: fixed;
        top: env(safe-area-inset-top, 0px);
        left: 50%;
        z-index: 96;
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: color-mix(in oklab, var(--stage-bg) 85%, var(--risu-theme-textcolor));
        border: 1px solid var(--stage-line);
        box-shadow: 0 6px 18px rgb(0 0 0 / 0.35);
        color: var(--stage-muted);
        pointer-events: none;
    }
    .stage-ptr.ready {
        color: var(--stage-accent);
    }
    .stage-ptr span {
        display: grid;
        place-items: center;
    }
    .stage-ptr .spin {
        animation: stage-ptr-spin 0.8s linear infinite;
    }
    @keyframes stage-ptr-spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
