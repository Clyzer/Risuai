<script lang="ts">
    // Lorebook of the open story: the story's entries (char.globalLore), this playthrough's
    // (chat.localLore) and, read-only, those of the modules it uses. Folders (mode 'folder', members
    // with folder === folder.key) fold like in Risu's editor. Entries keep Risu's own shape.
    import { ChevronDownIcon, ChevronRightIcon, FolderIcon, PlusIcon, SearchIcon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import type { loreBook } from 'src/ts/storage/database.svelte'
    import StagePage from './StagePage.svelte'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    type Tab = 'story' | 'chat' | 'modules'
    let tab = $state<Tab>('story')
    let query = $state('')
    let limit = $state(120)
    let openFolders = $state<Record<string, boolean>>({})
    let editing = $state<{ tab: Tab; entry: loreBook } | null>(null)

    let char = $derived(DBState.db.characters[$selectedCharID])
    let chat = $derived(char?.chats?.[char.chatPage])
    let moduleIds = $derived(new Set([...(DBState.db.enabledModules ?? []), ...(chat?.modules ?? []), ...((char as { modules?: string[] })?.modules ?? [])]))
    let moduleLore = $derived((DBState.db.modules ?? []).filter((m) => moduleIds.has(m.id)).flatMap((m) => m.lorebook ?? []))

    let list = $derived.by((): loreBook[] => {
        if (tab === 'story') return (char as { globalLore?: loreBook[] })?.globalLore ?? []
        if (tab === 'chat') return chat?.localLore ?? []
        return moduleLore
    })

    let q = $derived(query.trim().toLocaleLowerCase())
    let matches = (e: loreBook) => !q || `${e.comment} ${e.key} ${e.secondkey} ${e.content}`.toLocaleLowerCase().includes(q)

    // Top level: folders and loose entries. While searching, every match is shown flat.
    let rows = $derived.by(() => {
        if (q) return list.filter((e) => e.mode !== 'folder' && matches(e)).map((entry) => ({ entry, members: null as loreBook[] | null }))
        return list
            .filter((e) => !e.folder || !list.some((f) => f.mode === 'folder' && f.key === e.folder))
            .map((entry) => ({ entry, members: entry.mode === 'folder' ? list.filter((m) => m.folder === entry.key) : null }))
    })

    function add() {
        if (tab === 'modules' || !char) return
        const entry: loreBook = { key: '', comment: language.stage.addLore, content: '', mode: 'normal', insertorder: 100, alwaysActive: false, secondkey: '', selective: false }
        if (tab === 'story') {
            const c = char as { globalLore?: loreBook[] }
            c.globalLore = [...(c.globalLore ?? []), entry]
            editing = { tab, entry: c.globalLore[c.globalLore.length - 1] }
        } else if (chat) {
            chat.localLore = [...(chat.localLore ?? []), entry]
            editing = { tab, entry: chat.localLore[chat.localLore.length - 1] }
        }
    }

    async function remove(entry: loreBook) {
        if (!(await alertConfirm(language.stage.deleteLoreConfirm.replace('{}', entry.comment || '…')))) return
        if (editing?.tab === 'story') {
            const c = char as { globalLore?: loreBook[] }
            c.globalLore = (c.globalLore ?? []).filter((e) => e !== entry)
        } else if (editing?.tab === 'chat' && chat) {
            chat.localLore = chat.localLore.filter((e) => e !== entry)
        }
        editing = null
    }

    function keysOf(e: loreBook) {
        return e.alwaysActive ? language.stage.loreActiveBadge : (e.key || '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 4).join(', ')
    }
</script>

<StagePage title={language.loreBook ?? 'Lorebook'} {close}>
    {#snippet actions()}
        {#if tab !== 'modules'}
            <button class="stage-pill-btn" aria-label={language.stage.addLore} title={language.stage.addLore} onclick={add}><PlusIcon size={22} /></button>
        {/if}
    {/snippet}

    <div class="stage-lore-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'story'} class:on={tab === 'story'} onclick={() => ((tab = 'story'), (limit = 120))}>{language.stage.loreStory}</button>
        <button role="tab" aria-selected={tab === 'chat'} class:on={tab === 'chat'} onclick={() => ((tab = 'chat'), (limit = 120))}>{language.stage.lorePlaythrough}</button>
        <button role="tab" aria-selected={tab === 'modules'} class:on={tab === 'modules'} onclick={() => ((tab = 'modules'), (limit = 120))}>{language.stage.loreModules}</button>
    </div>

    <label class="stage-search">
        <SearchIcon size={18} />
        <input type="search" bind:value={query} placeholder={language.stage.searchLore} autocomplete="off" />
    </label>
    {#if tab === 'modules'}<p class="stage-note">{language.stage.loreReadOnly}</p>{/if}

    {#if rows.length === 0}
        <p class="stage-lead">{q ? language.stage.noLoreMatch : language.stage.noLore}</p>
    {:else}
        <div class="stage-list">
            {#each rows.slice(0, limit) as row (row.entry)}
                {#if row.members}
                    {@const open = openFolders[row.entry.key]}
                    <button class="stage-row" onclick={() => (openFolders[row.entry.key] = !open)}>
                        <span class="stage-row-ic"><FolderIcon size={18} /></span>
                        <span class="stage-row-text"><b>{row.entry.comment}</b><small>{row.members.length} {language.stage.loreEntries}</small></span>
                        <span class="stage-row-end">{#if open}<ChevronDownIcon size={18} />{:else}<ChevronRightIcon size={18} />{/if}</span>
                    </button>
                    {#if open}
                        {#each row.members as m (m)}
                            <button class="stage-row stage-lore-child" onclick={() => tab !== 'modules' && (editing = { tab, entry: m })}>
                                <span class="stage-row-text"><b>{m.comment || '…'}</b><small>{keysOf(m)}</small></span>
                            </button>
                        {/each}
                    {/if}
                {:else}
                    <button class="stage-row" onclick={() => tab !== 'modules' && (editing = { tab, entry: row.entry })}>
                        <span class="stage-row-text"><b>{row.entry.comment || '…'}</b><small>{keysOf(row.entry)}</small></span>
                    </button>
                {/if}
            {/each}
        </div>
        {#if rows.length > limit}
            <div class="stage-btns"><button class="stage-btn block" onclick={() => (limit += 200)}>+{Math.min(200, rows.length - limit)}</button></div>
        {/if}
    {/if}
</StagePage>

{#if editing}
    {@const e = editing.entry}
    <StagePage title={e.comment || language.stage.addLore} close={() => (editing = null)} level={1}>
        <label class="stage-field">
            {language.stage.loreName}
            <input class="stage-input" bind:value={e.comment} />
        </label>
        <button class="stage-row stage-lore-switch" role="switch" aria-checked={e.alwaysActive} onclick={() => (e.alwaysActive = !e.alwaysActive)}>
            <span class="stage-row-text"><b>{language.stage.loreAlways}</b></span>
            <i class="stage-switch" class:on={e.alwaysActive}></i>
        </button>
        {#if !e.alwaysActive}
            <label class="stage-field">
                {language.stage.loreKeys}
                <input class="stage-input" bind:value={e.key} autocapitalize="off" />
                <small>{language.stage.loreKeysHint}</small>
            </label>
            <button class="stage-row stage-lore-switch" role="switch" aria-checked={e.selective} onclick={() => (e.selective = !e.selective)}>
                <span class="stage-row-text"><b>{language.stage.loreSelective}</b></span>
                <i class="stage-switch" class:on={e.selective}></i>
            </button>
            {#if e.selective}
                <label class="stage-field">
                    {language.stage.loreSecondKeys}
                    <input class="stage-input" bind:value={e.secondkey} autocapitalize="off" />
                </label>
            {/if}
        {/if}
        <label class="stage-field">
            {language.stage.loreContent}
            <textarea class="stage-input" rows="10" bind:value={e.content}></textarea>
        </label>
        <label class="stage-field">
            {language.stage.loreOrder}
            <input class="stage-input" type="number" min="0" max="1000" inputmode="numeric" bind:value={e.insertorder} />
        </label>
        <div class="stage-btns">
            <button class="stage-btn danger" onclick={() => remove(e)}><Trash2Icon size={18} />{language.stage.deleteLore}</button>
        </div>
    </StagePage>
{/if}

<style>
    .stage-lore-tabs {
        display: flex;
        gap: 4px;
        padding: 3px;
        margin-bottom: 12px;
        border-radius: 999px;
        background: var(--stage-surface);
    }
    .stage-lore-tabs button {
        flex: 1;
        min-height: 38px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .stage-lore-tabs button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .stage-lore-child {
        padding-left: 40px;
    }
    .stage-lore-switch {
        margin-bottom: 14px;
        border-radius: 14px;
        background: var(--stage-surface);
    }
</style>
