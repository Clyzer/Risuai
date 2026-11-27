<script lang="ts">
    // AI model for everyday use: preset, model, the API key of the model's provider, temperature,
    // reply length and memory. Same fields Risu's bot settings use (db.aiModel, db.botPresets with
    // changeToPreset, db.temperature stored ×100 with -1000 = off, db.maxResponse, db.maxContext,
    // and the per-provider key fields). Everything else stays in "More model options" (Risu's page).
    import { ChevronRightIcon, SlidersHorizontalIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, SettingsMenuIndex, settingsOpen } from 'src/ts/stores.svelte'
    import { changeToPreset } from 'src/ts/storage/database.svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import { LLMProvider } from 'src/ts/model/types'
    import StagePage from './StagePage.svelte'
    import StageModelPicker from './StageModelPicker.svelte'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let info = $derived(getModelInfo(DBState.db.aiModel))
    let pickerOpen = $state(false)
    let usesTemperature = $derived((info?.parameters ?? []).includes('temperature' as never))
    let tempOn = $derived(DBState.db.temperature !== -1000)

    type KeyField = { label: string; get: () => string; set: (v: string) => void }
    let keyFields = $derived.by((): KeyField[] => {
        const db = DBState.db
        if (db.aiModel === 'openrouter') {
            return [
                { label: language.stage.apiKey, get: () => db.openrouterKey ?? '', set: (v) => (db.openrouterKey = v) },
                { label: language.stage.openrouterModel, get: () => db.openrouterRequestModel ?? '', set: (v) => (db.openrouterRequestModel = v) },
            ]
        }
        if (db.aiModel === 'reverse_proxy') {
            return [
                { label: language.stage.customUrl, get: () => db.forceReplaceUrl ?? '', set: (v) => (db.forceReplaceUrl = v) },
                { label: language.stage.apiKey, get: () => db.proxyKey ?? '', set: (v) => (db.proxyKey = v) },
                { label: language.stage.customModel, get: () => db.customProxyRequestModel ?? '', set: (v) => (db.customProxyRequestModel = v) },
            ]
        }
        if (info?.keyIdentifier) {
            const id = info.keyIdentifier
            return [{ label: language.stage.apiKey, get: () => db.OaiCompAPIKeys?.[id] ?? '', set: (v) => ((db.OaiCompAPIKeys ??= {})[id] = v) }]
        }
        switch (info?.provider) {
            case LLMProvider.OpenAI:
                return [{ label: language.stage.apiKey, get: () => db.openAIKey ?? '', set: (v) => (db.openAIKey = v) }]
            case LLMProvider.Anthropic:
            case LLMProvider.AWS:
                return [{ label: language.stage.apiKey, get: () => db.claudeAPIKey ?? '', set: (v) => (db.claudeAPIKey = v) }]
            case LLMProvider.GoogleCloud:
                return [{ label: language.stage.apiKey, get: () => db.google?.accessToken ?? '', set: (v) => (db.google.accessToken = v) }]
            case LLMProvider.Mistral:
                return [{ label: language.stage.apiKey, get: () => db.mistralKey ?? '', set: (v) => (db.mistralKey = v) }]
            default:
                return []
        }
    })

    function choose(id: string) {
        DBState.db.aiModel = id
        pickerOpen = false
    }

    function moreOptions() {
        SettingsMenuIndex.set(1)
        settingsOpen.set(true)
    }
</script>

<StagePage title={language.stage.aiModel} {close}>
    {#if DBState.db.botPresets?.length > 1}
        <div class="stage-section">{language.stage.preset}</div>
        <div class="stage-chips">
            {#each DBState.db.botPresets as p, i}
                <button class="stage-chip-opt" class:on={i === DBState.db.botPresetsId} onclick={() => changeToPreset(i)}>{p.name}</button>
            {/each}
        </div>
    {/if}

    <div class="stage-section">{language.stage.model}</div>
    <div class="stage-list">
        <button class="stage-row" onclick={() => (pickerOpen = true)}>
            <span class="stage-row-text">
                <b>{info?.fullName ?? info?.name ?? DBState.db.aiModel}</b>
                <small>{language.stage.chooseModel}</small>
            </span>
            <span class="stage-row-end"><ChevronRightIcon size={18} /></span>
        </button>
    </div>

    {#each keyFields as field}
        <label class="stage-field" style="margin-top:14px">
            {field.label}
            <input
                class="stage-input"
                type={field.label === language.stage.apiKey ? 'password' : 'text'}
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                value={field.get()}
                oninput={(e) => field.set(e.currentTarget.value)}
            />
            {#if field.label === language.stage.apiKey}<small>{language.stage.apiKeyHint}</small>{/if}
        </label>
    {/each}

    {#if usesTemperature}
        <div class="stage-section">{language.stage.temperature}</div>
        <div class="stage-temp">
            <input
                type="range"
                min="0"
                max="200"
                step="1"
                disabled={!tempOn}
                value={tempOn ? DBState.db.temperature : 80}
                oninput={(e) => (DBState.db.temperature = Number(e.currentTarget.value))}
            />
            <b>{tempOn ? (DBState.db.temperature / 100).toFixed(2) : '—'}</b>
        </div>
        <p class="stage-note">{language.stage.temperatureHint}</p>
        <button class="stage-row stage-temp-off" role="switch" aria-checked={!tempOn} onclick={() => (DBState.db.temperature = tempOn ? -1000 : 80)}>
            <span class="stage-row-text"><b>{language.stage.temperatureOff}</b></span>
            <i class="stage-switch" class:on={!tempOn}></i>
        </button>
    {/if}

    <div class="stage-section">{language.stage.maxResponse}</div>
    <input class="stage-input" type="number" min="1" inputmode="numeric" bind:value={DBState.db.maxResponse} />
    <div class="stage-section">{language.stage.maxContext}</div>
    <input class="stage-input" type="number" min="1" inputmode="numeric" bind:value={DBState.db.maxContext} />

    <div class="stage-btns">
        <button class="stage-btn block" onclick={moreOptions}><SlidersHorizontalIcon size={18} />{language.stage.moreModelOptions}</button>
    </div>
    <p class="stage-note">{language.stage.moreModelOptionsHint}</p>
</StagePage>

{#if pickerOpen}
    <StageModelPicker title={language.stage.chooseModel} value={DBState.db.aiModel} pick={choose} close={() => (pickerOpen = false)} />
{/if}

<style>
    .stage-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    .stage-chip-opt {
        min-height: 40px;
        padding: 0 14px;
        border-radius: 999px;
        background: var(--stage-surface);
        border: 1px solid var(--stage-line);
        font-size: 14px;
        font-weight: 600;
    }
    .stage-chip-opt.on {
        background: var(--stage-accent);
        border-color: var(--stage-accent);
        color: #fff;
    }
    .stage-temp {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .stage-temp input {
        flex: 1;
        accent-color: var(--stage-accent);
        height: 32px;
    }
    .stage-temp b {
        width: 44px;
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .stage-temp-off {
        margin-top: 6px;
        border-radius: 14px;
        background: var(--stage-surface);
    }
</style>
