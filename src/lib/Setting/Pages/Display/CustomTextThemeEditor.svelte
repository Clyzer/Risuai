<script lang="ts">
    import { DBState } from 'src/ts/stores.svelte';
    import { language } from 'src/lang';
    import { updateTextThemeAndCSS } from 'src/ts/gui/colorscheme';
    import ColorInput from 'src/lib/UI/GUI/ColorInput.svelte';

    const colors = [
        ['FontColorStandard', language.textNormal, false],
        ['FontColorItalic', language.textItalic, false],
        ['FontColorBold', language.textBold, false],
        ['FontColorItalicBold', language.textItalicBold, false],
        ['FontColorQuote1', language.textSingleQuote, true],
        ['FontColorQuote2', language.textDoubleQuote, true],
    ] as const;
</script>

{#if DBState.db.textTheme === 'custom'}
    {#each colors as color}
        <div class="flex items-center mt-2">
            <ColorInput
                nullable={color[2]}
                bind:value={DBState.db.customTextTheme[color[0]]}
                oninput={updateTextThemeAndCSS}
            />
            <span class="ml-2">{color[1]}</span>
        </div>
    {/each}
{/if}
