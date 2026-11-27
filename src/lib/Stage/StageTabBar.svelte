<script lang="ts">
    import { GlobeIcon, HouseIcon, MessageCircleIcon, UserIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { stageNav, type StageTab } from './stageNav.svelte'

    const tabs: { id: StageTab; label: () => string; icon: typeof HouseIcon }[] = [
        { id: 'home', label: () => language.stage.home, icon: HouseIcon },
        { id: 'chats', label: () => language.stage.chats, icon: MessageCircleIcon },
        { id: 'realm', label: () => language.stage.realm, icon: GlobeIcon },
        { id: 'you', label: () => language.stage.you, icon: UserIcon },
    ]
</script>

<nav class="stage-tabbar" aria-label="Stage">
    {#each tabs as tab (tab.id)}
        {@const Icon = tab.icon}
        <button
            class="stage-tab"
            class:on={stageNav.tab === tab.id}
            aria-current={stageNav.tab === tab.id ? 'page' : undefined}
            onclick={() => {
                stageNav.tab = tab.id
            }}
        >
            <Icon size={24} strokeWidth={stageNav.tab === tab.id ? 2.4 : 1.8} />
            <span>{tab.label()}</span>
        </button>
    {/each}
</nav>

<style>
    .stage-tabbar {
        flex: none;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        height: calc(64px + env(safe-area-inset-bottom, 0px));
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: var(--stage-bg);
        border-top: 1px solid var(--stage-line);
    }
    .stage-tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        color: var(--stage-muted);
    }
    .stage-tab.on {
        color: var(--risu-theme-textcolor);
    }
    .stage-tab:focus-visible {
        outline: 2px solid var(--stage-accent);
        outline-offset: -4px;
        border-radius: 12px;
    }
</style>
