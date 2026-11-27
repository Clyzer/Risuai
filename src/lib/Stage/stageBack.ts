// Android's back gesture (and the browser's back button) walks back through Stage's screens and
// never leaves the app. Every open layer (a story page, the play screen, its menu, a sub page,
// Risu's settings or a dialog) registers how to close itself. One extra history entry (the
// "guard") always sits on top; going back pops it, the top layer closes, and the guard returns.
// On Home with nothing open, back does nothing.
//
// Chrome skips history entries added without a user gesture when going back, so the guard is put
// back on the next tap too, not only right after a back.
import { untrack } from 'svelte'
import { get } from 'svelte/store'
import { alertStore, DBState, settingsOpen } from 'src/ts/stores.svelte'

type Layer = { close: () => void }

const layers: Layer[] = []
let guardActive = false
let started = false

function pushGuard() {
    if (guardActive || DBState.db?.theme !== 'stage') return
    history.pushState({ stageBack: true }, '')
    guardActive = true
}

function onPop() {
    guardActive = false
    layers[layers.length - 1]?.close()
    pushGuard()
}

/** Registers an open layer. Call the returned function when it closes. */
export function backLayer(close: () => void): () => void {
    // Called from components' effects; nothing read here should become a dependency.
    untrack(startStageBack)
    const layer: Layer = { close }
    layers.push(layer)
    return () => {
        const i = layers.indexOf(layer)
        if (i !== -1) layers.splice(i, 1)
    }
}

// Risu dialogs: messages with an OK button and the add / chat option menus close with back. The
// rest wait for an answer or show progress (an import), so back does nothing while they are up.
const DISMISS: Record<string, string> = { normal: '', error: '', markdown: '', addchar: 'cancel', chatOptions: 'cancel' }

export function startStageBack() {
    if (started || typeof window === 'undefined') return
    started = true
    window.addEventListener('popstate', onPop)
    window.addEventListener('pointerdown', pushGuard, true)
    window.addEventListener('keydown', pushGuard, true)
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) {
        pushGuard()
    }

    let unregisterAlert: (() => void) | null = null
    alertStore.subscribe((alert) => {
        const open = alert.type !== 'none' && alert.type !== 'toast'
        if (open && !unregisterAlert && DBState.db?.theme === 'stage') {
            unregisterAlert = backLayer(() => {
                const current = get(alertStore)
                if (current.type in DISMISS) alertStore.set({ type: 'none', msg: DISMISS[current.type] })
            })
        } else if (!open && unregisterAlert) {
            unregisterAlert()
            unregisterAlert = null
        }
    })

    // Risu's settings replace the whole Stage screen while open.
    let unregisterSettings: (() => void) | null = null
    settingsOpen.subscribe((open) => {
        if (open && !unregisterSettings && DBState.db?.theme === 'stage') {
            unregisterSettings = backLayer(() => settingsOpen.set(false))
        } else if (!open && unregisterSettings) {
            unregisterSettings()
            unregisterSettings = null
        }
    })
}
