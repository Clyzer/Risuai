<script lang="ts">
    // Other models: the auxiliary model Risu uses for memory, translation and background tasks
    // (db.subModel). Image generation, voice, embeddings and the rest of Risu's "Other bots" page
    // stay one tap away.
    import { ChevronRightIcon, SlidersHorizontalIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, SettingsMenuIndex, settingsOpen } from 'src/ts/stores.svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import StagePage from './StagePage.svelte'
    import StageModelPicker from './StageModelPicker.svelte'

    interface Props {
        close: () => void
    }

    let { close }: Props = $props()

    let pickerOpen = $state(false)
    let info = $derived(getModelInfo(DBState.db.subModel))

    function more() {
        SettingsMenuIndex.set(2)
        settingsOpen.set(true)
    }
</script>

<StagePage title={language.otherBots} {close}>
    <div class="stage-section">{language.stage.subModel}</div>
    <div class="stage-list">
        <button class="stage-row" onclick={() => (pickerOpen = true)}>
            <span class="stage-row-text"><b>{info?.fullName ?? info?.name ?? DBState.db.subModel}</b><small>{language.stage.chooseModel}</small></span>
            <span class="stage-row-end"><ChevronRightIcon size={18} /></span>
        </button>
    </div>
    <p class="stage-note">{language.stage.subModelHint}</p>
    <div class="stage-btns">
        <button class="stage-btn block" onclick={more}><SlidersHorizontalIcon size={18} />{language.stage.moreOtherModels}</button>
    </div>
    <p class="stage-note">{language.stage.moreOtherModelsHint}</p>
</StagePage>

{#if pickerOpen}
    <StageModelPicker title={language.stage.subModel} value={DBState.db.subModel} pick={(id) => ((DBState.db.subModel = id), (pickerOpen = false))} close={() => (pickerOpen = false)} />
{/if}
