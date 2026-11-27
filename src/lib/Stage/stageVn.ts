// Drama as a visual novel. The scene is read from what Risu already rendered for each message (the
// card's Lua display, its regex, its images) and shown again one line per screen over the last
// image of the story. Nothing in the chat is moved or cloned: the chat stays mounted but invisible,
// so the card's scripts, buttons and fixed panels keep working, and choices click the card's own
// buttons.
//
// Reading rules (checked with Argenta Academy and plain prose cards):
// - paragraphs and text blocks become lines; a line longer than a screen is split by sentences;
// - "Name: line" (or **Name**: line) gives the speaker; a quote after a name label of a card's
//   panel (e.g. Argenta's character panels) belongs to that character;
// - italic-only paragraphs, *starred* or (parenthesised) ones are inner thoughts: skipped;
// - status windows and panels (tables, details, code, form controls, hidden or fixed elements)
//   are skipped, but their images still count, so the stage shows the latest image;
// - large background images set the scene; large <img> set the picture in front;
// - buttons of the newest message become the choices at the end;
// - a newest message full of controls (a card's start menu) is an interface, not a scene.

export interface VnBeat {
    key: string
    /** data-chat-index of the message the line comes from. */
    message: number
    role: 'char' | 'user'
    speaker: string | null
    text: string
    dialogue: boolean
    /** Written in italics or between asterisks: an action, shown in italics. */
    italic: boolean
    bg: string | null
    sprite: string | null
    place: string | null
}

export interface VnChoice {
    label: string
    target: HTMLElement
    /** A card tool (its label starts with an icon, like "🔄 Reroll images"), not a story choice. */
    utility: boolean
}

export interface VnScene {
    beats: VnBeat[]
    choices: VnChoice[]
    /** data-chat-index of the newest message read. */
    newest: number
    /** Index in beats of the newest message's first line (-1 when it has none). */
    firstOfNewest: number
    /** The newest message is an interface (a start menu), not a scene. */
    ui: boolean
    /** Fixed panels of the card (a dock) that must stay visible over the novel. */
    fixed: HTMLElement[]
    /** Messages (data-chat-index) with content the novel does not show: panels, thoughts, forms. */
    withHidden: Set<number>
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'DETAILS', 'TABLE', 'PRE', 'CODE', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME', 'HR', 'OBJECT'])
const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'LABEL'])
const CONTROL = 'button,[risu-btn],[risu-trigger]'
const NOT_PROSE = 'p,div,section,article,blockquote,ul,ol,li,h1,h2,h3,h4,h5,h6,table,figure,img,details,pre,form,header,footer,aside,nav,button,[risu-btn],[risu-trigger],input,label,select,textarea'
const QUOTE = /[“"«「『][^“”"«»「」『』]*[”"»」』]/g
const NAMED = /^\s*\**\s*([^\s:：*"“«「(（][^:：*\n"“«「]{0,38}?)\s*\**\s*[:：]\s*(\S[\s\S]*)$/
const MAX_LINE = 240
/** Class names of a card's name or place labels (Argenta: wka-vname, wka-vplace). */
const LABEL_CLASS = /name|place|location/i
const UI_CONTROLS = 12

function cssUrl(value: string): string | null {
    const m = /url\(\s*(['"]?)(.*?)\1\s*\)/.exec(value)
    return m ? m[2] : null
}

function classOf(el: Element): string {
    return typeof el.className === 'string' ? el.className : ''
}

/** Text of an element as written (Risu's chat is invisible here, so innerText would be empty). */
function textOf(el: Element): string {
    let out = ''
    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            out += node.nodeValue ?? ''
            return
        }
        if (!(node instanceof Element)) return
        if (node.tagName === 'BR') {
            out += '\n'
            return
        }
        if (SKIP_TAGS.has(node.tagName) || FORM_TAGS.has(node.tagName) || node.matches(CONTROL)) return
        node.childNodes.forEach(walk)
    }
    el.childNodes.forEach(walk)
    return out
        .replace(/[ \t ]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .trim()
}

function firstText(el: Element): string {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n.nodeValue?.trim()
        if (t) return t
    }
    return ''
}

function italicOnly(el: Element): boolean {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let any = false
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue?.trim()) continue
        any = true
        const italic = n.parentElement?.closest('em,i')
        if (!italic || !el.contains(italic)) return false
    }
    return any
}

