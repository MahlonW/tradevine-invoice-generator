import { json } from '@sveltejs/kit';
import { getSalesOrders, getRecentSalesOrders } from '$lib/api-service';
import { orderExists, getAllOrderNumbers, createDatabase } from '$lib/database';

export async function GET({ url }) {
	try {
		// Check for force refresh parameter
		const forceRefresh = url.searchParams.get('force') === 'true';
		
		// Initialize database
		await createDatabase();
		
		// Get sales orders from API (with optional force refresh)
		const salesOrders = await getSalesOrders(forceRefresh);
		
		// Also fetch recent orders (last 5 hours) to ensure we don't miss any
		let recentOrders = [];
		try {
			recentOrders = await getRecentSalesOrders(5, forceRefresh);
		} catch (error) {
			console.warn('Failed to fetch recent orders, continuing with main orders:', error);
		}
		
		// Merge and deduplicate orders (recent orders might overlap with main orders)
		const allOrders = [...salesOrders];
		recentOrders.forEach(recentOrder => {
			if (!allOrders.find(order => order.OrderNumber === recentOrder.OrderNumber)) {
				allOrders.push(recentOrder);
			}
		});
		
		// Sort all orders by creation date (newest first)
		const sortedAllOrders = allOrders.sort((a: any, b: any) => {
			const dateA = new Date(a.CreatedDate);
			const dateB = new Date(b.CreatedDate);
			return dateB.getTime() - dateA.getTime();
		});
		
		// Get existing order numbers from database
		const orderNumbers = await getAllOrderNumbers();
		
		// Check which orders exist in database
		const processedOrders = [];
		for (const order of sortedAllOrders) {
			const exists = await orderExists(order.OrderNumber);
			if (exists) {
				processedOrders.push(exists);
			}
		}
		
		return json({
			salesOrders: sortedAllOrders,
			orderNumbers: processedOrders,
			cached: !forceRefresh,
			recentOrdersCount: recentOrders.length,
			totalOrdersCount: sortedAllOrders.length
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
