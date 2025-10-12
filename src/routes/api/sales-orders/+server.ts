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
		
		// Try to parse detailed error information
		let errorResponse = {
			error: 'Failed to fetch sales orders',
			details: 'An unexpected error occurred',
			timestamp: new Date().toISOString(),
			type: 'UNKNOWN_ERROR'
		};

		if (error instanceof Error) {
			try {
				// Check if the error message contains JSON error details
				const errorData = JSON.parse(error.message);
				if (errorData.message && errorData.type) {
					errorResponse = {
						error: errorData.message,
						details: errorData.details || 'No additional details available',
						timestamp: errorData.timestamp || new Date().toISOString(),
						type: errorData.type
					};
				} else {
					errorResponse.error = error.message;
					errorResponse.details = error.message;
				}
			} catch {
				// If not JSON, use the error message directly
				errorResponse.error = error.message;
				errorResponse.details = error.message;
			}
		}

		return json(errorResponse, { status: 500 });
	}
}
