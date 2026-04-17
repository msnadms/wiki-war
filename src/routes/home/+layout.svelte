<script lang="ts">
    import { authState } from '$lib/auth.svelte';
    import { goto } from '$app/navigation';
    import Header from '../../lib/components/Header.svelte';

    let { children } = $props();

    $effect(() => {
        if (!authState.loading && !authState.user) {
            goto('/');
        }
    });
</script>

{#if authState.user}
    <Header/>
    <main>
        {@render children()}
    </main>
{/if}

<style>
    main {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-left: 200px;
        padding: 20px;
    }
</style>
