<script lang="ts">
    import { authState, signInWithGoogle } from '$lib/auth.svelte';
    import { goto } from '$app/navigation';

    $effect(() => {
        if (!authState.loading && authState.user) {
            goto('/home');
        }
    });
</script>

{#if !authState.loading}
    <div class="container">
        <h1>Welcome</h1>
        <button class="primary" onclick={signInWithGoogle}>Sign in with Google</button>
    </div>
{/if}

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>
