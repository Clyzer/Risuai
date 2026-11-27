// Drama mode: show the conversation one block per screen on top of Risu's own chat DOM.
// Nothing is cloned or re-rendered: blocks are only shown or hidden with classes, so the card's
// buttons (risu-btn, handled per message in Chat.svelte), Lua display and fixed panels keep working.
//
// Rule (validated with Argenta Academy, see docs/stage-theme/fase-0.md):
// - each top-level block of a reply is a step (paragraphs, visual-novel panels, figures);
// - blocks with controls (buttons, inputs, labels, forms) are grouped into one last step;
// - blocks that host position:fixed panels (a card's dock) stay visible on every step;
// - a message without a rendered body (or with nothing but controls) is a single step.

export interface DramaStep {
    /** data-chat-index of the message (-1 is the first message). */
    index: number
    message: HTMLElement
    /** Blocks shown on this step; null shows the whole message. */
    blocks: HTMLElement[] | null
}

const CONTROL = '[risu-btn],[risu-trigger],button,input,select,textarea,label[for],form'

function hostsFixedPanel(el: HTMLElement): boolean {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT)
    let node = walker.currentNode as HTMLElement | null
    for (let seen = 0; node && seen < 400; seen++) {
        if (getComputedStyle(node).position === 'fixed') return true
        node = walker.nextNode() as HTMLElement | null
    }
    return false
}

function hasControls(el: HTMLElement): boolean {
    return el.matches(CONTROL) || !!el.querySelector(CONTROL)
}

/** Blocks of one message that must stay visible on every step. */
export function keptBlocks(message: HTMLElement): HTMLElement[] {
    const body = message.querySelector<HTMLElement>('.chattext')
    if (!body) return []
    return [...body.children].filter((k) => k instanceof HTMLElement && hostsFixedPanel(k)) as HTMLElement[]
}

export function buildSteps(root: HTMLElement): DramaStep[] {
    const messages = [...root.querySelectorAll<HTMLElement>('.risu-chat[data-chat-index]')]
        .map((message) => ({ message, index: Number(message.dataset.chatIndex) }))
        .filter((m) => Number.isFinite(m.index))
        .sort((a, b) => a.index - b.index)

    const steps: DramaStep[] = []
    for (const { message, index } of messages) {
        const body = message.querySelector<HTMLElement>('.chattext')
        if (!body) {
            steps.push({ index, message, blocks: null })
            continue
        }
        const content: HTMLElement[] = []
        const controls: HTMLElement[] = []
        for (const child of [...body.children]) {
            if (!(child instanceof HTMLElement)) continue
            if (hostsFixedPanel(child)) continue
            if (hasControls(child)) controls.push(child)
            else if (child.textContent?.trim() || child.querySelector('img,video,svg,canvas') || child.style.backgroundImage) content.push(child)
        }
        if (content.length === 0) {
            steps.push({ index, message, blocks: null })
            continue
        }
        for (const block of content) steps.push({ index, message, blocks: [block] })
        if (controls.length > 0) steps.push({ index, message, blocks: controls })
    }
    return steps
}

const MARKS = ['stage-drama-msg', 'stage-drama-whole', 'stage-drama-on', 'stage-drama-keep']

export function clearMarks(root: HTMLElement) {
    for (const cls of MARKS) {
        root.querySelectorAll('.' + cls).forEach((el) => el.classList.remove(cls))
    }
}

/** Shows one step: marks its message, its blocks and the blocks that are always kept. */
export function applyStep(root: HTMLElement, step: DramaStep | undefined) {
    clearMarks(root)
    if (!step) return
    step.message.classList.add('stage-drama-msg')
    if (step.blocks === null) {
        step.message.classList.add('stage-drama-whole')
    } else {
        for (const block of step.blocks) block.classList.add('stage-drama-on')
    }
    for (const kept of keptBlocks(step.message)) kept.classList.add('stage-drama-keep')
}

/** True when a tap should not advance the story (it was meant for a control or the input). */
export function isInteractiveTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el?.closest) return true
    return !!el.closest(CONTROL + ',a,[contenteditable],.risu-chat-input-bar,.risu-chat-menu,.risu-stage-tools,.stage-drama-nav,.stage-play-top')
}

const MODE_KEY = 'risu-stage-mode:'

export function readMode(chaId: string): 'novel' | 'drama' {
    try {
        return localStorage.getItem(MODE_KEY + chaId) === 'drama' ? 'drama' : 'novel'
    } catch {
        return 'novel'
    }
}

export function saveMode(chaId: string, mode: 'novel' | 'drama') {
    try {
        localStorage.setItem(MODE_KEY + chaId, mode)
    } catch {}
}
