<script lang="ts">
    // Edit the story's indicators (phase 8). Changes are saved on the spot in extentions.risuStage.
    import { ArrowLeftIcon, InfoIcon, PlusIcon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { detectedKind } from './stageKinds'
    import { getIndicators, isValidPattern, listVariables, newIndicatorId, readIndicator, setIndicators, type StageIndicator } from './stageIndicators'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let char = $derived(DBState.db.characters[$selectedCharID])
    let chat = $derived(char?.chats?.[char.chatPage])
    let list = $derived(getIndicators(char))
    let variables = $derived(listVariables(char, chat))
    let ownPanel = $derived(char ? detectedKind(char) === 'story' && ((char as any).backgroundHTML ?? '').trim().length > 0 : false)

    function save(next: StageIndicator[]) {
        if (char) setIndicators(char, next)
    }

    function update(id: string, patch: Partial<StageIndicator>) {
        save(list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    }

    function add() {
        const first = variables[0]
        save([
            ...list,
            {
                id: newIndicatorId(),
                label: first?.name ?? language.stage.indicatorNew,
                source: 'var',
                key: first?.name ?? '',
                display: first && Number.isFinite(parseFloat(first.value)) ? 'bar' : 'text',
                max: 100,
            },
        ])
    }

    function remove(id: string) {
        save(list.filter((i) => i.id !== id))
    }
</script>

<div class="stage-sub">
    <header class="stage-sub-top">
        <button class="stage-sub-back" aria-label={language.stage.back} onclick={close}><ArrowLeftIcon size={22} /></button>
        <b>{language.stage.indicators}</b>
    </header>
    <div class="stage-sub-body">
        <p class="stage-sub-lead">{language.stage.indicatorsIntro}</p>
        {#if ownPanel}
            <p class="stage-sub-note"><InfoIcon size={15} /><span>{language.stage.ownPanelNote}</span></p>
        {/if}

        <datalist id="stage-var-names">
            {#each variables as v}<option value={v.name}>{v.value}</option>{/each}
        </datalist>

        {#each list as ind (ind.id)}
            {@const value = char ? readIndicator(ind, char, chat) : ''}
            <div class="stage-ind">
                <div class="stage-ind-row">
                    <label class="stage-ind-field grow">
                        <span>{language.stage.indicatorName}</span>
                        <input type="text" value={ind.label} oninput={(e) => update(ind.id, { label: e.currentTarget.value })} />
                    </label>
                    <button class="stage-ind-del" aria-label={language.stage.removeIndicator} onclick={() => remove(ind.id)}><Trash2Icon size={18} /></button>
                </div>
                <div class="stage-ind-seg" role="radiogroup" aria-label={language.stage.indicatorSource}>
                    <button role="radio" aria-checked={ind.source === 'var'} class:on={ind.source === 'var'} onclick={() => update(ind.id, { source: 'var' })}>{language.stage.sourceVar}</button>
                    <button role="radio" aria-checked={ind.source === 'regex'} class:on={ind.source === 'regex'} onclick={() => update(ind.id, { source: 'regex' })}>{language.stage.sourceRegex}</button>
                </div>
                <label class="stage-ind-field">
                    <span>{ind.source === 'var' ? language.stage.indicatorVariable : language.stage.indicatorPattern}</span>
                    <input
                        type="text"
                        value={ind.key}
                        list={ind.source === 'var' ? 'stage-var-names' : undefined}
                        placeholder={ind.source === 'var' ? 'afinidad' : '\\[(.+?)\\]'}
                        autocapitalize="off"
                        spellcheck="false"
                        oninput={(e) => update(ind.id, { key: e.currentTarget.value })}
                    />
                    {#if ind.source === 'regex'}
                        <small class:bad={!isValidPattern(ind.key)}>{isValidPattern(ind.key) ? language.stage.patternHelp : language.stage.patternInvalid}</small>
                    {/if}
                </label>
                <div class="stage-ind-row">
                    <div class="stage-ind-seg small" role="radiogroup" aria-label={language.stage.indicatorDisplay}>
                        <button role="radio" aria-checked={ind.display === 'bar'} class:on={ind.display === 'bar'} onclick={() => update(ind.id, { display: 'bar' })}>{language.stage.displayBar}</button>
                        <button role="radio" aria-checked={ind.display === 'text'} class:on={ind.display === 'text'} onclick={() => update(ind.id, { display: 'text' })}>{language.stage.displayText}</button>
                    </div>
                    {#if ind.display === 'bar'}
                        <label class="stage-ind-field max">
                            <span>{language.stage.indicatorMax}</span>
                            <input type="number" min="1" value={ind.max ?? 100} oninput={(e) => update(ind.id, { max: Number(e.currentTarget.value) || 100 })} />
                        </label>
                    {/if}
                </div>
                <div class="stage-ind-now">{language.stage.indicatorNow}: <b>{value || '—'}</b></div>
            </div>
        {/each}

        <button class="stage-sub-add" onclick={add}><PlusIcon size={18} />{language.stage.addIndicator}</button>
        <p class="stage-sub-note"><InfoIcon size={15} /><span>{language.stage.indicatorsSaved}</span></p>
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
    .stage-sub-note {
        display: flex;
        gap: 8px;
        margin: 10px 0;
        font-size: 13px;
        line-height: 1.45;
        color: var(--stage-muted);
    }
    .stage-sub-note :global(svg) {
        flex: none;
        margin-top: 2px;
    }
    .stage-ind {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 14px;
        background: var(--stage-surface);
    }
    .stage-ind-row {
        display: flex;
        align-items: flex-end;
        gap: 10px;
    }
    .stage-ind-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        font-size: 12px;
        color: var(--stage-muted);
    }
    .stage-ind-field.grow {
        flex: 1;
    }
    .stage-ind-field.max {
        width: 96px;
    }
    .stage-ind-field input {
        height: 42px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1px solid var(--stage-line);
        background: var(--stage-bg);
        color: var(--risu-theme-textcolor);
        font-size: 16px;
        min-width: 0;
    }
    .stage-ind-field small {
        font-size: 12px;
    }
    .stage-ind-field small.bad {
        color: #ff8a8a;
    }
    .stage-ind-del {
        flex: none;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        color: var(--stage-muted);
    }
    .stage-ind-seg {
        display: flex;
        padding: 3px;
        border-radius: 999px;
        background: var(--stage-bg);
    }
    .stage-ind-seg.small {
        flex: 1;
    }
    .stage-ind-seg button {
        flex: 1;
        min-height: 36px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        color: var(--stage-muted);
    }
    .stage-ind-seg button.on {
        background: var(--risu-theme-textcolor);
        color: var(--stage-bg);
    }
    .stage-ind-now {
        font-size: 13px;
        color: var(--stage-muted);
        overflow-wrap: anywhere;
    }
    .stage-ind-now b {
        color: var(--risu-theme-textcolor);
    }
    .stage-sub-add {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        height: 48px;
        border-radius: 14px;
        border: 1px dashed var(--stage-line);
        font-weight: 700;
        color: var(--stage-accent);
    }
</style>
