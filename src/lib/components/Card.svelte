<script lang="ts">
    import { getPendingAction, isRoundLoading, registerCard, selectTarget, setBoss, startAction, type Action } from '$lib/battle.svelte';
    import { toggleUsed } from '$lib/carduses.svelte';
    import type { WikiCard } from '$lib/wikipedia.model';
    import { onMount, untrack } from 'svelte';
    import CounterTooltip from './CounterTooltip.svelte';
    import swords from '$lib/assets/swords.svg';
    import shield from '$lib/assets/shield.svg';
    import block from '$lib/assets/block.svg'
    import hp from '$lib/assets/hp.svg';

    let
        { article = $bindable(), index = 0, onTable = false, flipSignal = 0 }:
        { article: WikiCard; index?: number; onTable?: boolean; flipSignal?: number } = $props();

    $effect(() => {
        flipSignal;
        if (flipSignal === 0) return;
        untrack(() => handleFlip());
    });

    let flipped = $state(false);
    let flipClass: 'flip-out' | 'flip-in' | '' = $state('');
    let attacked = $state(false);
    let showTooltip = $state(false);
    let tooltipX = $state(0);
    let tooltipY = $state(0);

    function handleCategoryEnter(e: MouseEvent) {
        tooltipX = e.clientX;
        tooltipY = e.clientY;
        showTooltip = true;
    }
    function handleCategoryLeave() { showTooltip = false; }

    let prevHp: number | undefined;
    let attackedTimer: ReturnType<typeof setTimeout> | undefined;
    $effect(() => {
        const currentHp = article.stats!.hp;
        if (prevHp !== undefined && currentHp < prevHp) {
            clearTimeout(attackedTimer);
            attacked = true;
            attackedTimer = setTimeout(() => (attacked = false), 400);
        }
        prevHp = currentHp;
        return () => clearTimeout(attackedTimer);
    });
    const animationTime = $derived(onTable ? 75 : 1000)
    const isPotentialTarget = $derived(getPendingAction() !== null && !onTable);
    const disabled: boolean = $derived(article.stats!.hp <= 0);
    const loading = $derived(isRoundLoading())

    onMount(() => {
        if (article.rarity === 'boss') {
            setBoss(article)
        } else {
            registerCard(article)
        }
    })

    function handleFlip() {
        if (flipClass) return;
        flipClass = 'flip-out';
        setTimeout(() => {
            flipped = !flipped;
            flipClass = 'flip-in';
            setTimeout(() => flipClass = '', 150);
        }, 150);
    }

    function handleAction(event: MouseEvent, action: Action) {
        event.stopPropagation();
        if (action === 'use') {
            handleFlip();
            toggleUsed(article);
            return;
        }
        startAction(action, article);
    }
</script>

<div
    class="card {article.rarity}"
    class:disabled={disabled}
    class:madeMove={article.hasMadeMove}
    class:battleOver={article.battleOver}
    class:kept={article.kept && !onTable}
    style="animation-delay: {index * animationTime}ms"
    onclick={!isPotentialTarget ? handleFlip : () => selectTarget(article)}
    onkeydown={(e) => e.key === 'Enter' && (isPotentialTarget ? selectTarget(article) : handleFlip())}
    role="button"
    tabindex="0"
