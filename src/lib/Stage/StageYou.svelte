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

    // Each row opens the settings page Risu already has (index = SettingsMenuIndex).
    type Row = { icon: typeof BotIcon; label: () => string; index: number; value?: () => string }
    const groups: { title: () => string; rows: Row[] }[] = [
        {
            title: () => language.stage.groupAi,
            rows: [
                { icon: BotIcon, label: () => language.chatBot, index: 1 },
                { icon: CpuIcon, label: () => language.otherBots, index: 2 },
            ],
        },
        {
            title: () => language.stage.groupContent,
            rows: [
                { icon: BlocksIcon, label: () => language.modules, index: 14, value: () => String(DBState.db.modules?.length ?? 0) },
                { icon: PuzzleIcon, label: () => language.plugin, index: 4 },
            ],
        },
        {
            title: () => language.stage.groupLook,
            rows: [
                { icon: MonitorIcon, label: () => language.display, index: 3, value: () => language.stage.themeStage },
                { icon: GlobeIcon, label: () => language.language, index: 10 },
                { icon: AccessibilityIcon, label: () => language.accessibility, index: 11 },
            ],
        },
        {
            title: () => language.stage.groupData,
            rows: [
                { icon: CloudIcon, label: () => language.account, index: 0 },
                { icon: SlidersHorizontalIcon, label: () => language.advancedSettings, index: 77 },
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

    <button class="stage-profile" onclick={() => openSettings(12)}>
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
            <button class="stage-row" onclick={() => openSettings(row.index)}>
                <Icon size={22} />
                <span class="stage-row-label">{row.label()}</span>
                {#if row.value}<span class="stage-row-value">{row.value()}</span>{/if}
                <ChevronRightIcon class="stage-chev" size={20} />
            </button>
        {/each}
    {/each}
</div>

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
