import { OAuth1Client } from './oauth';
import { format, subDays } from 'date-fns';
import { cacheService } from './cache';


const oauthClient = new OAuth1Client();

export async function getSalesOrders(forceRefresh: boolean = false): Promise<any[]> {
	const currentDate = format(subDays(new Date(), 30), 'MM/dd/yy'); // Extended to 30 days
	const today = format(new Date(), 'MM/dd/yy');
	const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'MM/dd/yy'); // Tomorrow's date
	
	
	// Check cache first (unless force refresh is requested)
	const cacheKey = `sales-orders-${currentDate}-${tomorrow}`;
	if (!forceRefresh) {
		const cachedData = cacheService.get(cacheKey);
		if (cachedData) {
			return cachedData;
		}
	}
	
	const baseUrl = 'https://api.tradevine.com/v1/SalesOrder';
	const statuses = ['12001', '12002', '12003'];
	
	// Fetch orders from the last 30 days up to tomorrow
	const requests = statuses.map(status => 
		oauthClient.makeRequest('GET', baseUrl, {
			pageNumber: '1',
			pageSize: '50',
			status: status,
			createdFrom: currentDate,
			createdTo: tomorrow
		})
	);

	try {
		const responses = await Promise.all(requests);

		// Merge the "List" key from all responses
		const mergedList = responses.reduce((acc, response) => {
			return acc.concat(response.List || []);
		}, []);

		// Sort orders by creation date (newest first)
		const sortedOrders = mergedList.sort((a: any, b: any) => {
			const dateA = new Date(a.CreatedDate);
			const dateB = new Date(b.CreatedDate);
			return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
		});
		
		// Cache the results
		cacheService.set(cacheKey, sortedOrders);
		
		return sortedOrders;
	} catch (error) {
		console.error('Error fetching sales orders:', error);
		return [];
	}
}

export async function getOrder(orderNumber: string, forceRefresh: boolean = false): Promise<any[]> {
	const cacheKey = `order-${orderNumber}`;
	
	// Check cache first (unless force refresh is requested)
	if (!forceRefresh) {
		const cachedData = cacheService.get(cacheKey);
		if (cachedData) {
			console.log(`Returning cached order: ${orderNumber}`);
			return cachedData;
		}
	}
	
	const apiUrl = `https://api.tradevine.com/v1/SalesOrder?pageNumber=1&pageSize=1&orderNumber=${orderNumber}`;
	
	try {
		const response = await oauthClient.makeRequest('GET', apiUrl);
		const orderDetailsList = response.List || [];
		
		if (orderDetailsList.length > 0) {
			// Order details retrieved successfully
		}
		
		// Cache the results
		cacheService.set(cacheKey, orderDetailsList);
		
		return orderDetailsList;
	} catch (error) {
		console.error('Error fetching order:', error);
		return [];
	}
}

export async function getSalesOrdersDate(dateFrom: number, dateTo: number): Promise<any[]> {
	const createdFrom = format(subDays(new Date(), dateFrom), 'MM/dd/yy');
	const createdTo = format(subDays(new Date(), dateTo), 'MM/dd/yy');
	
	const apiUrl = `https://api.tradevine.com/v1/SalesOrder?createdFrom=${createdFrom}&createdTo=${createdTo}&pageNumber=1`;
	
	try {
		const response = await oauthClient.makeRequest('GET', apiUrl);
		return response.List || [];
	} catch (error) {
		console.error('Error fetching sales orders by date:', error);
		return [];
	}
}
