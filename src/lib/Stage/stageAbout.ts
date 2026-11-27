// "About this story": what a player expects to read before playing, taken from the card.
// Creator notes are often a README (stats, patch notes, module installs, settings tables), so the
// summary is the first narrative paragraph of the notes in the player's language; the full notes
// stay available, folded, on the story page.
import type { character, groupChat } from 'src/ts/storage/database.svelte'
import { parseMultilangString } from 'src/ts/util'

// Sections that are about the card file rather than the story.
const SKIP_HEADING = /patch|change ?log|update|history|module|asset|download|install|setting|config|option|recommend|copyright|licen[cs]e|credit|contact|notice|faq|known issue|bug|패치|업데이트|모듈|에셋|설정|권장|저작권|라이선스|문의|공지|パッチ|更新|設定|著作権|补丁|设置|版权/i

function plain(md: string): string {
    return md
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<details[\s\S]*?<\/details>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\{\{[\s\S]*?\}\}/g, ' ')
}

function isNarrative(p: string): boolean {
    const t = p.trim()
    if (t.length < 80) return false
    if (/^([-*+]|\d+[.)]|\||>|```)/.test(t)) return false // lists, tables, quotes, code
    if (/^\S{0,3}\s*\*\*/.test(t)) return false // "🖼 **5,468 assets** — ..." style stat lines
    if (/https?:\/\//.test(t) && t.length < 200) return false
    const letters = (t.match(/\p{L}/gu) ?? []).length
    return letters / t.length > 0.6
}

function cleanParagraph(p: string): string {
    return p
        .replace(/[*_`~]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

/** Notes text in the player's language, falling back to English, then to the first one. */
export function notesForLanguage(notes: string, lang: string): string {
    const byLang = parseMultilangString(notes ?? '')
    return byLang[lang] ?? byLang['en'] ?? byLang['xx'] ?? Object.values(byLang)[0] ?? ''
}

export function storySummary(char: character | groupChat, lang: string): string {
    const c = char as character
    const notes = notesForLanguage(c.creatorNotes ?? '', lang)

    const paragraphs: string[] = []
    let skipping = false
    for (const block of plain(notes).split(/\n\s*\n/)) {
        const lines = block.split('\n')
        const kept: string[] = []
        for (const line of lines) {
            const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/)
            if (heading) {
                skipping = SKIP_HEADING.test(heading[1])
                continue
            }
            if (!skipping) kept.push(line)
        }
        const text = kept.join('\n').trim()
        if (text && isNarrative(text)) paragraphs.push(cleanParagraph(text))
        if (paragraphs.length >= 2) break
    }
    if (paragraphs.length > 0) {
        const first = paragraphs[0]
        return first.length < 260 && paragraphs[1] ? first + '\n\n' + paragraphs[1] : first
    }

    // No narrative in the notes: a short description reads like a synopsis; long ones are prompts.
    const desc = cleanParagraph(plain(c.desc ?? ''))
    if (desc.length >= 20 && desc.length <= 600 && !/\{\{|you are|\{\{char\}\}/i.test(c.desc ?? '')) return desc
    return ''
}