>
    <div 
        class="content {flipClass}" 
        class:flipped class:targetable={isPotentialTarget}
        class:disabled={disabled}
        class:attacked
    >
        {#if flipped}
            {@render stats()}
        {:else}
            <div class="title-category">
                <h4><a class="{article.rarity}" class:disabled href={article.pageUrl} onclick={(e) => e.stopPropagation()}>{article.title}</a></h4>
                {#if article.category && article.stats}
                    <div class="stats-category">
                        <p class="category-label" onmouseenter={handleCategoryEnter} onmouseleave={handleCategoryLeave}>{article.category}</p>
                        {@render statBlock()}
                    </div>
                {/if}
            </div>
            <p class="summary">{article.extract}</p>
            {#if article.thumbnailUrl}
                <div class="card-image {article.rarity}">
                    <img src={article.thumbnailUrl} alt={article.title} />
                </div>
            {/if}
        {/if}
    </div>
</div>

{#if showTooltip && article.category}
    <CounterTooltip category={article.category} x={tooltipX} y={tooltipY} />
{/if}

{#snippet statBlock()}
    <div class="stats">
        <span><b>{article.stats?.hp}</b> <img src={hp} alt="HP" class="stat-icon" /></span>
        <span><b>{article.stats?.atk}</b> <img src={swords} alt="ATK" class="stat-icon" /></span>
        <span><b>{article.stats?.def}</b> <img src={article.rarity === 'boss' ? shield : block} alt="DEF" class="stat-icon" /></span>
    </div>
{/snippet}

{#snippet stats()}
    <p class="rarity-label">{article.rarity}</p>
    {#if article.category}
        <p class="category-label" onmouseenter={handleCategoryEnter} onmouseleave={handleCategoryLeave}>{article.category}</p>
    {/if}
    {@render statBlock()}
    <p>{article.views} views in the last 5 years</p>
    {#if article.rarity !== 'boss'}
        <div class="actions">
            {#if !onTable}
                <button disabled={disabled || article.hasMadeMove || article.battleOver || loading} onclick={(e) => handleAction(e, 'attack')}><img src={swords} alt="Attack" class="stat-icon" /></button>
                <button disabled={disabled || article.hasMadeMove || article.battleOver || loading} onclick={(e) => handleAction(e, 'block')}><img src={block} alt="Block" class="stat-icon" /></button>
            {:else}
                <button onclick={(e) => handleAction(e, 'use')}>Use</button>
            {/if}
        </div>
        <div class="block"><b>{article.stats?.currentBlock}</b> BLOCK</div>
    {/if}
    {#if article.thumbnailUrl}
        <div class="card-image {article.rarity}">
            <img src={article.thumbnailUrl} alt={article.title} />
        </div>
    {/if}
{/snippet}

<style>
    .card {
        border: 3px solid var(--border);
        color: var(--fg);
        background-color: var(--bg);
        font: inherit;
        height: 375px;
        width: 200px;
        padding: 10px;
        overflow: hidden;
        perspective: 600px;
        animation: slideIn 0.4s ease both;
    }
    .card.common,   .card-image.common    { border-color: #7c7c7c; }
    .card.uncommon, .card-image.uncommon  { border-color: #292a38; background-color: #626586; }
    .card.rare,     .card-image.rare      { border-color: #a802b8; }
    .card.legendary,.card-image.legendary { border-color: #d3a200; }
    .card.boss,     .card-image.boss      { border-color: #c00000; }
    .card.rare:not(.disabled),
    .card.legendary:not(.disabled),
    .card.boss:not(.disabled, .kept) {
        background-size: 400% 400%;
        animation: gradient 5s ease infinite, slideIn 0.4s ease both;
    }
    .card.rare:not(.disabled) {
        background-image: linear-gradient(-45deg, #7a1394, #d189f3, #791d9e);
    }
    .card.legendary:not(.disabled) {
        box-shadow: 0 0 10px 7px #d3a200;
        background-image: linear-gradient(-45deg, #d3a200, #ffe9a0, #b38a04);
    }
    .card.boss:not(.disabled, .kept) {
        background-image: linear-gradient(-45deg, #630000, #ff6565, #851010);
    }
    .card.disabled:not(.kept) {
        background: repeating-linear-gradient(-45deg, #8b0000, #8b0000 20px, #aa0000 20px, #aa0000 40px);
        background-size: 200% 200%;
        animation: move-stripes 10s linear infinite, slideIn 0.4s ease both;
        box-shadow: 0 0 10px 7px #800808;
        border-color: #800808;
        color: #e0e0e0;
    }
    .content.attacked {
        animation: attacked 0.4s ease;
    }
    @keyframes attacked {
        0%   { transform: translateX(0); }
        20%  { transform: translateX(-8px); }
        40%  { transform: translateX(8px); }
        60%  { transform: translateX(-6px); }
        80%  { transform: translateX(6px); }
        100% { transform: translateX(0); }
    }
    .card.madeMove {
        border-color: #c5c5c5;
        border-style: dotted;
    }
    .card.kept {
        box-shadow: 0 0 10px 7px #ffffff69;
    }
    @keyframes move-stripes {
        100% {
            background-position: 100% 100%;
        }
    }
    @keyframes gradient {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    @keyframes slideIn {
        from { opacity: 0; transform: translateY(40px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    .card p {
        font-size: 12px;
        text-align: center;
    }
    .card h4 {
        text-transform: uppercase;
        overflow-wrap: break-word;
        hyphens: auto;
    }
    .card p, .card h4 {
        display: -webkit-box;
        -webkit-line-clamp: 7;
        line-clamp: 7;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .card-image {
        flex: 1;
        min-height: 0;
        margin: 0 -10px -10px -10px;
        border-top: 3px solid;
    }
    .card img:not(.stat-icon) {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    a:not(.disabled) { color: var(--fg); }
    a.rare      { color: #e0e0e0; }
    a.legendary { color: #000000; }
    a.disabled  { color: #e0e0e0; }
    .card.rare      { color: #e0e0e0; }
    .card.legendary { color: #000000; }

    .content {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        transition: transform 0.2s ease;
        will-change: transform;
    }
    .content:not(.flipped):not(.flip-in):not(.flip-out):not(.disabled):hover {
        transform: scale(1.05);
    }
    .content.targetable:not(.disabled):hover {
        transform: scale(1.05);
    }
    .content.flip-out,
    .content.flip-in {
        transition: none;
    }

    @keyframes flip-out {
        from { transform: rotateY(0deg); }
        to   { transform: rotateY(90deg); }
    }
    @keyframes flip-in {
        from { transform: rotateY(-90deg); }
        to   { transform: rotateY(0deg); }
    }
    .content.flip-out { animation: flip-out 0.15s ease-in  forwards; }
    .content.flip-in  { animation: flip-in  0.15s ease-out forwards; }

    .rarity-label, .category-label {
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.1em;
        opacity: 0.7;
    }

    .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        padding: 10px;
    }
    .actions button {
        border: 1px solid black;
        background-color: var(--bg-secondary);
        color: var(--fg);
        cursor: pointer;
        height: 35px;
    }
    .actions button:hover {
        background-color: var(--bg);
    }
    .title-category {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 10px;
    }
    .stats {
        display: flex;
        flex-direction: column;
        text-transform: uppercase;
        font-size: 16px;
        opacity: 0.7;
        color: var(--fg);
        justify-content: center;
        align-items: center;
        border: 1px solid var(--fg);
        border-radius: 10px;
        background-color: var(--bg);
        align-self: center;
        padding: 5px;
    }
    .stats b {
        opacity: 1;
    }
    .stat-icon {
        width: 20px;
        height: 20px;
        vertical-align: middle;
        opacity: 0.9;
        filter: invert(1);
    }
    :global([data-theme='light']) .stat-icon { filter: brightness(0); }
    .block {
        align-self: center;
        margin-bottom: 20px;
    }
</style>
