<script lang="ts">
    import { enhance } from '$app/forms';
    import { invalidateCardCache } from '$lib/database';
    import { onMount, tick } from 'svelte';
    import type { WikiCard } from '$lib/wikipedia.model.js';
    import { authState } from '$lib/auth.svelte.js';
    import Card from '$lib/components/Card.svelte';
    import { isRoundLoading, resetBattle, restoreBattleState, type BattleState } from '$lib/battle.svelte';

    let { form } = $props();

    let articles: WikiCard[] | null = $state(null);
    let show: boolean = $state(false)
    let refreshKey = $state(0);
    let boss: WikiCard | null = $state(null)
    let loading = $state(false);
    let battleLoading = $derived(isRoundLoading())
    let formEl: HTMLFormElement;

    onMount(() => {
        formEl.requestSubmit();
    });
</script>

<div class="container">
    {#if !show && !loading}
        <button class="open" disabled={loading} onclick={() => show = true}>OPEN</button>
    {/if}
    {#if boss && articles && show}
        <div class="board">
            <div>
                <Card bind:article={boss} index={0} />
            </div>
            <div class="article-list" class:battleLoading>
                {#each articles as _, index}
                    <Card bind:article={articles[index]} index={index + 1} />
                {/each}
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
    .open {
        margin-top: 20px;
        width: 150px;
        height: 150px;
        font-size: 24px;
        font-family: inherit;
        letter-spacing: 0.1em;
        color: var(--fg-secondary);
        border: 1px solid #d3a200;
        border-radius: 150px;
    }
    .open:hover {
        cursor: pointer;
    }
    .refresh {
        position: absolute;
        top: 10px;
        left: 210px;
    }
    .error {
        color: red;
    }
</style>
