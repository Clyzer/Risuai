<script lang="ts">
    // Risu's everyday dialogs as Stage sheets (see stageAlerts.ts for which, and the answers each
    // one gives back). Mounted at the app level, so they also show over Risu's settings.
    import { BookOpenIcon, CopyIcon, DownloadIcon, LoaderCircleIcon, PencilLineIcon, UserRoundPlusIcon, UsersIcon } from '@lucide/svelte'
    import { get } from 'svelte/store'
    import { language } from 'src/lang'
    import { alertStore, DBState } from 'src/ts/stores.svelte'
    import StageSheet from './StageSheet.svelte'
    import { STAGE_ALERTS } from './stageAlerts'

    type Alert = { type: string; msg: string; submsg?: string; datalist?: [string, string][]; stackTrace?: string; defaultValue?: string }
    let a = $derived($alertStore as Alert)
    let inputValue = $state('')
    let copied = $state(false)

    function answer(msg: string) {
        alertStore.set({ type: 'none', msg })
    }

    $effect(() => {
        if (a.type === 'input') inputValue = a.defaultValue ?? ''
    })

    $effect(() => {
        if (a.type !== 'toast') return
        const shown = a
        const timer = setTimeout(() => {
            if (get(alertStore) === shown) answer('')
        }, 2600)
        return () => clearTimeout(timer)
    })

    let select = $derived.by(() => {
        if (a.type !== 'select') return { text: '', options: [] as string[] }
        if (a.msg.startsWith('__DISPLAY__')) {
            const parts = a.msg.substring(11).split('||')
            return { text: parts[0], options: parts.slice(1) }
        }
        return { text: '', options: a.msg.split('||') }
    })

    async function copyDetails() {
        await navigator.clipboard?.writeText(`${a.msg}\n\n${a.stackTrace ?? ''}`)
        copied = true
        setTimeout(() => (copied = false), 1200)
    }
</script>

