<script lang="ts">
    import {
        AlertTriangleIcon,
        ArrowLeftIcon,
        BlocksIcon,
        CheckIcon,
        ChevronRightIcon,
        GitBranchIcon,
        KeyRoundIcon,
        LinkIcon,
        PlayIcon,
        PlusIcon,
        SparklesIcon,
        UploadIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import type { character } from 'src/ts/storage/database.svelte'
    import MultiLangDisplay from '../UI/GUI/MultiLangDisplay.svelte'
    import { ParseMarkdown } from 'src/ts/parser/parser.svelte'
    import { parseMultilangString } from 'src/ts/util'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import StageCover from './StageCover.svelte'
    import { stageNav } from './stageNav.svelte'
    import { listPlaythroughs, timeAgo } from './stageData'
    import { storyRequirements } from './stageRequirements'
    import { continueStory, importModuleForStory, linkModule, startNewPlaythrough, unlinkMissingModules } from './stageActions'
    import { changeChar } from 'src/ts/characters'
    import { startMode } from './stageStarts'
    import { isKindOverridden, setStageKind, stageKind } from './stageKinds'

    interface Props {
        index: number
    }

    let { index }: Props = $props()

    let char = $derived(DBState.db.characters[index] as character)
    let req = $derived(char ? storyRequirements(char, DBState.db.modules ?? [], DBState.db.enabledModules ?? []) : null)
    let playthroughs = $derived(listPlaythroughs(DBState.db.characters).filter((p) => p.charIndex === index))
    let ownImages = $derived((char?.additionalAssets?.length ?? 0) + (char?.emotionImages?.length ?? 0))
    let moduleImages = $derived((req?.linked ?? []).concat(req?.global ?? []).reduce((n, m) => n + m.assetCount, 0))
    let hasPlayed = $derived(playthroughs.length > 0)
    let mode = $derived(char ? startMode(char) : 'single')
    let kind = $derived(char ? stageKind(char) : 'story')
    let kindOverridden = $derived(char ? isKindOverridden(char) : false)
    // Notes written in one language get no language tabs (MultiLangDisplay would show "Unknown Language").
    let multiLangNotes = $derived(Object.keys(parseMultilangString(char?.creatorNotes ?? '')).some((k) => k !== 'xx'))
    let greetingCount = $derived(1 + (char?.alternateGreetings ?? []).filter((g) => g?.trim()).length)

    function newPlaythrough() {
        if (mode === 'greetings') stageNav.startPicker = index
        else startNewPlaythrough(index)
    }

    function back() {
        stageNav.detail = null
    }

    function openPlaythrough(chatIndex: number) {
        DBState.db.characters[index].chatPage = chatIndex
        changeChar(index)
    }
</script>

{#if char && req}
    <div class="stage-detail">
        <div class="stage-detail-scroll">
            <div class="stage-detail-hero">
                <StageCover image={char.image} />
                <span class="stage-detail-shade"></span>
                <button class="stage-detail-back" aria-label={language.stage.back} onclick={back}>
                    <ArrowLeftIcon size={22} />
                </button>
                <div class="stage-detail-title">
                    {#if char.creator || char.characterVersion}
                        <small>{[char.characterVersion && 'v' + char.characterVersion.replace(/^v/i, ''), char.creator].filter(Boolean).join(' · ')}</small>
                    {/if}
                    <h2>{char.name}</h2>
                    {#if char.tags?.length}<span>{char.tags.slice(0, 4).join(' · ')}</span>{/if}
                </div>
            </div>

            <div class="stage-detail-body">
                <div class="stage-facts">
                    <div><b>{playthroughs.length}</b><span>{language.stage.playthroughs.toLocaleLowerCase()}</span></div>
                    <div><b>{char.globalLore?.length ?? 0}</b><span>{language.stage.loreEntries}</span></div>
                    <div><b>{(ownImages + moduleImages).toLocaleString()}</b><span>{language.stage.images}</span></div>
                </div>

                <div class="stage-section-title">{language.stage.showIn}</div>
                <div class="stage-kind" role="radiogroup" aria-label={language.stage.showIn}>
                    <button role="radio" aria-checked={kind === 'story'} class:on={kind === 'story'} onclick={() => setStageKind(DBState.db.characters[index], 'story')}>{language.stage.stories}</button>
                    <button role="radio" aria-checked={kind === 'chat'} class:on={kind === 'chat'} onclick={() => setStageKind(DBState.db.characters[index], 'chat')}>{language.stage.chats}</button>
                </div>
                <p class="stage-note"><span>{kindOverridden ? language.stage.kindChosen : language.stage.kindDetected}</span></p>

                <div class="stage-section-title">{language.stage.howToStart}</div>
                {#if mode === 'ownMenu'}
                    <div class="stage-req start">
                        <span class="stage-req-ic"><SparklesIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{language.stage.ownStartTitle}</b>
                            <small>{language.stage.ownStartBody}</small>
                        </div>
                    </div>
                {:else if mode === 'greetings'}
                    <button class="stage-req start action" onclick={newPlaythrough}>
                        <span class="stage-req-ic"><SparklesIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{language.stage.chooseStart}</b>
                            <small>{language.stage.greetingsStartBody.replace('{}', String(greetingCount))}</small>
                        </div>
                        <ChevronRightIcon size={18} />
                    </button>
                {:else}
                    <div class="stage-req start">
                        <span class="stage-req-ic"><SparklesIcon size={18} /></span>
                        <div class="stage-req-text"><small>{language.stage.singleStartBody}</small></div>
                    </div>
                {/if}

                <div class="stage-section-title">{language.stage.needs}</div>

                {#if req.missingLinked.length > 0}
                    <div class="stage-req warn">
                        <span class="stage-req-ic"><AlertTriangleIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{language.stage.moduleDeletedTitle}</b>
                            <small>{language.stage.moduleDeletedBody.replace('{}', String(req.missingLinked.length))}</small>
                        </div>
                        <button class="stage-chip" onclick={() => unlinkMissingModules(index, req.missingLinked)}>{language.stage.removeLink}</button>
                    </div>
                {/if}

                {#each req.linked as m (m.id)}
                    <div class="stage-req ok">
                        <span class="stage-req-ic"><CheckIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{m.name}</b>
                            <small>{language.stage.moduleLinkedRow.replace('{}', m.assetCount.toLocaleString())}</small>
                        </div>
                    </div>
                {/each}

                {#each req.global as m (m.id)}
                    <div class="stage-req ok">
                        <span class="stage-req-ic"><CheckIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{m.name}</b>
                            <small>{language.stage.moduleGlobalRow.replace('{}', m.assetCount.toLocaleString())}</small>
                        </div>
                    </div>
                {/each}

                {#each req.suggested as m (m.id)}
                    <div class="stage-req warn">
                        <span class="stage-req-ic"><LinkIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{m.name}</b>
                            <small>{language.stage.moduleSuggestTitle} · {language.stage.moduleSuggestBody}</small>
                        </div>
                        <button class="stage-chip on" onclick={() => linkModule(index, m.id)}>{language.stage.linkModule}</button>
                    </div>
                {/each}

                {#if req.notesMentionModule && req.linked.length === 0 && req.global.length === 0 && req.suggested.length === 0}
                    <div class="stage-req warn">
                        <span class="stage-req-ic"><AlertTriangleIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{language.stage.moduleMissingTitle}</b>
                            <small>{language.stage.moduleMissingBody}</small>
                        </div>
                    </div>
                {/if}

                {#if req.notesMentionModule || req.linked.length > 0}
                    <button class="stage-req action" onclick={() => importModuleForStory(index)}>
                        <span class="stage-req-ic"><UploadIcon size={18} /></span>
                        <div class="stage-req-text"><b>{language.stage.importModule}</b><small>.risum</small></div>
                        <ChevronRightIcon size={18} />
                    </button>
                {/if}

                {#if req.lowLevelAccess}
                    <div class="stage-req">
                        <span class="stage-req-ic"><KeyRoundIcon size={18} /></span>
                        <div class="stage-req-text">
                            <b>{language.stage.lowLevelTitle}</b>
                            <small>{language.stage.lowLevelBody}</small>
                        </div>
                    </div>
                {/if}

                {#if !req.needsAttention && req.linked.length === 0 && !req.lowLevelAccess}
                    <div class="stage-req ok">
                        <span class="stage-req-ic"><CheckIcon size={18} /></span>
                        <div class="stage-req-text"><b>{language.stage.allGood}</b></div>
                    </div>
                {/if}
                <p class="stage-note"><BlocksIcon size={14} /><span>{language.stage.detectNote}</span></p>

                {#if playthroughs.length > 0}
                    <div class="stage-section-title">{language.stage.yourPlaythroughs}</div>
                    {#each playthroughs as p (p.chatIndex)}
                        <button class="stage-pt" onclick={() => openPlaythrough(p.chatIndex)}>
                            <span class="stage-pt-ic"><PlayIcon size={16} /></span>
                            <span class="stage-pt-text">
                                <b>{#if p.isBranch}<GitBranchIcon size={14} />{/if}{p.chatName}</b>
                                <small>{[p.lastDate ? timeAgo(p.lastDate) : '', p.messageCount > 0 ? String(p.messageCount) : ''].filter(Boolean).join(' · ')}</small>
                            </span>
                            <ChevronRightIcon size={18} />
                        </button>
                    {/each}
                {/if}

                {#if char.creatorNotes}
                    <div class="stage-section-title">{language.stage.about}</div>
                    <div class="stage-notes">
                        {#if multiLangNotes}
                            <MultiLangDisplay value={char.creatorNotes} markdown={true} />
                        {:else}
                            <div class="max-w-full wrap-break-word text chat chattext prose" class:prose-invert={$ColorSchemeTypeStore}>
                                {#await ParseMarkdown(char.creatorNotes) then md}
                                    {@html md}
                                {/await}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>

        <div class="stage-detail-cta" class:single={!hasPlayed}>
            {#if hasPlayed}
                <button class="stage-btn2" onclick={newPlaythrough}>
                    <PlusIcon size={18} />{language.stage.newPlaythrough}
                </button>
                <button class="stage-cta" onclick={() => continueStory(index)}>
                    <PlayIcon size={18} fill="currentColor" />{language.stage.continue}
                </button>
            {:else}
                <button class="stage-cta" onclick={newPlaythrough}>
                    <PlayIcon size={18} fill="currentColor" />{language.stage.play}
                </button>
            {/if}
        </div>
    </div>
{/if}

<style>
    .stage-detail {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--stage-bg);
    }
    .stage-detail-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
    }
    .stage-detail-hero {
        position: relative;
        aspect-ratio: 4 / 3;
        max-height: 56vh;
        width: 100%;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-detail-hero :global(.stage-cover-img) {
        position: absolute;
        inset: 0;
    }
    .stage-detail-shade {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgb(0 0 0 / 0.35) 0%, transparent 25%, transparent 45%, var(--stage-bg) 100%);
    }
    .stage-detail-back {
        position: absolute;
        top: calc(10px + env(safe-area-inset-top, 0px));
        left: 10px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #fff;
        background: rgb(0 0 0 / 0.35);
    }
    .stage-detail-title {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .stage-detail-title small,
    .stage-detail-title span {
        font-size: 13px;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 75%, transparent);
    }
    .stage-detail-title h2 {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.15;
        text-wrap: balance;
    }
    .stage-detail-body {
        padding: 6px 16px 24px;
    }
    .stage-facts {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 8px 0 6px;
    }
    .stage-facts div {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px 4px;
        border-radius: 12px;
        background: var(--stage-surface);
    }
    .stage-facts b {
        font-size: 20px;
        font-variant-numeric: tabular-nums;
    }
    .stage-facts span {
        font-size: 12px;
        color: var(--stage-muted);
        text-align: center;
    }
    .stage-kind {
        display: flex;
        padding: 4px;
        border-radius: 999px;
        background: var(--stage-surface);
    }
    .stage-kind button {
        flex: 1;
        height: 40px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .stage-kind button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .stage-section-title {
        padding: 20px 0 8px;
        font-size: 14px;
        font-weight: 600;
        color: var(--stage-muted);
    }
    .stage-req {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        margin-bottom: 8px;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--stage-surface);
        text-align: left;
    }
    .stage-req-ic {
        flex: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--stage-raised);
    }
    .stage-req.ok .stage-req-ic {
        background: #34c77b;
        color: #0b0c10;
    }
    .stage-req.warn .stage-req-ic {
        background: color-mix(in oklab, #ffb84d 22%, transparent);
        color: #ffcf85;
    }
    .stage-req.start .stage-req-ic {
        background: color-mix(in oklab, var(--stage-accent) 22%, transparent);
        color: color-mix(in oklab, var(--stage-accent) 70%, #fff);
    }
    .stage-req.action {
        color: var(--risu-theme-textcolor);
    }
    .stage-req-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .stage-req-text b {
        font-size: 15px;
        overflow-wrap: anywhere;
    }
    .stage-req-text small {
        font-size: 13px;
        line-height: 1.4;
        color: var(--stage-muted);
    }
    .stage-chip {
        flex: none;
        height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 600;
        background: var(--stage-raised);
    }
    .stage-chip.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .stage-note {
        display: flex;
        gap: 8px;
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 1.45;
        color: var(--stage-muted);
    }
    .stage-note :global(svg) {
        flex: none;
        margin-top: 2px;
    }
    .stage-pt {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 60px;
        border-bottom: 1px solid var(--stage-line);
        text-align: left;
        color: var(--stage-muted);
    }
    .stage-pt-ic {
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: var(--stage-surface);
        color: var(--risu-theme-textcolor);
    }
    .stage-pt-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }
    .stage-pt-text b {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 16px;
        color: var(--risu-theme-textcolor);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-pt-text small {
        font-size: 13px;
    }
    .stage-notes {
        font-size: 14px;
        line-height: 1.6;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 85%, transparent);
        overflow-wrap: anywhere;
    }
    .stage-detail-cta {
        flex: none;
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 10px;
        padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid var(--stage-line);
        background: var(--stage-bg);
    }
    .stage-detail-cta.single {
        grid-template-columns: 1fr;
    }
    .stage-btn2,
    .stage-cta {
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 700;
    }
    .stage-btn2 {
        background: var(--stage-surface);
    }
    .stage-cta {
        background: var(--stage-accent);
        color: #fff;
    }
</style>
