<script lang="ts">
    // Side menu of the play screen. Every row opens something Risu already has: its persona and
    // model settings, its chat list (playthroughs, branches), its per-chat module menu and its
    // character editor. The timeline jumps with ScrollToMessageStore, like Risu's own search does.
    import {
        BlocksIcon,
        BookOpenIcon,
        ChevronRightIcon,
        InfoIcon,
        ListIcon,
        SparklesIcon,
        UserIcon,
        UserPenIcon,
        XIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, ScrollToMessageStore, selectedCharID, SettingsMenuIndex, settingsOpen, CharConfigSubMenu } from 'src/ts/stores.svelte'

    interface Props {
        close: () => void
        exit: () => void
        openStoryPage: () => void
        openChatList: () => void
        openModuleList: () => void
        openEditor: () => void
    }

    let { close, exit, openStoryPage, openChatList, openModuleList, openEditor }: Props = $props()

    let char = $derived(DBState.db.characters[$selectedCharID])
    let chat = $derived(char?.chats?.[char.chatPage])
    let count = $derived(chat?.message?.length ?? 0)
    let position = $state(0)

    $effect(() => {
        position = Math.max(0, count - 1)
    })

    function openSettings(index: number) {
        close()
        SettingsMenuIndex.set(index)
        settingsOpen.set(true)
    }

    function openLorebook() {
        CharConfigSubMenu.set(3)
        openEditor()
    }

    function jump(index: number) {
        if (count === 0) return
        ScrollToMessageStore.value = Math.min(Math.max(0, index), count - 1)
        close()
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="stage-drawer-scrim" onclick={close}></div>
<aside class="stage-drawer" aria-label={language.stage.playMenu}>
    <header class="stage-drawer-head">
        <div>
            <h2>{char?.name}</h2>
            {#if chat?.name}<span>{chat.name}</span>{/if}
        </div>
        <button class="stage-drawer-x" aria-label={language.close} onclick={close}><XIcon size={20} /></button>
    </header>

    <div class="stage-drawer-rows">
        <button class="stage-drawer-row" onclick={() => openSettings(12)}>
            <UserIcon size={22} /><span>{language.persona}</span>
            <em>{DBState.db.username}</em><ChevronRightIcon size={18} />
        </button>
        <button class="stage-drawer-row" onclick={openChatList}>
            <ListIcon size={22} /><span>{language.stage.playthroughs}</span>
            <em>{char?.chats?.length ?? 0}</em><ChevronRightIcon size={18} />
        </button>
        <button class="stage-drawer-row" onclick={openModuleList}>
            <BlocksIcon size={22} /><span>{language.modules}</span>
            <em>{(char?.modules?.length ?? 0) + (chat?.modules?.length ?? 0)}</em><ChevronRightIcon size={18} />
        </button>
        <button class="stage-drawer-row" onclick={openLorebook}>
            <BookOpenIcon size={22} /><span>{language.loreBook}</span>
            <em>{char?.globalLore?.length ?? 0}</em><ChevronRightIcon size={18} />
        </button>
        <button class="stage-drawer-row" onclick={() => openSettings(1)}>
            <SparklesIcon size={22} /><span>{language.stage.aiModel}</span>
            <em>{DBState.db.aiModel}</em><ChevronRightIcon size={18} />
        </button>
        <button
            class="stage-drawer-row"
            onclick={() => {
                CharConfigSubMenu.set(0)
                openEditor()
            }}
        >
            <UserPenIcon size={22} /><span>{language.stage.editCharacter}</span><ChevronRightIcon size={18} />
        </button>
        <button class="stage-drawer-row" onclick={openStoryPage}>
            <InfoIcon size={22} /><span>{language.stage.storyPage}</span><ChevronRightIcon size={18} />
        </button>
    </div>

    <div class="stage-timeline">
        <div class="stage-timeline-count">
            {count > 0 ? language.stage.messageOf.replace('{}', String(position + 1)).replace('{}', String(count)) : language.stage.noMessagesYet}
        </div>
        {#if count > 1}
            <input
                type="range"
                min="0"
                max={count - 1}
                step="1"
                bind:value={position}
                aria-label={language.stage.timeline}
                onchange={() => jump(position)}
            />
            <div class="stage-timeline-ends">
                <button onclick={() => jump(0)}>{language.stage.timelineStart}</button>
                <button onclick={() => jump(count - 1)}>{language.stage.timelineEnd}</button>
            </div>
        {/if}
    </div>

    <button class="stage-drawer-exit" onclick={exit}>{language.stage.exitPlay}</button>
</aside>

<style>
    .stage-drawer-scrim {
        position: absolute;
        inset: 0;
        z-index: 60;
        background: rgb(5 6 10 / 0.55);
    }
    .stage-drawer {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 61;
        width: min(88%, 420px);
        display: flex;
        flex-direction: column;
        padding: calc(18px + env(safe-area-inset-top, 0px)) 18px calc(12px + env(safe-area-inset-bottom, 0px)) 20px;
        background: var(--stage-bg);
        border-left: 1px solid var(--stage-line);
        color: var(--risu-theme-textcolor);
        animation: stage-drawer-in 0.22s ease-out;
    }
    @keyframes stage-drawer-in {
        from {
            transform: translateX(30px);
            opacity: 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .stage-drawer {
            animation: none;
        }
    }
    .stage-drawer-head {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 10px;
    }
    .stage-drawer-head div {
        flex: 1;
        min-width: 0;
    }
    .stage-drawer-head h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        overflow-wrap: anywhere;
    }
    .stage-drawer-head span {
        font-size: 14px;
        color: var(--stage-muted);
    }
    .stage-drawer-x {
        flex: none;
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--stage-surface);
    }
    .stage-drawer-rows {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }
    .stage-drawer-row {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        min-height: 56px;
        font-size: 17px;
        font-weight: 600;
        text-align: left;
    }
    .stage-drawer-row span {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-drawer-row em {
        font-style: normal;
        font-size: 14px;
        font-weight: 500;
        color: var(--stage-muted);
        max-width: 40%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-drawer-row :global(svg:last-child) {
        flex: none;
        color: var(--stage-muted);
    }
    .stage-timeline {
        padding: 12px 0 4px;
        border-top: 1px solid var(--stage-line);
    }
    .stage-timeline-count {
        font-size: 15px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        margin-bottom: 8px;
    }
    .stage-timeline input {
        width: 100%;
        height: 36px;
        accent-color: var(--stage-accent);
    }
    .stage-timeline-ends {
        display: flex;
        justify-content: space-between;
        gap: 8px;
    }
    .stage-timeline-ends button {
        height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--stage-line);
        font-size: 14px;
        font-weight: 600;
    }
    .stage-drawer-exit {
        margin-top: 10px;
        height: 44px;
        color: var(--stage-muted);
        font-size: 15px;
    }
</style>
