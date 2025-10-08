<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { format } from 'date-fns';
	import { getLogoUrl } from '$lib/logo';
	import { pdfService } from '$lib/pdf-service';

	let salesOrders = [];
	let invoiceNumber = 0;
	let currentDate = '';
	let loading = true;
	let error = '';
	let editingMode = false;
	let editedLines = [];
	let customProducts = [];
	let showAddProduct = false;
	let newProduct = { name: '', quantity: 1, price: 0.01 };
	let calculatedTotal = 0;
	let logoUrl = '';
	let footerText = { main: 'Thank you for your order!', sub: 'Visit us at www.example.com' };
	let companyAddress = { line1: '123 Example Street,', line2: 'Example City,', line3: 'Example 1234', email: 'Email: contact@example.com' };
	let isGeneratingPDF = false;
	let isPrinting = false;
	let isDownloadAndPrint = false;

	// Function to create a safe filename
	function createSafeFilename(baseName) {
		return baseName
			.replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.toLowerCase();
	}

	// Reactive statement to calculate total when arrays change
	$: {
		console.log('Reactive total calculation triggered - editedLines:', editedLines.length, 'customProducts:', customProducts.length);
		calculatedTotal = calculateTotal();
	}

	onMount(async () => {
		const orderId = $page.params.orderId;
		currentDate = format(new Date(), 'dd-MM-yyyy');
		
		// Set logo URL, footer text, and company address
		const infoResponse = await fetch('/api/info');
		if (infoResponse.ok) {
			const infoData = await infoResponse.json();
			logoUrl = infoData.logoUrl;
			footerText = infoData.footerText;
			companyAddress = infoData.companyAddress;
		} else {
			logoUrl = await getLogoUrl();
			footerText = { main: 'Thank you for your order!', sub: 'Visit us at www.example.com' };
			companyAddress = { line1: '123 Example Street,', line2: 'Example City,', line3: 'Example 1234', email: 'Email: contact@example.com' };
		}
		
		try {
			const response = await fetch(`/api/order/${orderId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch order details');
			}
			const data = await response.json();
			console.log('Fetched order data:', data);
			salesOrders = data.salesOrders || [];
			invoiceNumber = data.invoiceNumber || 0;
			
			console.log('Sales orders loaded:', salesOrders.length);
			if (salesOrders.length > 0) {
				console.log('First order SalesOrderLines:', salesOrders[0].SalesOrderLines?.length || 0);
			}
			
			// Initialize edited lines with original data
			initializeEditedLines();
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	});

	function initializeEditedLines() {
		console.log('Initializing edited lines, salesOrders length:', salesOrders.length);
		if (salesOrders.length > 0) {
			editedLines = salesOrders[0].SalesOrderLines.map(line => ({
				...line,
				originalName: line.Name,
				originalQuantity: line.Quantity,
				originalPrice: line.SellPriceIncTax,
				isEdited: false
			}));
			console.log('Initialized editedLines:', editedLines.length, 'lines');
			// Force recalculation after initialization
			calculatedTotal = calculateTotal();
			console.log('Recalculated total after initialization:', calculatedTotal);
		} else {
			console.log('No sales orders available for initialization');
		}
	}

	function toggleEditingMode() {
		editingMode = !editingMode;
		console.log('Editing mode toggled:', editingMode);
		console.log('Current calculatedTotal before toggle:', calculatedTotal);
		console.log('editedLines after toggle:', editedLines.map(l => ({ name: l.Name, price: l.SellPriceIncTax, qty: l.Quantity, link_text: l.link_text })));
		// Keep all edited data when exiting edit mode
		// Don't reset to original data - preserve user edits
	}

	function editProductName(lineId, field) {
		console.log('Editing product with ID:', lineId, 'field:', field);
		console.log('All line IDs:', editedLines.map(l => ({ id: l.ID, name: l.Name })));
		
		const lineIndex = editedLines.findIndex(l => l.ID === lineId);
		console.log('Found line at index:', lineIndex);
		
		if (lineIndex !== -1) {
			const line = editedLines[lineIndex];
			console.log('Editing line:', line.Name, 'at index:', lineIndex);
			
			const currentValue = field === 'name' ? (line.link_text || line.Name) : 
								field === 'quantity' ? Math.floor(line.Quantity) : 
								line.SellPriceIncTax;
			
			const promptText = field === 'name' ? 'Enter the new product name:' :
							  field === 'quantity' ? 'Enter the new quantity:' :
							  'Enter the new price:';
			
			const newValue = prompt(promptText, currentValue.toString());
			if (newValue !== null && newValue.trim() !== '') {
				console.log('Updating line at index:', lineIndex, 'with new value:', newValue);
				
				// Create a new array to trigger reactivity
				editedLines = editedLines.map((item, index) => {
					if (index === lineIndex) {
						const updatedLine = { ...item };
						if (field === 'name') {
							updatedLine.link_text = newValue.trim();
						} else if (field === 'quantity') {
							updatedLine.Quantity = parseFloat(newValue) || 1;
						} else if (field === 'price') {
							updatedLine.SellPriceIncTax = parseFloat(newValue) || 0;
						}
						updatedLine.isEdited = true;
						console.log('Updated line:', updatedLine.Name, 'link_text:', updatedLine.link_text);
						return updatedLine;
					}
					return item;
				});
				
				// Force recalculation
				calculatedTotal = calculateTotal();
				console.log('Recalculated total after editing product:', calculatedTotal);
			}
		} else {
			console.error('Line not found with ID:', lineId);
		}
	}

	function editProductNameByIndex(lineIndex, field) {
		console.log('Editing product at index:', lineIndex, 'field:', field);
		
		if (lineIndex >= 0 && lineIndex < editedLines.length) {
			const line = editedLines[lineIndex];
			console.log('Editing line:', line.Name, 'at index:', lineIndex);
			
			const currentValue = field === 'name' ? (line.link_text || line.Name) : 
								field === 'quantity' ? Math.floor(line.Quantity) : 
								line.SellPriceIncTax;
			
			const promptText = field === 'name' ? 'Enter the new product name:' :
							  field === 'quantity' ? 'Enter the new quantity:' :
							  'Enter the new price:';
			
			const newValue = prompt(promptText, currentValue.toString());
			if (newValue !== null && newValue.trim() !== '') {
				console.log('Updating line at index:', lineIndex, 'with new value:', newValue);
				
				// Create a new array to trigger reactivity
				editedLines = editedLines.map((item, index) => {
					if (index === lineIndex) {
						const updatedLine = { ...item };
						if (field === 'name') {
							updatedLine.link_text = newValue.trim();
						} else if (field === 'quantity') {
							updatedLine.Quantity = parseFloat(newValue) || 1;
						} else if (field === 'price') {
							updatedLine.SellPriceIncTax = parseFloat(newValue) || 0;
						}
						updatedLine.isEdited = true;
						console.log('Updated line:', updatedLine.Name, 'link_text:', updatedLine.link_text);
						return updatedLine;
					}
					return item;
				});
				
				// Force recalculation
				calculatedTotal = calculateTotal();
				console.log('Recalculated total after editing product:', calculatedTotal);
			}
		} else {
			console.error('Invalid line index:', lineIndex);
		}
	}

	function addCustomProduct() {
		console.log('Adding custom product:', newProduct);
		if (newProduct.name.trim() && newProduct.quantity > 0 && newProduct.price >= 0) {
			const customLine = {
				ID: 'custom-' + Date.now(),
				Name: newProduct.name.trim(),
				Quantity: newProduct.quantity,
				SellPriceIncTax: newProduct.price,
				isCustom: true,
				isEdited: false
			};
			customProducts = [...customProducts, customLine];
			newProduct = { name: '', quantity: 1, price: 0.01 };
			showAddProduct = false;
			console.log('Custom products after add:', customProducts);
			// Force recalculation
			calculatedTotal = calculateTotal();
			console.log('Recalculated total after adding custom product:', calculatedTotal);
		} else {
			alert('Please fill in all fields with valid values');
		}
	}

	function removeCustomProduct(lineId) {
		customProducts = customProducts.filter(p => p.ID !== lineId);
		// Force recalculation
		calculatedTotal = calculateTotal();
		console.log('Recalculated total after removing custom product:', calculatedTotal);
	}

	function editCustomProduct(lineId, field) {
		const productIndex = customProducts.findIndex(p => p.ID === lineId);
		if (productIndex !== -1) {
			const product = customProducts[productIndex];
			const currentValue = field === 'name' ? product.Name :
								field === 'quantity' ? product.Quantity :
								product.SellPriceIncTax;
			
			const promptText = field === 'name' ? 'Enter the new product name:' :
							  field === 'quantity' ? 'Enter the new quantity:' :
							  'Enter the new price:';
			
			const newValue = prompt(promptText, currentValue.toString());
			if (newValue !== null && newValue.trim() !== '') {
				// Create a new array to trigger reactivity
				customProducts = customProducts.map((item, index) => {
					if (index === productIndex) {
						const updatedProduct = { ...item };
						if (field === 'name') {
							updatedProduct.Name = newValue.trim();
						} else if (field === 'quantity') {
							updatedProduct.Quantity = parseFloat(newValue) || 1;
						} else if (field === 'price') {
							updatedProduct.SellPriceIncTax = parseFloat(newValue) || 0;
						}
						return updatedProduct;
					}
					return item;
				});
				
				// Force recalculation
				calculatedTotal = calculateTotal();
				console.log('Recalculated total after editing custom product:', calculatedTotal);
			}
		}
	}

	function calculateTotal() {
		let total = 0;
		
		console.log('Calculating total - editedLines:', editedLines.length, 'customProducts:', customProducts.length);
		
		// Add original lines (excluding shipping for now)
		editedLines.forEach(line => {
			if (line.Name !== 'Shipping') {
				const lineTotal = line.SellPriceIncTax * line.Quantity;
				total += lineTotal;
				console.log('Original line:', line.Name, 'Price:', line.SellPriceIncTax, 'Qty:', line.Quantity, 'Total:', lineTotal);
			}
		});
		
		// Add custom products
		customProducts.forEach(product => {
			const productTotal = product.SellPriceIncTax * product.Quantity;
			total += productTotal;
			console.log('Custom product:', product.Name, 'Price:', product.SellPriceIncTax, 'Qty:', product.Quantity, 'Total:', productTotal);
		});
		
		// Add shipping
		const shippingLine = editedLines.find(line => line.Name === 'Shipping');
		if (shippingLine) {
			const shippingTotal = shippingLine.SellPriceIncTax * shippingLine.Quantity;
			total += shippingTotal;
			console.log('Shipping:', shippingLine.Name, 'Price:', shippingLine.SellPriceIncTax, 'Qty:', shippingLine.Quantity, 'Total:', shippingTotal);
		}
		
		console.log('Final total:', total);
		return total;
	}

	async function downloadPDF() {
		try {
			isGeneratingPDF = true;
			// Get customer name from the first order
			const customerName = salesOrders.length > 0 && salesOrders[0].RecipientName 
				? createSafeFilename(salesOrders[0].RecipientName) 
				: 'customer';
			const filename = `invoice-${invoiceNumber}-${customerName}.pdf`;
			await pdfService.downloadPDF('invoice-content', filename);
		} catch (error) {
			console.error('Error generating PDF:', error);
			alert('Error generating PDF. Please try again.');
		} finally {
			isGeneratingPDF = false;
		}
	}

	async function printInvoice() {
		try {
			isPrinting = true;
			const filename = `invoice-${invoiceNumber}-${currentDate}.pdf`;
			console.log('Starting print process for:', filename);
			
			// First test PDF generation
			console.log('Generating PDF...');
			const pdfBlob = await pdfService.generatePDF('invoice-content', filename);
			console.log('PDF generated successfully, size:', pdfBlob.size);
			
			// Convert to base64
			console.log('Converting to base64...');
			const base64 = await pdfService.blobToBase64(pdfBlob);
			console.log('Base64 conversion complete, length:', base64.length);
			
			// Send to PrintNode
			console.log('Sending to PrintNode...');
			await pdfService.sendToPrintNode(base64, filename);
			
			alert('Print job sent successfully!');
		} catch (error) {
			console.error('Error printing invoice:', error);
			alert(`Error sending print job: ${error.message || 'Please check PrintNode configuration.'}`);
		} finally {
			isPrinting = false;
		}
	}

	async function downloadAndPrint() {
		try {
			isDownloadAndPrint = true;
			// Get customer name from the first order
			const customerName = salesOrders.length > 0 && salesOrders[0].RecipientName 
				? createSafeFilename(salesOrders[0].RecipientName) 
				: 'customer';
			const downloadFilename = `invoice-${invoiceNumber}-${customerName}.pdf`;
			const printFilename = `invoice-${invoiceNumber}-${currentDate}.pdf`;
			
			// Generate PDF once
			const pdfBlob = await pdfService.generatePDF('invoice-content', printFilename);
			
			// Download the PDF with just invoice number
			const url = URL.createObjectURL(pdfBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = downloadFilename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			
			// Convert to base64 and send to print with full filename
			const base64 = await pdfService.blobToBase64(pdfBlob);
			await pdfService.sendToPrintNode(base64, printFilename);
			
			alert('PDF downloaded and print job sent successfully!');
		} catch (error) {
			console.error('Error with download and print:', error);
			alert(`Error with download and print: ${error.message || 'Please try again.'}`);
		} finally {
			isDownloadAndPrint = false;
		}
	}

	function saveInvoice() {
		// Here you could implement saving to database or exporting
		console.log('Saving invoice with edited data:', {
			originalLines: editedLines,
			customProducts: customProducts,
			total: calculatedTotal
		});
		alert(`Invoice saved! Total: $${calculatedTotal.toFixed(2)} (This would normally save to database)`);
	}

	function exportInvoice() {
		window.print();
	}
</script>

<svelte:head>
	<title>Invoice {invoiceNumber}</title>
</svelte:head>

{#if loading}
	<div class="flex justify-center items-center py-12">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if error}
	<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
		{error}
	</div>
{:else}
	<!-- Editing Controls -->
	<div class="editing-controls max-w-4xl mx-auto p-6 bg-gray-50 border-b border-gray-200">
		<div class="flex justify-between items-center">
			<div class="flex items-center space-x-4">
				<button
					on:click={toggleEditingMode}
					class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
				>
					{editingMode ? 'Exit Edit Mode' : 'Edit Invoice'}
				</button>
				
				{#if editingMode}
					<button
						on:click={() => showAddProduct = !showAddProduct}
						class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
					>
						Add Custom Product
					</button>
					
					<button
						on:click={saveInvoice}
						class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
					>
						Save Invoice
					</button>
				{/if}
			</div>
			
			<div class="flex items-center space-x-4">
				<button
					on:click={downloadAndPrint}
					disabled={isDownloadAndPrint || isGeneratingPDF || isPrinting}
					class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
				>
					{#if isDownloadAndPrint}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						<span>Download & Print...</span>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
						</svg>
						<span>Download & Print</span>
					{/if}
				</button>
				
				<button
					on:click={downloadPDF}
					disabled={isGeneratingPDF || isDownloadAndPrint}
					class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
				>
					{#if isGeneratingPDF}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						<span>Generating PDF...</span>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
						<span>Download PDF</span>
					{/if}
				</button>
				
				<button
					on:click={printInvoice}
					disabled={isPrinting || isDownloadAndPrint}
					class="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
				>
					{#if isPrinting}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						<span>Printing...</span>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
						</svg>
						<span>Print Invoice</span>
					{/if}
				</button>
			</div>
			
			<button
				on:click={exportInvoice}
				class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
			>
				Print/Export
			</button>
		</div>
		
		<!-- Debug Info -->
		{#if editingMode}
			<div class="mt-2 p-2 bg-yellow-100 text-xs">
				<strong>Debug:</strong> Editing Mode: {editingMode}, Custom Products: {customProducts.length}, Show Add Product: {showAddProduct}
				<br>
				<strong>Total:</strong> ${calculatedTotal.toFixed(2)}
				<br>
				<button 
					on:click={() => { customProducts = [...customProducts, {ID: 'test-' + Date.now(), Name: 'Test Product', Quantity: 1, SellPriceIncTax: 10, isCustom: true, isEdited: false}]; }}
					class="bg-red-500 text-white px-2 py-1 text-xs rounded mr-2"
				>
					Add Test Product
				</button>
				<button 
					on:click={() => { customProducts = []; }}
					class="bg-orange-500 text-white px-2 py-1 text-xs rounded"
				>
					Clear Custom Products
				</button>
			</div>
		{/if}
		
		{#if editingMode && showAddProduct}
			<div class="mt-4 p-4 bg-white rounded-lg border border-gray-300">
				<h3 class="text-lg font-semibold mb-3">Add Custom Product</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="product-name" class="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
						<input
							id="product-name"
							type="text"
							bind:value={newProduct.name}
							placeholder="Enter product name"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label for="product-quantity" class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
						<input
							id="product-quantity"
							type="number"
							bind:value={newProduct.quantity}
							min="0.01"
							step="0.01"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label for="product-price" class="block text-sm font-medium text-gray-700 mb-1">Price (Inc GST)</label>
						<input
							id="product-price"
							type="number"
							bind:value={newProduct.price}
							min="0"
							step="0.01"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>
				<div class="mt-3 flex space-x-2">
					<button
						on:click={addCustomProduct}
						class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
					>
						Add Product
					</button>
					<button
						on:click={() => showAddProduct = false}
						class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	</div>
		{#each salesOrders as order}
			<div id="invoice-content" class="max-w-4xl mx-auto p-6 bg-white">
				<div class="flex justify-between items-start mb-8">
					<div class="flex-1">
						<img id="logo" src={logoUrl} alt="Logo" class="max-w-xs h-auto">
					</div>
					<div class="text-right">
						<h3 class="text-2xl font-bold text-gray-900 mb-4">TAX INVOICE</h3>
						<div class="space-y-1 text-sm">
							<div><span class="font-semibold">Invoice Number:</span> 00{invoiceNumber}</div>
							{#if order.RecipientName}
								<div><span class="font-semibold">Customer:</span> {order.RecipientName}</div>
							{/if}
							<div><span class="font-semibold">Listing Number:</span> {order.CustomerOrderReference}</div>
							<div><span class="font-semibold">Date:</span> {currentDate}</div>
							<div><span class="font-semibold">GST:</span> 044-002-868</div>
						</div>
					</div>
				</div>
				
				<div class="mb-8">
					<div class="address-grid grid grid-cols-1 md:grid-cols-2 gap-8">
						<div>
							<h4 class="font-semibold text-gray-900 mb-2">Company Address:</h4>
							<div class="text-sm text-gray-600">
								<p>{companyAddress?.line1 || '123 Example Street,'}</p>
								<p>{companyAddress?.line2 || 'Example City,'}</p>
								<p>{companyAddress?.line3 || 'Example 1234'}</p>
								<p>{companyAddress?.email || 'Email: contact@example.com'}</p>
							</div>
						</div>
						<div>
							<h4 class="font-semibold text-gray-900 mb-2">Shipping Address:</h4>
							<div class="text-sm text-gray-600">
								{#if order.RecipientName}
									<p>{order.RecipientName}</p>
								{/if}
								{#if order.ShippingAddress.AddressLine1}
									<p>{order.ShippingAddress.AddressLine1}</p>
								{/if}
								{#if order.ShippingAddress.AddressLine2}
									<p>{order.ShippingAddress.AddressLine2}</p>
								{/if}
								{#if order.ShippingAddress.AddressLine3}
									<p>{order.ShippingAddress.AddressLine3}</p>
								{/if}
								{#if order.ShippingAddress.TownCity}
									<p>{order.ShippingAddress.TownCity}</p>
								{/if}
								{#if order.ShippingAddress.PostalCode}
									<p>{order.ShippingAddress.PostalCode}</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
		
				<div class="overflow-x-auto">
					<table class="invoice-table min-w-full border border-gray-300">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">Product</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">Quantity</th>
								<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">Price</th>
								{#if editingMode}
									<th class="actions-column px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							<!-- Original Products (excluding shipping) -->
							{#each editedLines as line, lineIndex}
								{#if line.Name !== 'Shipping'}
									<tr class="hover:bg-gray-50 {line.isEdited ? 'bg-yellow-50' : ''}">
										<td class="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
											{#if editingMode}
												<button 
													class="editable text-left hover:text-blue-600 transition-colors {line.isEdited ? 'text-orange-600 font-semibold' : ''}" 
													on:click={() => editProductNameByIndex(lineIndex, 'name')}
												>
													{line.link_text || line.Name}
													{#if line.isEdited}
														<span class="text-xs text-orange-500 ml-1">(edited)</span>
													{/if}
												</button>
											{:else}
												<span class="text-gray-900">{line.link_text || line.Name}</span>
											{/if}
										</td>
										<td class="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
											{#if editingMode}
												<button 
													class="editable hover:text-blue-600 transition-colors {line.isEdited ? 'text-orange-600 font-semibold' : ''}" 
													on:click={() => editProductNameByIndex(lineIndex, 'quantity')}
												>
													{Math.floor(line.Quantity)}
												</button>
											{:else}
												{Math.floor(line.Quantity)}
											{/if}
										</td>
										<td class="px-4 py-3 text-sm text-gray-900 text-right border-b border-gray-200">
											{#if editingMode}
												<button 
													class="editable hover:text-blue-600 transition-colors {line.isEdited ? 'text-orange-600 font-semibold' : ''}" 
													on:click={() => editProductNameByIndex(lineIndex, 'price')}
												>
													${(line.SellPriceIncTax * line.Quantity).toFixed(2)}
												</button>
											{:else}
												${(line.SellPriceIncTax * line.Quantity).toFixed(2)}
											{/if}
										</td>
										{#if editingMode}
											<td class="actions-column px-4 py-3 text-center border-b border-gray-200">
												{#if line.isEdited}
													<button
														on:click={() => {
															line.link_text = line.originalName;
															line.Quantity = line.originalQuantity;
															line.SellPriceIncTax = line.originalPrice;
															line.isEdited = false;
														}}
														class="text-xs text-gray-500 hover:text-gray-700 underline"
													>
														Reset
													</button>
												{/if}
											</td>
										{/if}
									</tr>
								{/if}
							{/each}
							
							<!-- Custom Products -->
							{#each customProducts as product}
								<tr class="hover:bg-gray-50 bg-green-50">
									<td class="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
										{#if editingMode}
											<button 
												class="editable text-left hover:text-blue-600 transition-colors text-green-700 font-semibold" 
												on:click={() => editCustomProduct(product.ID, 'name')}
											>
												{product.Name}
												<span class="text-xs text-green-500 ml-1">(custom)</span>
											</button>
										{:else}
											<span class="text-gray-900">{product.Name}</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
										{#if editingMode}
											<button 
												class="editable hover:text-blue-600 transition-colors text-green-700 font-semibold" 
												on:click={() => editCustomProduct(product.ID, 'quantity')}
											>
												{Math.floor(product.Quantity)}
											</button>
										{:else}
											{Math.floor(product.Quantity)}
										{/if}
									</td>
									<td class="px-4 py-3 text-sm text-gray-900 text-right border-b border-gray-200">
										{#if editingMode}
											<button 
												class="editable hover:text-blue-600 transition-colors text-green-700 font-semibold" 
												on:click={() => editCustomProduct(product.ID, 'price')}
											>
												${(product.SellPriceIncTax * product.Quantity).toFixed(2)}
											</button>
										{:else}
											${(product.SellPriceIncTax * product.Quantity).toFixed(2)}
										{/if}
									</td>
									{#if editingMode}
										<td class="px-4 py-3 text-center border-b border-gray-200">
											<button
												on:click={() => removeCustomProduct(product.ID)}
												class="text-xs text-red-500 hover:text-red-700 underline"
											>
												Remove
											</button>
										</td>
									{/if}
								</tr>
							{/each}
							
							<!-- Shipping -->
							{#each editedLines as line, lineIndex}
								{#if line.Name === 'Shipping'}
									<tr class="hover:bg-gray-50 {line.isEdited ? 'bg-yellow-50' : ''}">
										<td class="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
											{#if editingMode}
												<button 
													class="editable text-left hover:text-blue-600 transition-colors {line.isEdited ? 'text-orange-600 font-semibold' : ''}" 
													on:click={() => editProductNameByIndex(lineIndex, 'name')}
												>
													{line.link_text || line.Name}
													{#if line.isEdited}
														<span class="text-xs text-orange-500 ml-1">(edited)</span>
													{/if}
												</button>
											{:else}
												{line.link_text || line.Name}
											{/if}
										</td>
										<td class="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
											{#if editingMode}
												<button 
													class="editable hover:text-blue-600 transition-colors {line.isEdited ? 'text-orange-600 font-semibold' : ''}" 
													on:click={() => editProductNameByIndex(lineIndex, 'quantity')}
												>
													{Math.floor(line.Quantity)}
												</button>
											{:else}
												{Math.floor(line.Quantity)}
											{/if}
										</td>
										<td class="px-4 py-3 text-sm text-gray-900 text-right border-b border-gray-200">
											{#if editingMode}
												<button 
													class="editable hover:text-blue-600 transition-colors {line.isEdited ? 'text-orange-600 font-semibold' : ''}" 
													on:click={() => editProductNameByIndex(lineIndex, 'price')}
												>
													${(line.SellPriceIncTax * line.Quantity).toFixed(2)}
												</button>
											{:else}
												${(line.SellPriceIncTax * line.Quantity).toFixed(2)}
											{/if}
										</td>
										{#if editingMode}
											<td class="actions-column px-4 py-3 text-center border-b border-gray-200">
												{#if line.isEdited}
													<button
														on:click={() => {
															line.link_text = line.originalName;
															line.Quantity = line.originalQuantity;
															line.SellPriceIncTax = line.originalPrice;
															line.isEdited = false;
														}}
														class="text-xs text-gray-500 hover:text-gray-700 underline"
													>
														Reset
													</button>
												{/if}
											</td>
										{/if}
									</tr>
								{/if}
							{/each}
							
							<!-- Empty rows for spacing -->
							<tr>
								<td class="px-4 py-3 border-b border-gray-200"></td>
								<td class="px-4 py-3 border-b border-gray-200"></td>
								<td class="px-4 py-3 text-right border-b border-gray-200"></td>
								{#if editingMode}
									<td class="px-4 py-3 border-b border-gray-200"></td>
								{/if}
							</tr>
							<tr>
								<td class="px-4 py-3 border-b border-gray-200"></td>
								<td class="px-4 py-3 border-b border-gray-200"></td>
								<td class="px-4 py-3 text-right border-b border-gray-200"></td>
								{#if editingMode}
									<td class="px-4 py-3 border-b border-gray-200"></td>
								{/if}
							</tr>
							<tr>
								<td class="px-4 py-3 border-b border-gray-200"></td>
								<td class="px-4 py-3 border-b border-gray-200"></td>
								<td class="px-4 py-3 text-right border-b border-gray-200"></td>
								{#if editingMode}
									<td class="px-4 py-3 border-b border-gray-200"></td>
								{/if}
							</tr>
							
							<!-- Total Row -->
							<tr class="bg-gray-50">
								<td class="px-4 py-3 text-sm font-bold text-gray-900">Total Inc GST</td>
								<td class="px-4 py-3"></td>
								<td class="px-4 py-3 text-sm font-bold text-gray-900 text-right">
									${calculatedTotal.toFixed(2)}
								</td>
								{#if editingMode}
									<td class="px-4 py-3"></td>
								{/if}
							</tr>
						</tbody>
					</table>
				</div>
		
				<div class="mt-8 text-center space-y-2">
					<p class="text-gray-600 text-lg font-semibold">{footerText?.main || 'Thank you for your order!'}</p>
					<p class="text-sm text-gray-500">{footerText?.sub || 'Visit us at www.example.com'}</p>
				</div>
			</div>
		{/each}
	{/if}

<style>
	#logo {
		max-width: 300px;
	}
	
	@media print {
		/* Reset all backgrounds and colors for print */
		* {
			background: transparent !important;
			color: black !important;
			box-shadow: none !important;
			text-shadow: none !important;
		}
		
		/* Page setup */
		@page {
			margin: 0.5in;
			size: A4;
		}
		
		/* Hide editing controls when printing */
		.editing-controls {
			display: none !important;
		}
		
		/* Hide action column when printing */
		.actions-column {
			display: none !important;
		}
		
		/* Ensure addresses are side by side on print */
		.address-grid {
			display: grid !important;
			grid-template-columns: 1fr 1fr !important;
			gap: 2rem !important;
		}
		
		/* Invoice container */
		.max-w-4xl {
			max-width: none !important;
			margin: 0 !important;
			padding: 0 !important;
		}
		
		/* Header section */
		.flex.justify-between {
			display: flex !important;
			justify-content: space-between !important;
			align-items: flex-start !important;
			margin-bottom: 2rem !important;
		}
		
		/* Logo sizing for print */
		#logo {
			max-width: 200px !important;
			height: auto !important;
		}
		
		/* Invoice title */
		.text-2xl {
			font-size: 1.5rem !important;
			font-weight: bold !important;
			margin-bottom: 1rem !important;
		}
		
		/* Address sections */
		.mb-8 {
			margin-bottom: 2rem !important;
		}
		
		.font-semibold {
			font-weight: 600 !important;
		}
		
		/* Table styling for print */
		.invoice-table {
			width: 100% !important;
			border-collapse: collapse !important;
			margin: 1rem 0 !important;
			font-size: 12px !important;
		}
		
		.invoice-table th, .invoice-table td {
			padding: 8px 12px !important;
			border: 1px solid #000 !important;
			text-align: left !important;
			vertical-align: top !important;
		}
		
		.invoice-table th {
			background-color: #f5f5f5 !important;
			font-weight: bold !important;
			text-transform: uppercase !important;
			font-size: 10px !important;
			letter-spacing: 0.05em !important;
		}
		
		.invoice-table td {
			background-color: white !important;
		}
		
		/* Right align price column */
		.invoice-table th:last-child, .invoice-table td:last-child {
			text-align: right !important;
		}
		
		/* Total row styling */
		.invoice-table tr:last-child td {
			font-weight: bold !important;
			background-color: #f5f5f5 !important;
		}
		
		/* Custom product styling for print */
		.bg-green-50 {
			background-color: #f0f9f0 !important;
		}
		
		.text-green-700 {
			color: #15803d !important;
		}
		
		/* Edited product styling for print */
		.bg-yellow-50 {
			background-color: #fefce8 !important;
		}
		
		.text-orange-600 {
			color: #ea580c !important;
		}
		
		/* Footer */
		.mt-8 {
			margin-top: 2rem !important;
		}
		
		.text-center {
			text-align: center !important;
		}
		
		/* Remove any hover effects */
		.hover\:bg-gray-50:hover {
			background-color: transparent !important;
		}
		
		/* Ensure proper spacing */
		.space-y-1 > * + * {
			margin-top: 0.25rem !important;
		}
		
		.space-y-2 > * + * {
			margin-top: 0.5rem !important;
		}
	}
	
	.text-right {
		text-align: right !important;
	}
	
</style>
