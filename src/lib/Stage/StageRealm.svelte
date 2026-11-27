<script lang="ts">
    // Realm, Stage's way: search, sort, adult content toggle and a grid of covers, then a card page
    // with Download. Uses Risu's own Realm helpers (getRisuHub, which already drops blocked
    // creators, and downloadRisuHub, which asks for the terms and imports with Risu's importer;
    // the new story then opens on its page).
    import { BookOpenIcon, DownloadIcon, ExternalLinkIcon, ImageIcon, SearchIcon, SmileIcon } from '@lucide/svelte'
    import { onMount } from 'svelte'
    import { language } from 'src/lang'
    import { RealmInitialOpenChar } from 'src/ts/stores.svelte'
    import { downloadRisuHub, getRisuHub, hubURL, type hubType } from 'src/ts/characterCards'
    import StagePage from './StagePage.svelte'

    const SORTS: { value: string; label: () => string }[] = [
        { value: 'recommended', label: () => language.recommended },
        { value: '', label: () => language.recent },
        { value: 'trending', label: () => language.trending },
        { value: 'downloads', label: () => language.downloads },
        { value: 'random', label: () => language.stage.random },
    ]

    let query = $state('')
    let sort = $state('recommended')
    let nsfw = $state(false)
    let page = $state(0)
    let items = $state.raw<hubType[]>([])
    let loading = $state(false)
    let done = $state(false)
    let detail = $state.raw<hubType | null>(null)
    let request = 0
    let typing: ReturnType<typeof setTimeout> | null = null

    async function load(reset: boolean) {
        const mine = ++request
        if (reset) {
            page = 0
            done = false
        }
        loading = true
        // Searching with "recommended" or "random" lists by date, as Risu's Realm does.
        const effectiveSort = query.trim() && (sort === 'recommended' || sort === 'random') ? '' : sort
        const cards = await getRisuHub({ search: query.trim(), page, nsfw, sort: effectiveSort })
        if (mine !== request) return
        loading = false
        items = reset ? cards : [...items, ...cards.filter((c) => !items.some((i) => i.id === c.id))]
        if (cards.length === 0) done = true
    }

    function more() {
        page += 1
        load(false)
    }

    function onType() {
        if (typing) clearTimeout(typing)
        typing = setTimeout(() => load(true), 450)
    }

    function plain(text: string) {
        return (text ?? '').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim()
    }

    function cover(card: hubType) {
        return `${hubURL}/resource/${card.img}`
    }

    onMount(() => {
        load(true)
        // Opened from a Realm link.
        return RealmInitialOpenChar.subscribe((card) => {
            if (card) {
                detail = card
                RealmInitialOpenChar.set(null)
            }
        })
    })

    async function download(card: hubType) {
        await downloadRisuHub(card.id, { creator: card.creator })
    }
</script>

