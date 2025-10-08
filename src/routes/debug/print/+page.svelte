<script>
	import { onMount } from 'svelte';
	
	let config = null;
	let loading = true;
	let error = '';
	
	onMount(async () => {
		try {
			const response = await fetch('/api/print/test');
			config = await response.json();
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});
	
	async function testPrint() {
		try {
			// Create a simple test PDF
			const testElement = document.getElementById('test-content');
			if (!testElement) {
				alert('Test content not found');
				return;
			}
			
			// Import pdfService dynamically
			const { pdfService } = await import('$lib/pdf-service');
			await pdfService.printPDF('test-content', 'test-print.pdf');
			alert('Test print job sent!');
		} catch (err) {
			alert(`Test print failed: ${err.message}`);
		}
	}
</script>

<svelte:head>
	<title>Print Debug</title>
</svelte:head>

<div class="max-w-4xl mx-auto p-6">
	<h1 class="text-2xl font-bold mb-6">Print Configuration Debug</h1>
	
	{#if loading}
		<div class="text-center">Loading configuration...</div>
	{:else if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
			Error: {error}
		</div>
	{:else if config}
		<div class="space-y-4">
			<div class="bg-gray-100 p-4 rounded">
				<h2 class="text-lg font-semibold mb-2">Configuration Status</h2>
				<div class="space-y-2">
					<div class="flex items-center">
						<span class="w-32">API Key:</span>
						<span class="font-mono text-sm {config.hasApiKey ? 'text-green-600' : 'text-red-600'}">
							{config.hasApiKey ? '✓ Set' : '✗ Missing'}
						</span>
					</div>
					<div class="flex items-center">
						<span class="w-32">Printer ID:</span>
						<span class="font-mono text-sm {config.hasPrinterId ? 'text-green-600' : 'text-red-600'}">
							{config.hasPrinterId ? '✓ Set' : '✗ Missing'}
						</span>
					</div>
					<div class="flex items-center">
						<span class="w-32">API Key Length:</span>
						<span class="font-mono text-sm">{config.apiKeyLength} characters</span>
					</div>
					<div class="flex items-center">
						<span class="w-32">Printer ID:</span>
						<span class="font-mono text-sm">{config.printerId || 'Not set'}</span>
					</div>
				</div>
			</div>
			
			{#if config.hasApiKey && config.hasPrinterId}
				<div class="bg-blue-100 p-4 rounded">
					<h3 class="text-lg font-semibold mb-2">Test Print</h3>
					<p class="mb-4">Click the button below to send a test print job:</p>
					<button 
						on:click={testPrint}
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
					>
						Send Test Print
					</button>
				</div>
			{:else}
				<div class="bg-yellow-100 p-4 rounded">
					<h3 class="text-lg font-semibold mb-2">Configuration Required</h3>
					<p>Please set the following environment variables:</p>
					<ul class="list-disc list-inside mt-2 space-y-1">
						{#if !config.hasApiKey}
							<li><code>PRINTNODE_API_KEY</code></li>
						{/if}
						{#if !config.hasPrinterId}
							<li><code>PRINTNODE_PRINTER_ID</code></li>
						{/if}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
	
	<!-- Test content for PDF generation -->
	<div id="test-content" class="hidden">
		<div class="p-8">
			<h1 class="text-2xl font-bold mb-4">Test Print Document</h1>
			<p class="text-lg">This is a test document to verify PrintNode integration.</p>
			<p class="text-sm text-gray-600 mt-4">Generated at: {new Date().toLocaleString()}</p>
		</div>
	</div>
</div>
