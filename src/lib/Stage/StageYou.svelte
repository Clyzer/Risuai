<script lang="ts">
    import {
        AccessibilityIcon,
        BotIcon,
        BlocksIcon,
        ChevronRightIcon,
        CloudIcon,
        CpuIcon,
        GlobeIcon,
        MonitorIcon,
        PuzzleIcon,
        SlidersHorizontalIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, SettingsMenuIndex, settingsOpen } from 'src/ts/stores.svelte'
    import StageCover from './StageCover.svelte'
    import StagePersonaPage from './StagePersonaPage.svelte'
    import StageModelPage from './StageModelPage.svelte'
    import StageOtherModelsPage from './StageOtherModelsPage.svelte'
    import StageModuleManagerPage from './StageModuleManagerPage.svelte'
    import StagePluginsPage from './StagePluginsPage.svelte'
    import StageSettingsPage from './StageSettingsPage.svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import { displayOtherSettingsItems, displaySizeSettingsItems, displayThemeSettingsItems } from 'src/ts/setting/displaySettingsData.svelte'
    import { languageSettingsItems } from 'src/ts/setting/languageSettingsData.svelte'
    import { accessibilitySettingsItems } from 'src/ts/setting/accessibilitySettingsData'
    import { advancedSettingsItems } from 'src/ts/setting/advancedSettingsData'

    // Each row opens Stage's own page. Account (Risu login and sync) stays Risu's page.
    type YouPage = 'persona' | 'model' | 'otherModels' | 'modules' | 'plugins' | 'display' | 'language' | 'accessibility' | 'advanced'
    let page = $state<YouPage | null>(null)

    type Row = { icon: typeof BotIcon; label: () => string; open: () => void; value?: () => string }
    const groups: { title: () => string; rows: Row[] }[] = [
        {
            title: () => language.stage.groupAi,
            rows: [
                { icon: BotIcon, label: () => language.stage.aiModel, open: () => (page = 'model'), value: () => getModelInfo(DBState.db.aiModel)?.shortName ?? getModelInfo(DBState.db.aiModel)?.name ?? '' },
                { icon: CpuIcon, label: () => language.otherBots, open: () => (page = 'otherModels') },
            ],
        },
        {
            title: () => language.stage.groupContent,
            rows: [
                { icon: BlocksIcon, label: () => language.modules, open: () => (page = 'modules'), value: () => String(DBState.db.modules?.length ?? 0) },
                { icon: PuzzleIcon, label: () => language.plugin, open: () => (page = 'plugins'), value: () => String(DBState.db.plugins?.length ?? 0) },
            ],
        },
        {
            title: () => language.stage.groupLook,
            rows: [
                { icon: MonitorIcon, label: () => language.display, open: () => (page = 'display'), value: () => language.stage.themeStage },
                { icon: GlobeIcon, label: () => language.language, open: () => (page = 'language') },
                { icon: AccessibilityIcon, label: () => language.accessibility, open: () => (page = 'accessibility') },
            ],
        },
        {
            title: () => language.stage.groupData,
            rows: [
                { icon: CloudIcon, label: () => language.account, open: () => openSettings(0) },
                { icon: SlidersHorizontalIcon, label: () => language.advancedSettings, open: () => (page = 'advanced') },
            ],
        },
    ]

    function openSettings(index: number) {
        SettingsMenuIndex.set(index)
        settingsOpen.set(true)
    }
</script>

<div class="stage-scroll">
    <header class="stage-head">
        <h1>{language.stage.you}</h1>
    </header>

    <button class="stage-profile" onclick={() => (page = 'persona')}>
        <span class="stage-profile-img"><StageCover image={DBState.db.userIcon} /></span>
        <span class="stage-profile-text">
            <b>{DBState.db.username || language.persona}</b>
            <span>{language.stage.activePersona} · {DBState.db.personas?.length ?? 0}</span>
        </span>
        <ChevronRightIcon class="stage-chev" size={20} />
    </button>

    {#each groups as group}
        <div class="stage-sep"></div>
        <div class="stage-group-title">{group.title()}</div>
        {#each group.rows as row}
            {@const Icon = row.icon}
            <button class="stage-row" onclick={row.open}>
                <Icon size={22} />
                <span class="stage-row-label">{row.label()}</span>
                {#if row.value}<span class="stage-row-value">{row.value()}</span>{/if}
                <ChevronRightIcon class="stage-chev" size={20} />
            </button>
        {/each}
    {/each}
</div>

{#if page === 'persona'}
    <StagePersonaPage close={() => (page = null)} />
{:else if page === 'model'}
    <StageModelPage close={() => (page = null)} />
{:else if page === 'otherModels'}
    <StageOtherModelsPage close={() => (page = null)} />
{:else if page === 'modules'}
    <StageModuleManagerPage close={() => (page = null)} />
{:else if page === 'plugins'}
    <StagePluginsPage close={() => (page = null)} />
{:else if page === 'display'}
    <StageSettingsPage
        title={language.display}
        sections={[
            { title: language.theme, items: displayThemeSettingsItems },
            { title: language.sizeAndSpeed, items: displaySizeSettingsItems },
            { title: language.others, items: displayOtherSettingsItems },
        ]}
        close={() => (page = null)}
    />
{:else if page === 'language'}
    <StageSettingsPage title={language.language} sections={[{ title: language.language, items: languageSettingsItems }]} close={() => (page = null)} />
{:else if page === 'accessibility'}
    <StageSettingsPage title={language.accessibility} sections={[{ title: language.accessibility, items: accessibilitySettingsItems }]} close={() => (page = null)} />
{:else if page === 'advanced'}
    <StageSettingsPage title={language.advancedSettings} sections={[{ title: language.advancedSettings, items: advancedSettingsItems }]} searchable close={() => (page = null)} />
{/if}

<style>
    .stage-profile {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 6px 0 16px;
        text-align: left;
    }
    .stage-profile-img {
        flex: none;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-profile-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
    }
    .stage-profile-text b {
        font-size: 20px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-profile-text span {
        font-size: 14px;
        color: var(--stage-muted);
    }
    .stage-sep {
        height: 6px;
        margin: 8px -16px 0;
        background: color-mix(in oklab, var(--stage-bg) 70%, #000);
        border-top: 1px solid var(--stage-line);
    }
    .stage-group-title {
        padding: 16px 0 2px;
        font-size: 14px;
        font-weight: 600;
        color: var(--stage-muted);
    }
    .stage-row {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
        min-height: 56px;
        font-size: 17px;
        font-weight: 600;
        text-align: left;
    }
    .stage-row-label {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-row-value {
        font-size: 15px;
        font-weight: 500;
        color: var(--stage-muted);
        white-space: nowrap;
    }
    .stage-row :global(.stage-chev),
    .stage-profile :global(.stage-chev) {
        flex: none;
        color: var(--stage-muted);
    }
</style>
