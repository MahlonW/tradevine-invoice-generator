import { json } from '@sveltejs/kit';
import { getOrder } from '$lib/api-service';
import { getInvoiceNumber } from '$lib/database';

export async function GET({ params, url }) {
	try {
		const orderId = params.orderId;
		
		if (!orderId) {
			return json(
				{ error: 'Order ID is required' },
				{ status: 400 }
			);
		}
		
		// Check for force refresh parameter
		const forceRefresh = url.searchParams.get('force') === 'true';
		
		console.log('Fetching order details for:', orderId, 'Force refresh:', forceRefresh);
		
		// Get order details from API (with optional force refresh)
		const salesOrders = await getOrder(orderId, forceRefresh);
		console.log('Sales orders fetched:', salesOrders.length);
		
		// Get invoice number from database
		const invoiceNumber = await getInvoiceNumber(orderId);
		console.log('Invoice number:', invoiceNumber);
		
		return json({
			salesOrders,
			invoiceNumber,
			cached: !forceRefresh
		});
	} catch (error) {
		console.error('Error in order API:', error);
		return json(
			{ 
				error: 'Failed to fetch order details',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