<div class="stage-scroll">
    <header class="stage-head">
        <h1>{language.stage.realm}</h1>
        <button class="sr-nsfw" class:on={nsfw} aria-pressed={nsfw} onclick={() => ((nsfw = !nsfw), load(true))}>{nsfw ? 'NSFW' : 'SFW'}</button>
    </header>

    <label class="stage-search">
        <SearchIcon size={18} />
        <input type="search" bind:value={query} oninput={onType} onkeydown={(e) => e.key === 'Enter' && load(true)} placeholder={language.stage.searchRealm} autocomplete="off" />
    </label>

    <div class="sr-sorts">
        {#each SORTS as s}
            <button class:on={sort === s.value} onclick={() => ((sort = s.value), load(true))}>{s.label()}</button>
        {/each}
    </div>

    {#if items.length === 0 && !loading}
        <p class="stage-lead">{language.stage.realmEmpty}</p>
    {/if}

    <div class="sr-grid">
        {#each items as card (card.id)}
            <button class="sr-card" onclick={() => (detail = card)}>
                <img src={cover(card)} alt="" loading="lazy" decoding="async" />
                <span class="sr-card-text">
                    <b>{card.name}</b>
                    {#if card.authorname || card.creatorName}<small>{card.authorname ?? card.creatorName}</small>{/if}
                </span>
            </button>
        {/each}
        {#if loading}
            {#each Array(items.length ? 2 : 6) as _}<span class="sr-card sr-skeleton" aria-hidden="true"></span>{/each}
        {/if}
    </div>

    {#if items.length > 0 && !done && !loading}
        <div class="stage-btns"><button class="stage-btn block" onclick={more}>{language.stage.loadMore}</button></div>
    {/if}
</div>

{#if detail}
    {@const card = detail}
    <StagePage title={card.name} close={() => (detail = null)}>
        <img class="sr-hero" src={cover(card)} alt="" />
        <h2 class="sr-name">{card.name}</h2>
        {#if card.authorname || card.creatorName}<p class="sr-by">{language.stage.byAuthor.replace('{}', card.authorname ?? card.creatorName ?? '')}</p>{/if}
        <div class="sr-badges">
            {#if card.hasLore}<span><BookOpenIcon size={14} />{language.stage.loreEntries}</span>{/if}
            {#if card.hasEmotion}<span><SmileIcon size={14} />{language.stage.realmEmotions}</span>{/if}
            {#if card.hasAsset}<span><ImageIcon size={14} />{language.stage.images}</span>{/if}
            {#if card.hot}<span><DownloadIcon size={14} />{card.hot}</span>{/if}
        </div>
        {#if card.tags?.length}
            <div class="sr-tags">{#each card.tags.slice(0, 16) as tag}<span>{tag}</span>{/each}</div>
        {/if}
        <p class="sr-desc">{plain(card.desc)}</p>
        {#if card.license}<p class="stage-note">{language.stage.realmLicense}: {card.license}</p>{/if}
        <div class="stage-btns">
            <button class="stage-btn primary" onclick={() => download(card)}><DownloadIcon size={18} />{language.stage.download}</button>
            <button class="stage-btn" onclick={() => window.open(`https://realm.risuai.net/character/${card.id}`, '_blank', 'noopener')}><ExternalLinkIcon size={18} />{language.stage.openOnWeb}</button>
        </div>
    </StagePage>
{/if}

<style>
    .sr-nsfw {
        min-height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        background: var(--stage-surface);
        font-size: 13px;
        font-weight: 800;
        color: var(--stage-muted);
    }
    .sr-nsfw.on {
        background: color-mix(in oklab, #e5484d 30%, transparent);
        color: #ffb3b3;
    }
    .sr-sorts {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        margin: 0 -16px 14px;
        padding: 0 16px;
        scrollbar-width: none;
    }
    .sr-sorts::-webkit-scrollbar {
        display: none;
    }
    .sr-sorts button {
        flex: none;
        min-height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        background: var(--stage-surface);
        font-size: 14px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .sr-sorts button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .sr-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
    }
    @media (min-width: 560px) {
        .sr-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }
    .sr-card {
        position: relative;
        display: block;
        aspect-ratio: 3 / 4;
        border-radius: 16px;
        overflow: hidden;
        background: var(--stage-surface);
        text-align: left;
    }
    .sr-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 50% 20%;
    }
    .sr-card-text {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 28px 10px 10px;
        background: linear-gradient(transparent, rgb(0 0 0 / 0.78));
        color: #fff;
    }
    .sr-card-text b {
        font-size: 14px;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .sr-card-text small {
        font-size: 12px;
        opacity: 0.8;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .sr-skeleton {
        animation: sr-pulse 1.2s ease-in-out infinite;
    }
    @keyframes sr-pulse {
        50% {
            opacity: 0.5;
        }
    }
    .sr-hero {
        display: block;
        width: 100%;
        max-height: 60vh;
        object-fit: contain;
        border-radius: 18px;
        background: var(--stage-surface);
    }
    .sr-name {
        margin: 14px 0 2px;
        font-size: 24px;
        font-weight: 800;
    }
    .sr-by {
        margin: 0 0 10px;
        color: var(--stage-muted);
    }
    .sr-badges,
    .sr-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
    }
    .sr-badges span,
    .sr-tags span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--stage-surface);
        font-size: 12px;
        color: var(--stage-muted);
    }
    .sr-desc {
        margin: 6px 0 0;
        font-size: 15px;
        line-height: 1.55;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    @media (prefers-reduced-motion: reduce) {
        .sr-skeleton {
            animation: none;
        }
    }
</style>
