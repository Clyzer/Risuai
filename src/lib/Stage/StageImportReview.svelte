<script lang="ts">
    // Review page shown after picking a card with the Stage "+" and before anything is saved.
    import {
        AlertTriangleIcon,
        BookOpenIcon,
        BracesIcon,
        CheckIcon,
        DownloadIcon,
        ImageIcon,
        KeyRoundIcon,
        LayoutTemplateIcon,
        LinkIcon,
        SparklesIcon,
        XIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { stageNav } from './stageNav.svelte'
    import { closeReview, confirmImport } from './stageActions'
    import type { StageKind } from './stageKinds'

    let review = $derived(stageNav.importReview)
    let p = $derived(review?.preview)
    let kind = $state<StageKind>('story')
    let linkIds = $state<string[]>([])
    let busy = $state(false)

    $effect(() => {
        if (p) {
            kind = p.kind
            linkIds = p.suggestedModules.map((m) => m.id)
        }
    })

    function reasonText(r: { key: string; n?: number }) {
        const L = language.stage
        switch (r.key) {
            case 'lua':
                return L.reasonLua
            case 'ownUi':
                return L.reasonOwnUi
            case 'openings':
                return L.reasonOpenings.replace('{}', String(r.n))
            case 'lore':
                return L.reasonLore.replace('{}', String(r.n))
            default:
                return L.reasonSimple
        }
    }

    function size(bytes: number) {
        return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
    }

    async function doImport() {
        if (busy) return
        busy = true
        try {
            await confirmImport(kind, linkIds)
        } finally {
            busy = false
        }
    }
</script>

{#if review && p}
    <div class="stage-review">
        <header class="stage-review-top">
            <button class="stage-icon-btn" aria-label={language.cancel} onclick={closeReview}><XIcon size={22} /></button>
            <b>{language.stage.reviewImport}</b>
        </header>

        <div class="stage-review-body">
            <div class="stage-review-hero">
                {#if p.coverUrl}
                    <img src={p.coverUrl} alt="" />
                {:else}
                    <span class="stage-review-nocover"></span>
                {/if}
                <div>
                    <small>{p.fileName} · {size(p.size)}</small>
                    <h3>{p.name}</h3>
                    {#if p.creator || p.version}
                        <small>{[p.version && 'v' + String(p.version).replace(/^v/i, ''), p.creator].filter(Boolean).join(' · ')}</small>
                    {/if}
                </div>
            </div>

            {#if p.summary}
                {#each p.summary.split('\n\n') as paragraph}
                    <p class="stage-review-summary">{paragraph}</p>
                {/each}
            {/if}

            <div class="stage-section-title">{language.stage.showIn}</div>
            <div class="stage-review-kind" role="radiogroup" aria-label={language.stage.showIn}>
                <button role="radio" aria-checked={kind === 'story'} class:on={kind === 'story'} onclick={() => (kind = 'story')}>{language.stage.stories}</button>
                <button role="radio" aria-checked={kind === 'chat'} class:on={kind === 'chat'} onclick={() => (kind = 'chat')}>{language.stage.chats}</button>
            </div>
            <ul class="stage-review-why">
                {#each p.reasons as r}
                    <li><CheckIcon size={16} /><span>{reasonText(r)}</span></li>
                {/each}
            </ul>

            <div class="stage-section-title">{language.stage.contents}</div>
            <div class="stage-review-rows">
                <div><SparklesIcon size={18} /><span>{p.ownStartMenu ? language.stage.contentOwnMenu : language.stage.contentOpenings.replace('{}', String(p.openings))}</span></div>
                <div><BookOpenIcon size={18} /><span>{language.stage.contentLore.replace('{}', String(p.lore))}</span></div>
                {#if p.usesLua || p.regex > 0}
                    <div><BracesIcon size={18} /><span>{[p.usesLua ? language.stage.contentLua : '', p.regex > 0 ? language.stage.contentRegex.replace('{}', String(p.regex)) : ''].filter(Boolean).join(' · ')}</span></div>
                {/if}
                {#if p.ownUi}
                    <div><LayoutTemplateIcon size={18} /><span>{language.stage.contentOwnUi}</span></div>
                {/if}
                <div><ImageIcon size={18} /><span>{language.stage.contentImages.replace('{}', String(p.images))}</span></div>
            </div>

            {#if p.notesMentionModule || p.suggestedModules.length > 0 || p.lowLevel}
                <div class="stage-section-title">{language.stage.needs}</div>
            {/if}
            {#each p.suggestedModules as m (m.id)}
                <label class="stage-review-mod">
                    <input type="checkbox" checked={linkIds.includes(m.id)} onchange={(e) => {
                        const on = (e.currentTarget as HTMLInputElement).checked
                        linkIds = on ? [...linkIds, m.id] : linkIds.filter((x) => x !== m.id)
                    }} />
                    <span class="stage-review-mod-ic"><LinkIcon size={16} /></span>
                    <span class="stage-review-mod-text"><b>{m.name}</b><small>{language.stage.linkOnImport} · {m.assetCount.toLocaleString()} {language.stage.images}</small></span>
                </label>
            {/each}
            {#if p.notesMentionModule && p.suggestedModules.length === 0}
                <div class="stage-review-warn"><AlertTriangleIcon size={18} /><span><b>{language.stage.moduleMissingTitle}</b> {language.stage.moduleMissingBody}</span></div>
            {/if}
            {#if p.lowLevel}
                <div class="stage-review-warn"><KeyRoundIcon size={18} /><span>{language.stage.lowLevelImport}</span></div>
            {/if}
        </div>

        <div class="stage-review-cta">
            <button class="stage-review-cancel" onclick={closeReview}>{language.cancel}</button>
            <button class="stage-review-go" disabled={busy} onclick={doImport}>
                <DownloadIcon size={18} />{kind === 'story' ? language.stage.importToHome : language.stage.importToChats}
            </button>
        </div>
    </div>
{/if}

<style>
    .stage-review {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--stage-bg);
    }
    .stage-review-top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 58px;
        padding: env(safe-area-inset-top, 0px) 12px 0 4px;
        border-bottom: 1px solid var(--stage-line);
    }
    .stage-review-top b {
        font-size: 18px;
    }
    .stage-review-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 16px 16px 24px;
    }
    .stage-review-hero {
        display: flex;
        align-items: flex-end;
        gap: 14px;
    }
    .stage-review-hero img,
    .stage-review-nocover {
        flex: none;
        width: 108px;
        height: 144px;
        border-radius: 12px;
        object-fit: cover;
        object-position: 50% 20%;
        background: var(--stage-surface);
    }
    .stage-review-hero div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .stage-review-hero small {
        font-size: 13px;
        color: var(--stage-muted);
        overflow-wrap: anywhere;
    }
    .stage-review-hero h3 {
        margin: 2px 0;
        font-size: 22px;
        font-weight: 800;
        text-wrap: balance;
    }
    .stage-review-summary {
        margin: 14px 0 0;
        font-size: 15px;
        line-height: 1.6;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 88%, transparent);
    }
    .stage-section-title {
        padding: 20px 0 8px;
        font-size: 14px;
        font-weight: 600;
        color: var(--stage-muted);
    }
    .stage-review-kind {
        display: flex;
        padding: 4px;
        border-radius: 999px;
        background: var(--stage-surface);
    }
    .stage-review-kind button {
        flex: 1;
        height: 40px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .stage-review-kind button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .stage-review-why {
        list-style: none;
        margin: 10px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 80%, transparent);
    }
    .stage-review-why li {
        display: flex;
        gap: 8px;
        align-items: flex-start;
    }
    .stage-review-why :global(svg) {
        flex: none;
        margin-top: 2px;
        color: #34c77b;
    }
    .stage-review-rows {
        display: flex;
        flex-direction: column;
    }
    .stage-review-rows div {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        font-size: 15px;
    }
    .stage-review-rows :global(svg) {
        flex: none;
        color: var(--stage-muted);
    }
    .stage-review-mod {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        margin-bottom: 8px;
        border-radius: 14px;
        background: var(--stage-surface);
        cursor: pointer;
    }
    .stage-review-mod input {
        width: 20px;
        height: 20px;
        accent-color: var(--stage-accent);
    }
    .stage-review-mod-ic {
        flex: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--stage-raised);
    }
    .stage-review-mod-text {
        min-width: 0;
        display: flex;
        flex-direction: column;
    }
    .stage-review-mod-text b {
        font-size: 15px;
        overflow-wrap: anywhere;
    }
    .stage-review-mod-text small {
        font-size: 13px;
        color: var(--stage-muted);
    }
    .stage-review-warn {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 8px;
        padding: 12px 14px;
        border-radius: 14px;
        background: color-mix(in oklab, #ffb84d 12%, var(--stage-bg));
        color: color-mix(in oklab, #ffcf85 85%, var(--risu-theme-textcolor));
        font-size: 14px;
        line-height: 1.45;
    }
    .stage-review-warn :global(svg) {
        flex: none;
        margin-top: 1px;
    }
    .stage-review-cta {
        flex: none;
        display: grid;
        grid-template-columns: 1fr 1.6fr;
        gap: 10px;
        padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid var(--stage-line);
    }
    .stage-review-cancel,
    .stage-review-go {
        height: 52px;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    .stage-review-cancel {
        background: var(--stage-surface);
    }
    .stage-review-go {
        background: var(--stage-accent);
        color: #fff;
    }
    .stage-review-go:disabled {
        opacity: 0.6;
    }
</style>
