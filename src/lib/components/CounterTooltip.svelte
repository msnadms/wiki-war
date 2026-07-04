<script lang="ts">
    import { TypeCounters } from '$lib/battle-engine';
    import type { CardCategory } from '$lib/wikipedia.model'

    let 
        { category, x, y }: 
        { category: CardCategory, x: number, y: number } = $props()

    const colors: Record<CardCategory, string> = {
        people:    '#e8a838',
        geography: '#38b8e8',
        science:   '#5b8dee',
        nature:    '#4caf72',
        media:     '#a855d4',
        sports:    '#f06030',
        history:   '#b08050',
        neutral:   '#888888',
    }
</script>

<div class="counter-list" style="left: {x + 12}px; top: {y + 12}px; border-color: {colors[category]}">
    <p><b style="color: {colors[category]}">{category}</b> counters:</p>
    {#each TypeCounters[category] as counter}
        <p style="color: {colors[counter.category]}"><b>{counter.category}</b> <span class="mult">×{counter.multiplier}</span></p>
    {/each}
</div>

<style>
    .counter-list {
        position: fixed;
        z-index: 1000;
        background: var(--bg);
        border: 1px solid var(--border);
        padding: 8px 12px;
        pointer-events: none;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        min-width: 120px;
    }
    .counter-list p {
        margin: 2px 0;
    }
    .mult {
        opacity: 0.6;
    }
</style>