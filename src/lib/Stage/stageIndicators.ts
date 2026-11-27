// Optional indicators pinned above a playthrough (phase 8). Each reads either a chat variable
// (chat.scriptstate['$name'], with the card's default variables as fallback, the same lookup
// as Risu's getChatVar) or a piece of the last reply matched by a regex. They are saved in the
// character's extentions.risuStage.indicators, are exported with the card, and never touch prompts.
import type { Chat, character, groupChat } from 'src/ts/storage/database.svelte'
import { DBState } from 'src/ts/stores.svelte'
import { parseKeyValue } from 'src/ts/util'
import { persistCharacterEdit } from './stageSave.svelte'

export interface StageIndicator {
    id: string
    label: string
    source: 'var' | 'regex'
    /** Variable name (without $) or regex pattern. */
    key: string
    display: 'bar' | 'text'
    /** Upper bound for bars (default 100). */
    max?: number
}

type WithExtensions = { extentions?: { [key: string]: any } }

export function getIndicators(char: character | groupChat | undefined): StageIndicator[] {
    const list = (char as WithExtensions | undefined)?.extentions?.risuStage?.indicators
    return Array.isArray(list) ? list.filter((i) => i && typeof i.key === 'string') : []
}

export function setIndicators(char: character | groupChat, list: StageIndicator[]) {
    const target = char as WithExtensions
    const ext = { ...(target.extentions ?? {}) }
    const stage = { ...(ext.risuStage ?? {}) }
    if (list.length > 0) stage.indicators = list
    else delete stage.indicators
    if (Object.keys(stage).length > 0) ext.risuStage = stage
    else delete ext.risuStage
    target.extentions = ext
    persistCharacterEdit(char)
}

export function newIndicatorId() {
    return Math.random().toString(36).slice(2, 10)
}

/** Default values the card declares (and global template defaults), as Risu's getChatVar uses them. */
export function defaultVariables(char: character | groupChat | undefined): [string, string][] {
    const c = char as character | undefined
    return parseKeyValue(c?.defaultVariables ?? '').concat(parseKeyValue(DBState.db.templateDefaultVariables ?? ''))
}

/** Every variable of a playthrough: set ones first, then defaults that were not set yet. */
export function listVariables(char: character | groupChat | undefined, chat: Chat | undefined) {
    const set = Object.entries(chat?.scriptstate ?? {})
        .filter(([k]) => k.startsWith('$'))
        .map(([k, v]) => ({ name: k.slice(1), value: String(v), isDefault: false }))
    const seen = new Set(set.map((v) => v.name))
    const defaults = defaultVariables(char)
        .filter(([k]) => !seen.has(k))
        .map(([k, v]) => ({ name: k, value: v, isDefault: true }))
    return [...set, ...defaults].sort((a, b) => Number(a.isDefault) - Number(b.isDefault) || a.name.localeCompare(b.name))
}

function lastReply(chat: Chat | undefined): string {
    const messages = chat?.message ?? []
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'char') return messages[i].data ?? ''
    }
    return ''
}

export function readIndicator(ind: StageIndicator, char: character | groupChat | undefined, chat: Chat | undefined): string {
    if (ind.source === 'var') {
        const raw = chat?.scriptstate?.['$' + ind.key]
        if (raw !== undefined && raw !== null) return String(raw)
        return defaultVariables(char).find(([k]) => k === ind.key)?.[1] ?? ''
    }
    try {
        const m = new RegExp(ind.key, 'i').exec(lastReply(chat))
        return m ? (m[1] ?? m[0]).trim() : ''
    } catch {
        return ''
    }
}

/** 0..1 for bars, or null when the value is not a number. */
export function barRatio(value: string, max?: number): number | null {
    const n = parseFloat(value)
    if (!Number.isFinite(n)) return null
    const top = max && max > 0 ? max : 100
    return Math.min(1, Math.max(0, n / top))
}

export function isValidPattern(pattern: string): boolean {
    try {
        new RegExp(pattern)
        return true
    } catch {
        return false
    }
}
