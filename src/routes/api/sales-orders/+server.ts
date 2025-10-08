import { json } from '@sveltejs/kit';
import { getSalesOrders } from '$lib/api-service';
import { orderExists, getAllOrderNumbers, createDatabase } from '$lib/database';

export async function GET({ url }) {
	try {
		// Check for force refresh parameter
		const forceRefresh = url.searchParams.get('force') === 'true';
		
		// Initialize database
		await createDatabase();
		
		// Get sales orders from API (with optional force refresh)
		const salesOrders = await getSalesOrders(forceRefresh);
		
		// Get existing order numbers from database
		const orderNumbers = await getAllOrderNumbers();
		
		// Check which orders exist in database
		const processedOrders = [];
		for (const order of salesOrders) {
			const exists = await orderExists(order.OrderNumber);
			if (exists) {
				processedOrders.push(exists);
			}
		}
		
		return json({
			salesOrders,
			orderNumbers: processedOrders,
			cached: !forceRefresh
		});
	} catch (error) {
		console.error('Error in sales-orders API:', error);
		return json(
			{ error: 'Failed to fetch sales orders' },
			{ status: 500 }
		);
	}
}
