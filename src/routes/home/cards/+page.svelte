<script lang="ts">
    import { getCardsForUser } from "$lib/database";
    import type { WikiCard, Rarity } from "$lib/wikipedia.model";
    import { onMount } from "svelte";
    import Card from "$lib/components/Card.svelte";

    const CARD_MIN_WIDTH = 220;
    const GRID_GAP = 20;
    const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

    let articles: WikiCard[] | null = $state(null);
    let search = $state('');
    let selectedRarity: Rarity | null = $state(null);
    let page = $state(0);
    let gridEl: HTMLDivElement | undefined = $state();
    let gridWidth = $state(0);

    let columns = $derived(Math.max(1, Math.floor((gridWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP))));
    let pageSize = $derived(columns * 2);

    let filtered = $derived.by(() => {
        if (!articles) return [];
        let result = articles;
        if (selectedRarity) result = result.filter(a => a.rarity === selectedRarity);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(a => a.title.toLowerCase().includes(q));
        }
        return result;
    });

    let pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
    let clampedPage = $derived(Math.min(page, pageCount - 1));
    let pageItems = $derived(filtered.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize));

    function setRarity(r: Rarity | null) {
        selectedRarity = r;
        page = 0;
    }

    function onSearch() {
        page = 0;
    }

    onMount(() => {
        const ro = new ResizeObserver(([entry]) => {
            gridWidth = entry.contentRect.width;
        });
        ro.observe(gridEl!);
        getCardsForUser().then(result => { articles = result; });
        return () => ro.disconnect();
    });
</script>

<div class="page-wrapper" bind:this={gridEl}>
<div class="controls">
    <input
        class="search"
        type="search"
        placeholder="Search cards..."
        bind:value={search}
        oninput={onSearch}
    />
    <div class="rarity-filters">
        <button class="primary" class:active={selectedRarity === null} onclick={() => setRarity(null)}>All</button>
        {#each RARITIES as r}
            <button class="primary rarity-btn {r}" class:active={selectedRarity === r} onclick={() => setRarity(r)}>{r}</button>
        {/each}
        {#if articles && pageCount > 1}
            <div class="pagination">
                <button class="primary" disabled={clampedPage === 0} onclick={() => page--}>Prev</button>
                <span>{clampedPage + 1} / {pageCount}</span>
                <button class="primary" disabled={clampedPage >= pageCount - 1} onclick={() => page++}>Next</button>
            </div>
        {/if}
    </div>
</div>

{#if articles === null}
    <p class="status">Loading...</p>
{:else if filtered.length === 0}
    <p class="status">No cards found.</p>
{:else}
    <div class="grid">
        {#each pageItems as article, index}
            <Card {article} {index} onTable={true}/>
        {/each}
    </div>

{/if}
</div>

<style>
    .page-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 0;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        margin-bottom: 20px;
    }

    .search {
        font: inherit;
        background: var(--bg);
        color: var(--fg);
        border: 1px solid var(--border);
        padding: 6px 10px;
        width: 100%;
        max-width: 320px;
        outline: none;
    }
    .search:focus {
        border-color: var(--fg);
    }

    .rarity-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .rarity-btn {
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.08em;
    }
    .rarity-btn.common    { border-color: #7c7c7c; color: #7c7c7c; }
    .rarity-btn.uncommon  { border-color: #626586; color: #626586; }
    .rarity-btn.rare      { border-color: #a802b8; color: #a802b8; }
    .rarity-btn.legendary { border-color: #d3a200; color: #d3a200; }
    .rarity-btn.boss      { border-color: #c00000; color: #c00000; }

    .primary.active {
        background-position: left center;
        color: var(--bg);
    }
    .rarity-btn.active.common    { background-color: #7c7c7c; }
    .rarity-btn.active.uncommon  { background-color: #626586; }
    .rarity-btn.active.rare      { background-color: #a802b8; }
    .rarity-btn.active.legendary { background-color: #d3a200; }
    .rarity-btn.active.boss      { background-color: #c00000; }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 20px;
        width: 100%;
    }

    .pagination {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        margin-left: 10px;
    }

    .status {
        opacity: 0.6;
    }
</style>
