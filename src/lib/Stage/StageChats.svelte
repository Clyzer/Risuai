<script lang="ts">
    // Chats tab: one-on-one characters as a messaging list. Tapping a row opens the conversation
    // the player was last in; the story page stays reachable from the play screen's menu.
    import { PlusIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import type { character } from 'src/ts/storage/database.svelte'
    import StageCover from './StageCover.svelte'
    import { listCharacters, timeAgo } from './stageData'
    import { previewText } from './stageKinds'
    import { addFromStage, continueStory } from './stageActions'

    let rows = $derived(
        listCharacters(DBState.db.characters)
            .filter((c) => c.kind === 'chat')
            .map((c) => {
                const char = DBState.db.characters[c.index] as character
                const chat = char.chats?.[char.chatPage]
                const last = chat?.message?.[chat.message.length - 1]
                const greeting = chat && chat.fmIndex !== undefined && chat.fmIndex >= 0 ? char.alternateGreetings?.[chat.fmIndex] : char.firstMessage
                const raw = last ? last.data : greeting
                const fromUser = last?.role === 'user'
                return {
                    ...c,
                    preview: previewText(raw ?? '', DBState.db.username, char.name),
                    fromUser,
                }
            })
    )
</script>

<div class="stage-scroll">
    <header class="stage-head">
        <h1>{language.stage.chats}</h1>
        <button class="stage-icon-btn" aria-label={language.stage.add} onclick={() => addFromStage()}>
            <PlusIcon size={24} />
        </button>
    </header>

    {#if rows.length === 0}
        <div class="stage-empty">
            <b>{language.stage.chatsEmptyTitle}</b>
            <span>{language.stage.chatsEmptyBody}</span>
        </div>
    {:else}
        <div class="stage-convs">
            {#each rows as r (r.index)}
                <button class="stage-conv" onclick={() => continueStory(r.index)}>
                    <span class="stage-conv-avatar"><StageCover image={r.image} /></span>
                    <span class="stage-conv-text">
                        <span class="stage-conv-l1">
                            <b>{r.name}</b>
                            {#if r.lastInteraction}<time>{timeAgo(r.lastInteraction)}</time>{/if}
                        </span>
                        <span class="stage-conv-preview">
                            {#if r.fromUser}<em>{language.stage.youPrefix}</em>{/if}{r.preview}
                        </span>
                    </span>
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .stage-convs {
        display: flex;
        flex-direction: column;
    }
    .stage-conv {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 10px 0;
        text-align: left;
    }
    .stage-conv-avatar {
        flex: none;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-conv-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .stage-conv-l1 {
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
    }
    .stage-conv-l1 b {
        flex: 1;
        min-width: 0;
        font-size: 17px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-conv-l1 time {
        flex: none;
        font-size: 13px;
        color: var(--stage-muted);
    }
    .stage-conv-preview {
        font-size: 15px;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 70%, transparent);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stage-conv-preview em {
        font-style: normal;
        color: var(--stage-muted);
    }
</style>
