<script>
	import { onMount } from 'svelte';
	import { format } from 'date-fns';

	let salesOrders = [];
	let orderNumbers = [];
	let loading = true;
	let refreshing = false;
	let error = '';
	let cacheStatus = '';

	async function loadData(forceRefresh = false) {
		try {
			if (forceRefresh) {
				refreshing = true;
			} else {
				loading = true;
			}
			
			const url = forceRefresh ? '/api/sales-orders?force=true' : '/api/sales-orders';
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('Failed to fetch sales orders');
			}
			const data = await response.json();
			salesOrders = data.salesOrders || [];
			orderNumbers = data.orderNumbers || [];
			cacheStatus = data.cached ? 'Cached' : 'Fresh';
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function forceRefresh() {
		await loadData(true);
	}

	async function preloadUnopenedInvoices() {
		// Preload details for unopened invoices
		const unopenedOrders = salesOrders.filter(order => !isOrderProcessed(order.OrderNumber));
		console.log(`Preloading ${unopenedOrders.length} unopened invoices`);
		
		// Preload in background without blocking UI
		unopenedOrders.forEach(async (order) => {
			try {
				await fetch(`/api/order/${order.OrderNumber}`);
				console.log(`Preloaded order: ${order.OrderNumber}`);
			} catch (err) {
				console.warn(`Failed to preload order ${order.OrderNumber}:`, err);
			}
		});
	}

	onMount(async () => {
		await loadData();
		// Preload unopened invoices after initial load
		setTimeout(preloadUnopenedInvoices, 1000);
	});

	function formatDate(dateString) {
		try {
			const date = new Date(dateString);
			return format(date, 'MMMM dd, yyyy h:mm a');
		} catch {
			return 'Invalid Date';
		}
	}

	function isOrderProcessed(orderNumber) {
		return orderNumbers.includes(orderNumber);
	}
</script>

<svelte:head>
	<title>Latest Sales Orders</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold text-gray-900">Latest Sales Orders</h1>
		<div class="flex items-center space-x-4">
			{#if cacheStatus}
				<span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
					{cacheStatus}
				</span>
			{/if}
			<button
				on:click={forceRefresh}
				disabled={refreshing}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
			>
				{#if refreshing}
					<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					<span>Refreshing...</span>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
					</svg>
					<span>Force Refresh</span>
				{/if}
			</button>
		</div>
	</div>
	
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
			{error}
		</div>
	{:else}
		<div class="space-y-4">
			{#each salesOrders as order, index}
				<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
					<div class="grid grid-cols-1 md:grid-cols-12 gap-6">
						<div class="md:col-span-4">
							<div class="space-y-2">
								<div><span class="font-semibold text-gray-700">Order Number:</span> <span class="text-gray-900">{order.OrderNumber}</span></div>
								<div><span class="font-semibold text-gray-700">Order ID:</span> <span class="text-gray-900">{order.CustomerOrderReference}</span></div>
								<div><span class="font-semibold text-gray-700">Customer:</span> <span class="text-gray-900">{order.Customer.FirstName}</span></div>
								<div><span class="font-semibold text-gray-700">Total Amount:</span> <span class="text-gray-900">${order.GrandTotal}</span></div>
								<div class="mt-3">
									<span class="font-semibold text-gray-700">Product Names:</span>
									<div class="mt-1 space-y-1">
										{#each order.SalesOrderLines as line}
											{#if line.Name !== 'Shipping'}
												<div class="text-sm text-gray-600">
													{line.Name} <span class="font-medium">Quantity:</span> {line.Quantity}
												</div>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						</div>
						<div class="md:col-span-6">
							<div class="space-y-2">
								<div><span class="font-semibold text-gray-700">Order Created Date:</span> <span class="text-gray-900">{formatDate(order.CreatedDate)}</span></div>
								<div class="mt-3">
									<span class="font-semibold text-gray-700">Shipping Address:</span>
									<div class="mt-1 text-sm text-gray-600">
										{#if order.ShippingAddress.AddressLine1}
											{order.ShippingAddress.AddressLine1}<br>
										{/if}
										{#if order.ShippingAddress.AddressLine2}
											{order.ShippingAddress.AddressLine2}<br>
										{/if}
										{#if order.ShippingAddress.AddressLine3}
											{order.ShippingAddress.AddressLine3}<br>
										{/if}
										{#if order.ShippingAddress.TownCity}
											{order.ShippingAddress.TownCity}
										{/if}
										{#if order.ShippingAddress.PostalCode}
											{order.ShippingAddress.PostalCode}
										{/if}
									</div>
								</div>
							</div>
						</div>
						<div class="md:col-span-2 flex flex-col items-center space-y-4">
							<a 
								href="/invoice/{order.OrderNumber}" 
								class="px-4 py-2 rounded-md font-medium text-white {isOrderProcessed(order.OrderNumber) ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} transition-colors"
								target="_blank"
							>
								View Invoice
							</a>
							<div class="text-center">
								<p class="text-sm text-gray-500">Order Number</p>
								<p class="text-lg font-bold text-gray-900">{index + 1}</p>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
