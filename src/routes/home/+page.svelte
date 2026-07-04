<script lang="ts">
    import { enhance } from '$app/forms';
    import { invalidateCardCache } from '$lib/database';
    import { onMount, tick } from 'svelte';
    import type { WikiCard } from '$lib/wikipedia.model.js';
    import { authState } from '$lib/auth.svelte.js';
    import Card from '$lib/components/Card.svelte';
    import { getEnrageMultiplier, getNextBossAction, isRoundLoading, resetBattle, restoreBattleState, type BattleState } from '$lib/battle.svelte';
    import swords from '$lib/assets/swords.svg';
    import shield from '$lib/assets/shield.svg';
    import flip from '$lib/assets/flip.svg';
    import chest from '$lib/assets/chest.png'
    import keyhole from '$lib/assets/keyhole.svg'

    let { form } = $props();

    let articles: WikiCard[] | null = $state(null);
    let show: boolean = $state(false)
    let refreshKey = $state(0);
    let boss: WikiCard | null = $state(null)
    let loading = $state(false);
    let battleLoading = $derived(isRoundLoading())
    const nextAction = $derived(getNextBossAction())
    const enrageMult = $derived(getEnrageMultiplier())
    let flipSignal = $state(0)
    let formEl: HTMLFormElement;

    onMount(() => {
        formEl.requestSubmit();
    });
</script>

<div class="container">
    {#if !show && !loading}
        <img src={chest} alt="chest" class="chest" />
        <button class="open" disabled={loading} onclick={() => show = true}><img src={keyhole} alt="OPEN" class="keyhole" /></button>
    {/if}
    {#if boss && articles && show}
        <div class="board">
            <div class="boss-display">
                <div class="boss"><Card bind:article={boss} index={0} /></div>
                <div class="boss-intent">
                    {#if nextAction === 'attack'}
                        <img src={swords} alt="ATK" class="action" title="Boss intends to attack next turn" />
                    {:else if nextAction === 'block'}
                        <img src={shield} alt="DEF" class="action" title="Boss intends to heal next turn" />
                    {/if}
                    {#if enrageMult > 1}
                        <p class="enrage" title="The boss is enraged: its attacks deal increased damage">ENRAGED &times;{enrageMult}</p>
                    {/if}
                </div>
            </div>
            <div class="bottom-board">
                <button onclick={() => flipSignal++}><img src={flip} alt="flip" class="flip" /></button>
                <div class="article-list" class:battleLoading>
                    {#each articles as _, index}
                        <Card bind:article={articles[index]} index={index + 1} {flipSignal} />
                    {/each}
                </div>
            </div>
        </div>
    {/if}
    {#if (form as {error?: string})?.error}
        <p class="error">{(form as {error: string}).error}</p>
    {/if}
    <form
        bind:this={formEl}
        method="POST"
        action="?/refresh"
        use:enhance = {async ({ formData }) => {
            loading = true;
            const token = await authState.user!.getIdToken();
            formData.set('token', token);
            return async ({ result }) => {
                if (result.type === 'success' && result.data?.articles) {
                    resetBattle();
                    articles = result.data.articles as WikiCard[];
                    boss = result.data.boss as WikiCard ?? null;
                    show = !!result.data.useDaily
                    refreshKey++;
                    invalidateCardCache();
                    if (result.data.battleState) {
                        await tick(); 
                        restoreBattleState(result.data.battleState as BattleState);
                    }
                }
                loading = false;
            };
        }}
    >
        <button class="primary refresh" disabled={loading} onclick={() => show = false}>{loading ? 'Loading...' : 'Refresh'}</button>
    </form>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        align-items: center;
    }
    .board {
        display: grid;
        grid-template-rows: 1fr 1fr;
        align-items: center;
        justify-items: center;
        width: 100%;
    }
    .article-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        align-items: center;
        justify-content: center;
        padding: 15px 100px;
        border: 3px solid var(--border-muted);
        border-radius: 10px;
        background-color: var(--bg-secondary);
    }
    .article-list.battleLoading {
        opacity: 0.5;
    }
    .bottom-board {
        display: flex;
        flex-direction: row;
        margin-left: -110px;
    }
    .bottom-board .flip {
        filter: invert(69%) sepia(0%) saturate(13%) hue-rotate(161deg) brightness(86%) contrast(97%);
        width: 100px;
        height: 100px;
    }
    .bottom-board button {
        background-color: transparent;
        border: none;
        align-self: center;
        cursor: pointer;
        margin-right: 10px;
    }
    .bottom-board button:hover {
        transform: scale(1.05);
    }
    .chest {
        width: 600px;
        height: 600px;
    }
    .keyhole {
        width: 50px;
        height: 50px;
    }
    .open {
        margin-top: 20px;
        width: 140px;
        height: 130px;
        font-size: 24px;
        font-family: inherit;
        letter-spacing: 0.1em;
        color: var(--fg-secondary);
        border: 5px double black;
        border-bottom-right-radius: 150px;
        border-bottom-left-radius: 150px;
        position: absolute;
        top: 240px;
    }
    .open:hover {
        cursor: pointer;
    }
    .refresh {
        position: absolute;
        top: 10px;
        left: 210px;
    }
    .boss-display {
        display: grid;
        gap: 50px;
        grid-template-columns: repeat(3, 1fr);
        margin-left: 10px;
    }
    .boss-display img {
        align-self: center;
        height: 100px;
        width: 100px;
    }
    .boss-display .action {
        filter: invert(12%) sepia(65%) saturate(2827%) hue-rotate(346deg) brightness(97%) contrast(119%);
    }
    .boss-intent {
        display: flex;
        flex-direction: column;
        align-items: center;
        align-self: center;
        gap: 4px;
    }
    .boss-intent .enrage {
        color: #c00000;
        font-weight: bold;
        letter-spacing: 0.08em;
        font-size: 14px;
    }
    .boss-display .boss {
        grid-column-start: 2;
    }
    .error {
        color: red;
    }
</style>
