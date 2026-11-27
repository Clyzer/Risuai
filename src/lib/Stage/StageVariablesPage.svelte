<script lang="ts">
    // Read-only list of the playthrough's variables (set by the card's triggers, Lua or {{setvar}}),
    // with a shortcut to pin any of them as an indicator.
    import { ArrowLeftIcon, CheckIcon, PinIcon, SearchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { getIndicators, listVariables, newIndicatorId, setIndicators } from './stageIndicators'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let query = $state('')
    let char = $derived(DBState.db.characters[$selectedCharID])
    let chat = $derived(char?.chats?.[char.chatPage])
    let all = $derived(listVariables(char, chat))
    let shown = $derived(all.filter((v) => !query.trim() || (v.name + ' ' + v.value).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
    let pinned = $derived(new Set(getIndicators(char).filter((i) => i.source === 'var').map((i) => i.key)))

    function pin(name: string, value: string) {
        if (!char || pinned.has(name)) return
        setIndicators(char, [
            ...getIndicators(char),
            { id: newIndicatorId(), label: name, source: 'var', key: name, display: Number.isFinite(parseFloat(value)) ? 'bar' : 'text', max: 100 },
        ])
    }
</script>

<div class="stage-sub">
    <header class="stage-sub-top">
        <button class="stage-sub-back" aria-label={language.stage.back} onclick={close}><ArrowLeftIcon size={22} /></button>
        <b>{language.stage.variables}</b>
    </header>
    <div class="stage-sub-body">
        <p class="stage-sub-lead">{language.stage.variablesIntro}</p>
        {#if all.length > 0}
            <label class="stage-var-search">
                <SearchIcon size={18} />
                <input type="search" bind:value={query} placeholder={language.stage.searchVariables} autocomplete="off" />
            </label>
        {/if}
        {#each shown as v (v.name)}
            <div class="stage-var">
                <div class="stage-var-text">
                    <code>{v.name}</code>
                    <span>{v.value}{#if v.isDefault}<em> · {language.stage.defaultValue}</em>{/if}</span>
                </div>
                <button class="stage-var-pin" class:on={pinned.has(v.name)} aria-label={language.stage.useAsIndicator} title={language.stage.useAsIndicator} onclick={() => pin(v.name, v.value)}>
                    {#if pinned.has(v.name)}<CheckIcon size={18} />{:else}<PinIcon size={18} />{/if}
                </button>
            </div>
        {:else}
            <p class="stage-sub-lead">{all.length === 0 ? language.stage.noVariables : language.stage.noVariableMatch}</p>
        {/each}
    </div>
</div>

<style>
    .stage-sub {
        position: absolute;
        inset: 0;
        z-index: 70;
        display: flex;
        flex-direction: column;
        background: var(--stage-bg);
    }
    .stage-sub-top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 56px;
        padding: env(safe-area-inset-top, 0px) 12px 0 4px;
        border-bottom: 1px solid var(--stage-line);
    }
    .stage-sub-top b {
        font-size: 17px;
    }
    .stage-sub-back {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 50%;
    }
    .stage-sub-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 14px 16px calc(28px + env(safe-area-inset-bottom, 0px));
    }
    .stage-sub-lead {
        margin: 0 0 12px;
        font-size: 15px;
        line-height: 1.5;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 80%, transparent);
    }
    .stage-var-search {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 46px;
        padding: 0 14px;
        margin-bottom: 8px;
        border-radius: 12px;
        background: var(--stage-surface);
        color: var(--stage-muted);
    }
    .stage-var-search input {
        flex: 1;
        min-width: 0;
        background: none;
        border: 0;
        outline: none;
        font-size: 16px;
        color: var(--risu-theme-textcolor);
    }
    .stage-var {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 56px;
        border-bottom: 1px solid var(--stage-line);
    }
    .stage-var-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .stage-var-text code {
        font-size: 13px;
        color: color-mix(in oklab, var(--stage-accent) 70%, var(--risu-theme-textcolor));
        overflow-wrap: anywhere;
    }
    .stage-var-text span {
        font-size: 15px;
        overflow-wrap: anywhere;
    }
    .stage-var-text em {
        font-style: normal;
        font-size: 12px;
        color: var(--stage-muted);
    }
    .stage-var-pin {
        flex: none;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--stage-muted);
    }
    .stage-var-pin.on {
        color: #34c77b;
    }
</style>
