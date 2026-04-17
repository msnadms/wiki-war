<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { authState, signOut } from '$lib/auth.svelte';
    import { usedCards, toggleUsed } from '$lib/carduses.svelte';
    import { themeState } from '$lib/theme.svelte';
    import Card from './Card.svelte';

    const goToRoute = $derived(page.url.pathname === '/home/cards' ? 'Home' : 'Cards');

    function navigate() {
        goto(goToRoute === 'Cards' ? '/home/cards' : '/home');
    }
</script>

<nav>
    <div class="header">
        <h1>Wiki War</h1>
        <button class="navigate primary" onclick={navigate}>{goToRoute}</button>
        <div class="used-cards">
            {#each usedCards as article}
                <div>
                    <span
                        class="rarity {article.rarity}"
                        role="button"
                        tabindex="0"
                        onclick={() => toggleUsed(article)}
                        onkeydown={(e) => e.key === 'Enter' && toggleUsed(article)}
                    >{article.title}</span>
                </div>
            {/each}
        </div>
    </div>
    <div class="bottom">
        {#if authState.user}
            <span>{authState.user.displayName}</span>
            <button class="primary" onclick={signOut}>Sign out</button>
        {/if}
        <button class="theme-toggle primary" onclick={themeState.toggle}>
            {themeState.value === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
    </div>
</nav>

<style>
    nav {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 200px;
        height: 100vh;
        padding: 20px;
        border-right: 0.5px solid var(--border);
        background-color: var(--bg-secondary);
        box-sizing: border-box;
        position: fixed;
        align-items: center;
        top: 0;
        left: 0;
    }

    .bottom {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
    }

    .header {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .used-cards {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-top: 20px;
    }

    .rarity[role="button"] {
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 3px;
    }

    .rarity.common    { color: #7c7c7c; }
    .rarity.uncommon  { color: #626586; }
    .rarity.rare      { color: #a802b8; }
    .rarity.legendary { color: #d3a200; }
    .rarity.boss      { color: #c00000; }
</style>
