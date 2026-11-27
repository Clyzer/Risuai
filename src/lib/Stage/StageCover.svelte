<script lang="ts">
    // Character image for Stage cards. Resolves the stored asset path the same way the rest of Risu does.
    import { getCharImage } from 'src/ts/characters'

    interface Props {
        image: string
        alt?: string
        class?: string
    }

    let { image, alt = '', class: className = '' }: Props = $props()

    let src = $state<string | null>(null)

    $effect(() => {
        const current = image
        let cancelled = false
        src = null
        getCharImage(current, 'plain').then((url) => {
            if (!cancelled) src = url
        })
        return () => {
            cancelled = true
        }
    })
</script>

{#if src}
    <img class="stage-cover-img {className}" {src} {alt} loading="lazy" decoding="async" draggable="false" />
{:else}
    <div class="stage-cover-img stage-cover-empty {className}" aria-hidden="true"></div>
{/if}

<style>
    .stage-cover-img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 50% 20%;
    }
    .stage-cover-empty {
        background: linear-gradient(160deg, var(--stage-raised), var(--stage-surface));
    }
</style>
