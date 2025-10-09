<script lang="ts">
	import { onMount } from 'svelte';

	let printerStatus = null;
	let recentJobs = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/print/status');
			const data = await response.json();
			
			if (data.error) {
				error = data.error;
			} else {
				printerStatus = data.printer;
				recentJobs = data.recentJobs || [];
			}
		} catch (err) {
			error = 'Failed to fetch printer status';
			console.error('Error fetching printer status:', err);
		} finally {
			loading = false;
		}
	});

	async function testPrint() {
		try {
			// Create a simple test PDF
			const testElement = document.createElement('div');
			testElement.id = 'test-pdf-content';
			testElement.style.padding = '20px';
			testElement.style.fontFamily = 'Arial, sans-serif';
			testElement.style.backgroundColor = 'white';
			testElement.innerHTML = `
				<h1>PrintNode Test Document</h1>
				<p>This is a test document to verify PrintNode integration.</p>
				<p>Date: ${new Date().toLocaleString()}</p>
				<p>If you see this printed, your PrintNode setup is working!</p>
				<div style="margin-top: 20px; padding: 10px; border: 1px solid #ccc;">
					<h3>Test Details:</h3>
					<ul>
						<li>Document Type: Test PDF</li>
						<li>Generated: ${new Date().toISOString()}</li>
						<li>Source: SvelteKit Debug Page</li>
					</ul>
				</div>
			`;
			document.body.appendChild(testElement);

			// Generate PDF
			const { pdfService } = await import('$lib/pdf-service');
			const pdfBlob = await pdfService.generatePDF('test-pdf-content', 'test-print.pdf');
			const base64Pdf = await pdfService.blobToBase64(pdfBlob);

			// Test the PDF
			const testResponse = await fetch('/api/print/test-pdf', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					pdf: base64Pdf,
					filename: 'Test Print Document.pdf'
				})
			});

			const testResult = await testResponse.json();
			console.log('Test print result:', testResult);
			
			alert(`Test print result: ${testResult.success ? 'Success' : 'Failed'}\nStatus: ${testResult.status}\nDetails: ${JSON.stringify(testResult.pdfDetails, null, 2)}`);

			// Clean up
			document.body.removeChild(testElement);
		} catch (err) {
			console.error('Test print failed:', err);
			alert('Test print failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
		}
	}
</script>

<div class="max-w-4xl mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6">PrintNode Debug Status</h1>

	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
			<strong>Error:</strong> {error}
		</div>
	{:else if printerStatus}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Printer Status -->
			<div class="bg-white shadow-md rounded-lg p-6">
				<h2 class="text-xl font-semibold mb-4">Printer Status</h2>
				<div class="space-y-2">
					<p><strong>Name:</strong> {printerStatus.name || 'N/A'}</p>
					<p><strong>State:</strong> 
						<span class="px-2 py-1 rounded text-sm {printerStatus.state === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
							{printerStatus.state || 'Unknown'}
						</span>
					</p>
					<p><strong>Description:</strong> {printerStatus.description || 'N/A'}</p>
					<p><strong>Default:</strong> {printerStatus.default ? 'Yes' : 'No'}</p>
					<p><strong>Created:</strong> {printerStatus.created ? new Date(printerStatus.created).toLocaleString() : 'N/A'}</p>
				</div>
			</div>

			<!-- Recent Jobs -->
			<div class="bg-white shadow-md rounded-lg p-6">
				<h2 class="text-xl font-semibold mb-4">Recent Print Jobs</h2>
				{#if recentJobs.length > 0}
					<div class="space-y-3">
						{#each recentJobs as job}
							<div class="border rounded p-3">
								<p><strong>Title:</strong> {job.title || 'N/A'}</p>
								<p><strong>State:</strong> 
									<span class="px-2 py-1 rounded text-xs {job.state === 'completed' ? 'bg-green-100 text-green-800' : job.state === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
										{job.state || 'Unknown'}
									</span>
								</p>
								<p><strong>Created:</strong> {job.createTimestamp ? new Date(job.createTimestamp).toLocaleString() : 'N/A'}</p>
								{#if job.error}
									<p class="text-red-600 text-sm"><strong>Error:</strong> {job.error}</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500">No recent print jobs found.</p>
				{/if}
			</div>
		</div>

		<!-- Test Print Button -->
		<div class="mt-6 text-center">
			<button
				on:click={testPrint}
				class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
			>
				Send Test Print
			</button>
		</div>
	{/if}
</div>
