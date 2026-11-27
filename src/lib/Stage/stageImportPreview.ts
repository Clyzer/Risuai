// Reads a character card file before importing it, without saving anything: no assets are
// written and the database is untouched. The import itself is Risu's own importCharacterProcess.
import { unzipSync } from 'fflate'
import { PngChunk } from 'src/ts/pngChunk'
import { decodeRPack } from 'src/ts/rpack/rpack_js'
import { DBState } from 'src/ts/stores.svelte'
import { detectedKind, type StageKind } from './stageKinds'
import { storySummary } from './stageAbout'
import { hasOwnStartMenu } from './stageStarts'
import { storyRequirements, type StageModuleInfo } from './stageRequirements'

export interface ImportPreview {
    fileName: string
    size: number
    name: string
    creator: string
    version: string
    tags: string[]
    summary: string
    coverUrl: string | null
    kind: StageKind
    reasons: { key: string; n?: number }[]
    openings: number
    ownStartMenu: boolean
    lore: number
    regex: number
    usesLua: boolean
    ownUi: boolean
    images: number
    lowLevel: boolean
    notesMentionModule: boolean
    suggestedModules: StageModuleInfo[]
}

export type FileRoute = 'character' | 'module' | 'preset' | 'unknown'

export function routeOf(fileName: string): FileRoute {
    const n = fileName.toLowerCase()
    if (n.endsWith('.risum')) return 'module'
    if (n.endsWith('.risup') || n.endsWith('.risupreset')) return 'preset'
    if (/\.(charx|png|json|jpe?g)$/.test(n)) return 'character'
    return 'unknown'
}

function decodeBase64Json(value: string): any {
    const bin = atob(value)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
}

async function decodeModule(buf: Uint8Array): Promise<any | null> {
    try {
        if (buf[0] !== 111 || buf[1] !== 0) return null
        const len = buf[2] | (buf[3] << 8) | (buf[4] << 16) | (buf[5] << 24)
        const main = await decodeRPack(buf.subarray(6, 6 + len))
        const parsed = JSON.parse(new TextDecoder().decode(main))
        return parsed?.type === 'risuModule' ? parsed.module : null
    } catch {
        return null
    }
}

/** Card data (v2 or v3 `data` object), embedded module, and a cover image, from any supported file. */
async function readCard(file: File): Promise<{ data: any; module: any | null; cover: Blob | null } | null> {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const name = file.name.toLowerCase()
    if (name.endsWith('.json')) {
        const parsed = JSON.parse(new TextDecoder().decode(bytes))
        return { data: parsed.data ?? parsed, module: null, cover: null }
    }
    if (name.endsWith('.png')) {
        const chunks = PngChunk.read(bytes, ['ccv3', 'chara'])
        const raw = chunks.ccv3 ?? chunks.chara
        if (!raw) return null
        const parsed = decodeBase64Json(raw)
        return { data: parsed.data ?? parsed, module: null, cover: file }
    }
    // .charx (zip), also charx appended to a jpeg
    const meta = unzipSync(bytes, { filter: (f) => f.name === 'card.json' || f.name === 'module.risum' })
    if (!meta['card.json']) return null
    const card = JSON.parse(new TextDecoder().decode(meta['card.json']))
    const data = card.data ?? card
    const module = meta['module.risum'] ? await decodeModule(meta['module.risum']) : null
    let cover: Blob | null = null
    const icon = (data.assets ?? []).find((a: any) => a?.type === 'icon' && (a.name === 'main' || !a.name)) ?? (data.assets ?? []).find((a: any) => a?.type === 'icon')
    const iconPath = typeof icon?.uri === 'string' && icon.uri.startsWith('embeded://') ? icon.uri.slice('embeded://'.length) : null
    if (iconPath) {
        const img = unzipSync(bytes, { filter: (f) => f.name === iconPath })[iconPath]
        if (img) cover = new Blob([img])
    } else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
        cover = file
    }
    return { data, module, cover }
}

export async function previewCard(file: File): Promise<ImportPreview | null> {
    try {
        const read = await readCard(file)
        if (!read) return null
        const { data, module, cover } = read
        const risu = data.extensions?.risuai ?? {}
        const triggers = risu.triggerscript?.length ? risu.triggerscript : module?.trigger ?? []
        const regex = (risu.customScripts?.length ? risu.customScripts : module?.regex ?? []).length
        const lore = Math.max(data.character_book?.entries?.length ?? 0, module?.lorebook?.length ?? 0)
        const assets = (data.assets ?? []).filter((a: any) => a?.type !== 'icon').length

        // A stand-in character so the same rules as the story page apply.
        const pseudo: any = {
            type: 'character',
            name: data.name ?? file.name,
            desc: data.description ?? '',
            firstMessage: data.first_mes ?? '',
            alternateGreetings: data.alternate_greetings ?? [],
            creatorNotes: data.creator_notes ?? '',
            triggerscript: triggers,
            backgroundHTML: risu.backgroundHTML ?? '',
            globalLore: new Array(lore),
            modules: [],
            lowLevelAccess: !!risu.lowLevelAccess || !!module?.lowLevelAccess || triggers.some((t: any) => t?.lowLevelAccess),
        }
        const usesLua = triggers.some((t: any) => t?.effect?.some((e: any) => e?.type === 'triggerlua'))
        const ownUi = (pseudo.backgroundHTML ?? '').trim().length > 0
        const openings = 1 + pseudo.alternateGreetings.filter((g: string) => g?.trim()).length
        const reasons: { key: string; n?: number }[] = []
        if (usesLua) reasons.push({ key: 'lua' })
        if (ownUi) reasons.push({ key: 'ownUi' })
        if (openings > 2) reasons.push({ key: 'openings', n: openings })
        if (lore >= 15) reasons.push({ key: 'lore', n: lore })
        const kind = detectedKind(pseudo)
        if (kind === 'chat') reasons.push({ key: 'simple' })
        const req = storyRequirements(pseudo, DBState.db.modules ?? [], DBState.db.enabledModules ?? [])

        return {
            fileName: file.name,
            size: file.size,
            name: pseudo.name,
            creator: data.creator ?? '',
            version: data.character_version ?? '',
            tags: data.tags ?? [],
            summary: storySummary(pseudo, DBState.db.language),
            coverUrl: cover ? URL.createObjectURL(cover) : null,
            kind,
            reasons,
            openings,
            ownStartMenu: hasOwnStartMenu(pseudo),
            lore,
            regex,
            usesLua,
            ownUi,
            images: assets,
            lowLevel: pseudo.lowLevelAccess,
            notesMentionModule: req.notesMentionModule,
            suggestedModules: req.suggested,
        }
    } catch (error) {
        console.error('[Stage] could not preview', error)
        return null
    }
}
