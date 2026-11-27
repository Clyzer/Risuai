<script lang="ts">
    // Risu's data-driven settings (src/ts/setting/*Data.ts) drawn with Stage's parts. Values, labels,
    // conditions and side effects go through Risu's own helpers (getSettingValue, setSettingValue,
    // checkCondition, getLabel), so every option behaves as on Risu's pages. 'custom' items render
    // Risu's registered component; help opens inline.
    import { ChevronDownIcon, ChevronRightIcon, CircleHelpIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import type { SettingContext, SettingItem } from 'src/ts/setting/types'
    import { checkCondition, getLabel, getPlaceholder, getSettingValue, setSettingValue } from 'src/ts/setting/utils'
    import { customComponents } from 'src/ts/setting/customComponents'
    import StageSettings from './StageSettings.svelte'

    interface Props {
        items: SettingItem[]
    }

    let { items }: Props = $props()

    let ctx: SettingContext = $derived({ db: DBState.db, modelInfo: getModelInfo(DBState.db.aiModel), subModelInfo: getModelInfo(DBState.db.subModel) })
    let helpOpen = $state<Record<string, boolean>>({})
    let accordionOpen = $state<Record<string, boolean>>({})

    function value(item: SettingItem) {
        return getSettingValue(item, ctx)
    }
    function set(item: SettingItem, v: unknown) {
        setSettingValue(item, v, ctx)
    }
    function helpText(item: SettingItem): string {
        const help = (language as unknown as { help?: Record<string, string> }).help
        return (item.helpKey && help?.[item.helpKey]) || ''
    }
    function optionLabel(o: { label?: string; labelKey?: string; value: string | number }) {
        return (o.labelKey && (language as unknown as Record<string, string>)[o.labelKey]) || o.label || String(o.value)
    }
    function sliderText(item: SettingItem, v: number) {
        const custom = item.options?.customText
        if (typeof custom === 'function') return custom(v)
        if (custom) return custom
        return (v * (item.options?.multiple ?? 1)).toFixed(item.options?.fixed ?? 0)
    }
</script>

{#snippet label(item: SettingItem)}
    <span class="ss-label">
        {getLabel(item)}
        {#if helpText(item)}
            <button class="ss-help" aria-label={language.stage.help} aria-expanded={!!helpOpen[item.id]} onclick={(e) => { e.preventDefault(); helpOpen[item.id] = !helpOpen[item.id] }}><CircleHelpIcon size={15} /></button>
        {/if}
    </span>
{/snippet}

{#snippet help(item: SettingItem)}
    {#if helpOpen[item.id]}<p class="ss-helptext">{helpText(item)}</p>{/if}
{/snippet}

{#each items as item (item.id)}
    {#if checkCondition(item, ctx)}
        {#if item.type === 'header'}
            {#if item.options?.level === 'warning'}
                <p class="ss-warning">{getLabel(item)}</p>
            {:else if item.options?.level === 'span'}
                <p class="stage-note">{getLabel(item)}</p>
            {:else}
                <div class="stage-section">{getLabel(item)}</div>
            {/if}
        {:else if item.type === 'check'}
            <div class="ss-block">
                <div class="ss-check">
                    {@render label(item)}
                    <button class="ss-toggle" role="switch" aria-checked={!!value(item)} aria-label={getLabel(item)} onclick={() => set(item, !value(item))}>
                        <i class="stage-switch" class:on={!!value(item)}></i>
                    </button>
                </div>
                {@render help(item)}
            </div>
        {:else if item.type === 'text' || item.type === 'number'}
            <label class="stage-field">
                {@render label(item)}
                <input
                    class="stage-input"
                    type={item.type === 'number' ? 'number' : item.options?.hideText ? 'password' : 'text'}
                    min={item.options?.min}
                    max={item.options?.max}
                    step={item.options?.step}
                    placeholder={getPlaceholder(item)}
                    autocomplete="off"
                    value={value(item) ?? ''}
                    oninput={(e) => set(item, item.type === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value)}
                />
            </label>
            {@render help(item)}
        {:else if item.type === 'textarea'}
            <label class="stage-field">
                {@render label(item)}
                <textarea class="stage-input" rows="4" placeholder={getPlaceholder(item)} value={value(item) ?? ''} oninput={(e) => set(item, e.currentTarget.value)}></textarea>
            </label>
            {@render help(item)}
        {:else if item.type === 'slider'}
            {@const v = Number(value(item) ?? 0)}
            {@const off = item.options?.disableable && v === -1000}
            <div class="stage-field">
                {@render label(item)}
                <div class="ss-slider">
                    <input type="range" min={item.options?.min ?? 0} max={item.options?.max ?? 100} step={item.options?.step ?? 1} disabled={off} value={off ? (item.options?.min ?? 0) : v} oninput={(e) => set(item, Number(e.currentTarget.value))} />
                    <b>{off ? '—' : sliderText(item, v)}</b>
                </div>
                {#if item.options?.disableable}
                    <button class="ss-check ss-sub" role="switch" aria-checked={!off} onclick={() => set(item, off ? (item.options?.min ?? 0) : -1000)}>
                        <span class="ss-label">{language.stage.enabledLabel}</span>
                        <i class="stage-switch" class:on={!off}></i>
                    </button>
                {/if}
                {@render help(item)}
            </div>
        {:else if item.type === 'select'}
            <label class="stage-field">
                {@render label(item)}
                <select class="stage-input" value={String(value(item) ?? '')} onchange={(e) => set(item, e.currentTarget.value)}>
                    {#each (item.options?.selectOptions ?? []).filter((o) => !o.condition || o.condition(ctx)) as o}
                        <option value={o.value}>{optionLabel(o)}</option>
                    {/each}
                </select>
            </label>
            {@render help(item)}
        {:else if item.type === 'segmented'}
            <div class="stage-field">
                {@render label(item)}
                <div class="ss-seg" role="radiogroup">
                    {#each (item.options?.segmentOptions ?? []).filter((o) => !o.condition || o.condition(ctx)) as o}
                        <button role="radio" aria-checked={value(item) === o.value} class:on={value(item) === o.value} onclick={() => set(item, o.value)}>{optionLabel(o)}</button>
                    {/each}
                </div>
            </div>
        {:else if item.type === 'color'}
            <label class="stage-field ss-color">
                {@render label(item)}
                <input type="color" value={value(item) ?? '#000000'} oninput={(e) => set(item, e.currentTarget.value)} />
            </label>
        {:else if item.type === 'button'}
            <button class="stage-btn block ss-button" onclick={() => item.options?.onClick?.()}>{getLabel(item)}</button>
        {:else if item.type === 'accordion'}
            <div class="ss-accordion">
                <button class="ss-check" onclick={() => (accordionOpen[item.id] = !accordionOpen[item.id])}>
                    <span class="ss-label">{getLabel(item)}</span>
                    {#if accordionOpen[item.id]}<ChevronDownIcon size={18} />{:else}<ChevronRightIcon size={18} />{/if}
                </button>
                {#if accordionOpen[item.id]}
                    <div class="ss-accordion-body"><StageSettings items={item.options?.children ?? []} /></div>
                {/if}
            </div>
        {:else if item.type === 'custom' && item.componentId && customComponents[item.componentId]}
            {@const Custom = customComponents[item.componentId]}
            <div class="ss-custom"><Custom {...item.componentProps} /></div>
        {/if}
    {/if}
{/each}

<style>
    .ss-block {
        margin-bottom: 8px;
    }
    .ss-check {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        min-height: 52px;
        padding: 8px 14px;
        border-radius: 14px;
        background: var(--stage-surface);
        text-align: left;
        color: inherit;
    }
    .ss-check :global(.stage-switch) {
        flex: none;
    }
    .ss-toggle {
        flex: none;
        display: grid;
        place-items: center;
        min-width: 56px;
        min-height: 40px;
    }
    .ss-sub {
        margin-top: 6px;
        min-height: 44px;
    }
    .ss-label {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 15px;
        font-weight: 600;
        color: var(--risu-theme-textcolor);
    }
    .stage-field .ss-label {
        font-size: 13px;
        color: var(--stage-muted);
    }
    .ss-help {
        flex: none;
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        color: var(--stage-muted);
    }
    .ss-helptext {
        margin: 6px 0 8px;
        font-size: 13px;
        font-weight: 400;
        line-height: 1.5;
        white-space: pre-wrap;
        color: color-mix(in oklab, var(--risu-theme-textcolor) 75%, transparent);
    }
    .ss-warning {
        margin: 8px 0;
        padding: 10px 12px;
        border-radius: 12px;
        background: color-mix(in oklab, #f5a524 18%, transparent);
        font-size: 13px;
        line-height: 1.45;
    }
    .ss-slider {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .ss-slider input {
        flex: 1;
        height: 32px;
        accent-color: var(--stage-accent);
    }
    .ss-slider b {
        min-width: 52px;
        text-align: right;
        font-size: 14px;
        color: var(--risu-theme-textcolor);
        font-variant-numeric: tabular-nums;
    }
    .ss-seg {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 3px;
        border-radius: 14px;
        background: var(--stage-surface);
    }
    .ss-seg button {
        flex: 1;
        min-height: 38px;
        padding: 0 10px;
        border-radius: 11px;
        font-size: 14px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .ss-seg button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .ss-color {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
    .ss-color input {
        width: 52px;
        height: 36px;
        border: 0;
        background: none;
    }
    .ss-button {
        margin: 6px 0 12px;
    }
    .ss-accordion {
        margin-bottom: 8px;
    }
    .ss-accordion-body {
        padding: 10px 4px 0;
    }
    .ss-custom {
        margin: 8px 0 14px;
    }
</style>