{#if STAGE_ALERTS.has(a.type)}
    <div class="stage-alerts">
        {#if a.type === 'toast'}
            <div class="stage-toast" role="status">{a.msg}</div>
        {:else if a.type === 'wait' || a.type === 'wait2' || a.type === 'progress'}
            <StageSheet dismissible={false}>
                <div class="stage-wait">
                    <span class="spin"><LoaderCircleIcon size={22} /></span>
                    <p>{a.msg}</p>
                </div>
                {#if a.type === 'progress'}
                    <div class="stage-progress"><i style:width={`${Number(a.submsg) || 0}%`}></i></div>
                    <small class="stage-progress-n">{a.submsg}%</small>
                {:else if a.submsg}
                    <small class="stage-sub">{a.submsg}</small>
                {/if}
            </StageSheet>
        {:else if a.type === 'ask' || a.type === 'pluginconfirm'}
            <StageSheet title={a.type === 'pluginconfirm' ? language.pluginImport : undefined} subtitle={a.msg} close={() => answer('no')}>
                <div class="stage-actions">
                    <button class="stage-act" onclick={() => answer('no')}>{language.cancel}</button>
                    <button class="stage-act primary" onclick={() => answer('yes')}>{language.confirm}</button>
                </div>
            </StageSheet>
        {:else if a.type === 'select'}
            <StageSheet subtitle={select.text || undefined} dismissible={false}>
                <div class="stage-options">
                    {#each select.options as option, i}
                        <button onclick={() => answer(i.toString())}>{option}</button>
                    {/each}
                </div>
            </StageSheet>
        {:else if a.type === 'input'}
            <StageSheet subtitle={a.msg} dismissible={false}>
                <!-- svelte-ignore a11y_autofocus -->
                <input
                    class="stage-text"
                    bind:value={inputValue}
                    list="stage-alert-list"
                    autofocus
                    onkeydown={(e) => {
                        if (e.key === 'Enter') answer(inputValue)
                    }}
                />
                {#if a.datalist?.length}
                    <datalist id="stage-alert-list">
                        {#each a.datalist as [value, label]}<option {value}>{label}</option>{/each}
                    </datalist>
                {/if}
                <div class="stage-actions">
                    <button class="stage-act primary" onclick={() => answer(inputValue)}>{language.ok}</button>
                </div>
            </StageSheet>
        {:else if a.type === 'addchar'}
            <StageSheet title={language.addCharacter} close={() => answer('cancel')}>
                <div class="stage-options rich">
                    <button onclick={() => answer('importCharacter')}><DownloadIcon size={20} /><span><b>{language.importCharacter}</b></span></button>
                    <button onclick={() => answer('importFromRealm')}><BookOpenIcon size={20} /><span><b>{language.importFromRealm}</b><small>{language.importFromRealmDesc}</small></span></button>
                    <button onclick={() => answer('createfromScratch')}><PencilLineIcon size={20} /><span><b>{language.createfromScratch}</b></span></button>
                    <button onclick={() => answer('createGroup')}><UsersIcon size={20} /><span><b>{language.createGroup}</b></span></button>
                </div>
            </StageSheet>
        {:else if a.type === 'chatOptions'}
            <StageSheet title={language.chatOptions} close={() => answer('cancel')}>
                <div class="stage-options rich">
                    <button onclick={() => answer('0')}><CopyIcon size={20} /><span><b>{language.createCopy}</b></span></button>
                    <button onclick={() => answer('1')}><UserRoundPlusIcon size={20} /><span><b>{language.bindPersona}</b></span></button>
                    {#if DBState.db.useExperimental}
                        <button onclick={() => answer('2')}><UsersIcon size={20} /><span><b>{language.createMultiuserRoom}</b></span></button>
                    {/if}
                </div>
            </StageSheet>
        {:else}
            <StageSheet title={a.type === 'error' ? language.error : undefined} subtitle={a.msg} close={() => answer('')}>
                <div class="stage-actions">
                    {#if a.type === 'error' && a.stackTrace}
                        <button class="stage-act" onclick={copyDetails}>{copied ? language.copied : language.copy}</button>
                    {/if}
                    <button class="stage-act primary" onclick={() => answer('')}>{language.ok}</button>
                </div>
            </StageSheet>
        {/if}
    </div>
{/if}

<style>
    /* Same palette as the Stage shell (StageApp), for sheets shown outside it (over Risu's settings). */
    .stage-alerts {
        --stage-bg: var(--risu-theme-darkbg);
        --stage-surface: color-mix(in oklab, var(--risu-theme-darkbg) 90%, var(--risu-theme-textcolor));
        --stage-raised: color-mix(in oklab, var(--risu-theme-darkbg) 82%, var(--risu-theme-textcolor));
        --stage-line: color-mix(in oklab, var(--risu-theme-textcolor) 9%, transparent);
        --stage-muted: var(--risu-theme-textcolor2);
        --stage-accent: #5b8cff;
        position: relative;
        z-index: 1200;
        color: var(--risu-theme-textcolor);
    }
    .stage-toast {
        position: fixed;
        left: 50%;
        bottom: calc(90px + env(safe-area-inset-bottom, 0px));
        z-index: 1201;
        max-width: calc(100% - 32px);
        translate: -50% 0;
        padding: 12px 18px;
        border-radius: 14px;
        background: var(--stage-raised);
        box-shadow: 0 10px 30px rgb(0 0 0 / 0.4);
        font-size: 15px;
        animation: stage-toast-in 0.25s ease-out;
    }
    .stage-wait {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 6px 0 4px;
    }
    .stage-wait p {
        margin: 0;
        font-size: 15px;
        line-height: 1.45;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    .spin {
        flex: none;
        display: grid;
        color: var(--stage-accent);
        animation: stage-alert-spin 0.9s linear infinite;
    }
    .stage-progress {
        height: 8px;
        margin-top: 14px;
        border-radius: 4px;
        overflow: hidden;
        background: var(--stage-surface);
    }
    .stage-progress i {
        display: block;
        height: 100%;
        background: var(--stage-accent);
        transition: width 0.3s ease;
    }
    .stage-progress-n,
    .stage-sub {
        display: block;
        margin-top: 8px;
        font-size: 13px;
        color: var(--stage-muted);
    }
    .stage-actions {
        display: flex;
        gap: 10px;
        margin-top: 12px;
    }
    .stage-act {
        flex: 1;
        min-height: 50px;
        border-radius: 14px;
        background: var(--stage-surface);
        font-size: 16px;
        font-weight: 700;
    }
    .stage-act.primary {
        background: var(--stage-accent);
        color: #fff;
    }
    .stage-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
    }
    .stage-options button {
        min-height: 52px;
        padding: 10px 16px;
        border-radius: 14px;
        background: var(--stage-surface);
        font-size: 16px;
        font-weight: 600;
        text-align: left;
    }
    .stage-options.rich button {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .stage-options.rich :global(svg) {
        flex: none;
        color: var(--stage-muted);
    }
    .stage-options.rich span {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .stage-options.rich small {
        font-size: 13px;
        font-weight: 400;
        color: var(--stage-muted);
    }
    .stage-text {
        width: 100%;
        min-height: 48px;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid var(--stage-line);
        background: var(--stage-surface);
        color: var(--risu-theme-textcolor);
        font-size: 16px;
    }
    @keyframes stage-alert-spin {
        to {
            rotate: 360deg;
        }
    }
    @keyframes stage-toast-in {
        from {
            opacity: 0;
            translate: -50% 10px;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .spin,
        .stage-toast {
            animation: none;
        }
    }
</style>
