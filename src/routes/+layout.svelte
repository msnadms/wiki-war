<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { themeState } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		themeState.init();
	});

	$effect(() => {
		document.documentElement.setAttribute('data-theme', themeState.value);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