const FIRST_PERSON = /(^|[^\p{L}])(yo|me|mi|mis|mí|conmigo|nosotros|nosotras|I|I'm|I'll|I've|my|myself|me)(?=[^\p{L}]|$)/iu

/** Italics or *asterisks*: an action, unless it reads as an inner thought. */
function styledAside(text: string, el: Element | null): boolean {
    return (el !== null && italicOnly(el)) || /^\*[^*]+\*$/.test(text.trim())
}

/** Inner thoughts are skipped: (in parentheses), or an aside in first person or trailing off. */
function isThought(text: string, el: Element | null): boolean {
    const t = text.trim()
    if (/^[(（][^()（）]+[)）]$/.test(t)) return true
    if (!styledAside(t, el)) return false
    return FIRST_PERSON.test(t.replace(/\*/g, '')) || /(\.\.\.|…|\?)\s*\**$/.test(t)
}

/** Short, capitalised, no sentence punctuation or quotes: "Seraphine Bell", "Lotte Krauss". */
function isNameTag(text: string): boolean {
    const t = text.trim()
    return t.length <= 40 && !t.includes('\n') && t.split(/\s+/).length <= 4 && /^\p{Lu}/u.test(t) && !/[.!?…,;:"“”«»「」()]/.test(t)
}

function splitLong(text: string): string[] {
    if (text.length <= MAX_LINE) return [text]
    const sentences = text.split(/(?<=[.!?…。！？»”"])\s+/)
    const out: string[] = []
    let cur = ''
    for (const s of sentences) {
        if (cur && (cur + ' ' + s).length > MAX_LINE) {
            out.push(cur)
            cur = s
        } else {
            cur = cur ? cur + ' ' + s : s
        }
    }
    if (cur) out.push(cur)
    return out
}

function bigImage(img: HTMLImageElement): boolean {
    const h = img.clientHeight || img.naturalHeight / 2
    return h >= 80
}

interface ReadState {
    bg: string | null
    sprite: string | null
    place: string | null
    /** Speaker named by the card's latest panel; cleared by the next picture. */
    panelSpeaker: string | null
    /** A picture was just shown and no line followed yet: a short text now is its name tag. */
    afterPicture: boolean
}

interface MessageResult {
    lines: { speaker: string | null; text: string; dialogue: boolean; italic: boolean; bg: string | null; sprite: string | null; place: string | null }[]
    choices: VnChoice[]
    formControls: number
    /** Panels, tables, thoughts and similar content left out of the novel. */
    skipped: number
}

function readCharMessage(body: Element, state: ReadState, fallbackSpeaker: string | null, fixed: HTMLElement[]): MessageResult {
    const result: MessageResult = { lines: [], choices: [], formControls: 0, skipped: 0 }
    const startBg = state.bg

    const pushLine = (speaker: string | null, text: string, dialogue: boolean, italic = false) => {
        for (const part of splitLong(text)) {
            result.lines.push({ speaker, text: part, dialogue, italic, bg: state.bg, sprite: state.sprite, place: state.place })
        }
    }

    const emit = (raw: string, el: Element | null) => {
        if (!raw) return
        if (isThought(raw, el)) {
            result.skipped++
            return
        }
        // A name tag under a character's picture (Argenta's panels without their own line).
        if (state.afterPicture && isNameTag(raw)) {
            state.panelSpeaker = raw
            state.afterPicture = false
            return
        }
        state.afterPicture = false
        const asideBlock = styledAside(raw, el)
        for (const line of raw.split('\n')) {
            const text = line.trim()
            if (!text || !/[\p{L}\p{N}]/u.test(text)) continue
            if (isThought(text, null)) {
                result.skipped++
                continue
            }
            if (asideBlock || styledAside(text, null)) {
                pushLine(null, text.replace(/^\*+|\*+$/g, '').trim(), false, true)
                continue
            }
            const named = NAMED.exec(text)
            if (named && named[1].split(/\s+/).length <= 4 && /^\p{Lu}/u.test(named[1])) {
                pushLine(named[1].replace(/\*+/g, '').trim(), named[2].trim(), true)
                continue
            }
            const quoted = (text.match(QUOTE) ?? []).join('').length
            const dialogue = quoted > text.length * 0.5
            pushLine(dialogue ? (state.panelSpeaker ?? fallbackSpeaker) : null, text, dialogue)
        }
    }

    const visit = (el: Element) => {
        if (SKIP_TAGS.has(el.tagName)) {
            if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && el.tagName !== 'TEMPLATE' && (el.textContent ?? '').trim()) result.skipped++
            return
        }
        if (FORM_TAGS.has(el.tagName)) {
            result.formControls++
            return
        }
        if (el.matches(CONTROL)) {
            const label = textOf(el) || el.getAttribute('title') || el.getAttribute('aria-label') || ''
            if (label && label.length <= 120 && !(el as HTMLButtonElement).disabled) {
                result.choices.push({ label, target: el as HTMLElement, utility: /^[\p{Extended_Pictographic}\p{S}]/u.test(label) })
            }
            return
        }
        const cs = getComputedStyle(el)
        if (cs.display === 'none') return
        if (cs.position === 'fixed') {
            fixed.push(el as HTMLElement)
            return
        }
        if (el.tagName === 'IMG') {
            const img = el as HTMLImageElement
            if (bigImage(img)) {
                state.sprite = img.currentSrc || img.src
                state.panelSpeaker = null
                state.afterPicture = true
            }
            return
        }
        const bg = cs.backgroundImage && cs.backgroundImage !== 'none' ? cssUrl(cs.backgroundImage) : null
        if (bg && (el as HTMLElement).clientHeight >= 140) state.bg = bg

        const cls = classOf(el)
        const short = (el.textContent ?? '').trim().length <= 60
        if (/name/i.test(cls) && short) {
            const name = firstText(el)
            if (name) state.panelSpeaker = name
            return
        }
        if (/place|location/i.test(cls) && short) {
            const place = firstText(el)
            if (place) state.place = place
            return
        }
        if (!el.querySelector(NOT_PROSE)) {
            emit(textOf(el), el)
            return
        }
        // Mixed content: loose text between blocks is read in order with the blocks.
        let loose = ''
        for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                loose += node.nodeValue ?? ''
            } else if (node instanceof Element) {
                if (node.tagName === 'BR') {
                    loose += '\n'
                    continue
                }
                if (!node.matches(NOT_PROSE) && !SKIP_TAGS.has(node.tagName) && !LABEL_CLASS.test(classOf(node))) {
                    loose += textOf(node)
                    continue
                }
                emit(loose.trim(), null)
                loose = ''
                visit(node)
            }
        }
        emit(loose.trim(), null)
    }

    for (const child of body.children) visit(child)

    // A reply often opens with narration and sets its scene with the first picture: the opening
    // lines belong to that scene, not to the previous one.
    const firstScene = result.lines.find((l) => l.bg && l.bg !== startBg)
    if (firstScene) {
        for (const line of result.lines) {
            if (line.bg !== startBg) break
            line.bg = firstScene.bg
            line.place = firstScene.place
        }
    }
    return result
}

export function readScene(
    root: HTMLElement,
    opts: { fallbackSpeaker: string | null; userName: string; maxMessages?: number }
): VnScene {
    const messages = [...root.querySelectorAll<HTMLElement>('.risu-chat[data-chat-index]')]
        .map((el) => ({ el, index: Number(el.dataset.chatIndex) }))
        .filter((m) => Number.isFinite(m.index))
        .sort((a, b) => a.index - b.index)
        .slice(-(opts.maxMessages ?? 4))

    const state: ReadState = { bg: null, sprite: null, place: null, panelSpeaker: null, afterPicture: false }
    const scene: VnScene = { beats: [], choices: [], newest: -Infinity, firstOfNewest: -1, ui: false, fixed: [], withHidden: new Set() }

    for (const [n, { el, index }] of messages.entries()) {
        const body = el.querySelector('.chattext')
        if (!body) continue
        const isNewest = n === messages.length - 1
        const role: 'char' | 'user' = el.querySelector('.risu-stage-user') ? 'user' : 'char'
        const first = scene.beats.length
        if (role === 'user') {
            const text = textOf(body)
            for (const part of splitLong(text)) {
                scene.beats.push({ key: `${index}:${scene.beats.length - first}`, message: index, role, speaker: opts.userName, text: part, dialogue: true, italic: false, bg: state.bg, sprite: state.sprite, place: state.place })
            }
        } else {
            state.panelSpeaker = null
            const read = readCharMessage(body, state, opts.fallbackSpeaker, scene.fixed)
            const ui = read.choices.length + read.formControls > UI_CONTROLS
            if (!ui) read.lines.forEach((line, i) => scene.beats.push({ key: `${index}:${i}`, message: index, role, ...line }))
            if (read.skipped > 0 || read.formControls > 0) scene.withHidden.add(index)
            if (isNewest) {
                scene.choices = ui ? [] : read.choices
                scene.ui = ui
            }
        }
        if (isNewest) {
            scene.newest = index
            scene.firstOfNewest = scene.beats.length > first ? first : -1
        }
    }
    return scene
}
