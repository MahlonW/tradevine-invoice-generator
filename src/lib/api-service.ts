import { OAuth1Client } from './oauth';
import { format, subDays, subHours } from 'date-fns';
import { cacheService } from './cache';


const oauthClient = new OAuth1Client();

export async function getSalesOrders(forceRefresh: boolean = false): Promise<any[]> {
	const currentDate = format(subDays(new Date(), 10), 'MM/dd/yy'); // Extended to 60 days
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
	const statuses = ['12001', '12002', '12003', '12004', '12005', '12006'];
	
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
		
		// Create detailed error information
		let errorDetails: {
			message: string;
			type: string;
			timestamp: string;
			details: {
				error?: string;
				status?: number;
				statusText?: string;
				data?: any;
				url?: string;
				method?: string;
				headers?: any;
				params?: any;
				responseHeaders?: any;
				requestData?: any;
				apiContext?: {
					baseUrl: string;
					statuses: string[];
					dateRange: string;
					totalRequests: number;
				};
			};
		} = {
			message: 'Failed to fetch sales orders',
			type: 'API_ERROR',
			timestamp: new Date().toISOString(),
			details: {}
		};

		if (error instanceof Error) {
			errorDetails.message = error.message;
			errorDetails.details.error = error.message;
		}

		// Check if it's an axios error for more specific details
		if (error && typeof error === 'object' && 'response' in error) {
			const axiosError = error as any;
			errorDetails.details.status = axiosError.response?.status;
			errorDetails.details.statusText = axiosError.response?.statusText;
			errorDetails.details.data = axiosError.response?.data;
			errorDetails.details.url = axiosError.config?.url;
			errorDetails.details.method = axiosError.config?.method?.toUpperCase();
			errorDetails.details.headers = axiosError.config?.headers;
			errorDetails.details.params = axiosError.config?.params;
			errorDetails.details.responseHeaders = axiosError.response?.headers;
			errorDetails.details.requestData = axiosError.config?.data;
			
			// Add specific API request context
			errorDetails.details.apiContext = {
				baseUrl: baseUrl,
				statuses: statuses,
				dateRange: `${currentDate} to ${tomorrow}`,
				totalRequests: statuses.length
			};
			
			// Provide user-friendly messages based on status codes
			if (axiosError.response?.status === 401) {
				errorDetails.message = 'Authentication failed - please check your API credentials';
			} else if (axiosError.response?.status === 403) {
				errorDetails.message = 'Access denied - insufficient permissions';
			} else if (axiosError.response?.status === 404) {
				errorDetails.message = 'API endpoint not found';
			} else if (axiosError.response?.status === 429) {
				errorDetails.message = 'Rate limit exceeded - please try again later';
			} else if (axiosError.response?.status >= 500) {
				errorDetails.message = 'Server error - TradeVine API is experiencing issues';
			} else if (axiosError.code === 'ECONNABORTED') {
				errorDetails.message = 'Request timeout - API took too long to respond';
			} else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
				errorDetails.message = 'Network error - unable to connect to TradeVine API';
			}
		}

		// Throw the detailed error instead of returning empty array
		throw new Error(JSON.stringify(errorDetails));
	}
}

export async function getRecentSalesOrders(hoursBack: number = 5, forceRefresh: boolean = false): Promise<any[]> {
	// Fetch orders from the last X hours to ensure we capture very recent orders
	const hoursAgo = format(subHours(new Date(), hoursBack), 'MM/dd/yy');
	const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'MM/dd/yy');
	
	// Check cache first (unless force refresh is requested)
	const cacheKey = `recent-sales-orders-${hoursAgo}-${tomorrow}`;
	if (!forceRefresh) {
		const cachedData = cacheService.get(cacheKey);
		if (cachedData) {
			return cachedData;
		}
	}
	
	const baseUrl = 'https://api.tradevine.com/v1/SalesOrder';
	const statuses = ['12001', '12002', '12003', '12004', '12005', '12006'];
	
	// Fetch orders from the last X hours up to tomorrow
	const requests = statuses.map(status => 
		oauthClient.makeRequest('GET', baseUrl, {
			pageNumber: '1',
			pageSize: '50',
			status: status,
			createdFrom: hoursAgo,
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
		
		// Cache the results (recent orders change frequently, so cache will expire naturally)
		cacheService.set(cacheKey, sortedOrders);
		
		return sortedOrders;
	} catch (error) {
		console.error('Error fetching recent sales orders:', error);
		throw error;
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
		
		// Create detailed error information
		let errorDetails: {
			message: string;
			type: string;
			timestamp: string;
			details: {
				error?: string;
				status?: number;
				statusText?: string;
				data?: any;
				url?: string;
				method?: string;
				headers?: any;
				params?: any;
				responseHeaders?: any;
				requestData?: any;
				orderNumber?: string;
				apiContext?: {
					apiUrl: string;
					orderNumber: string;
				};
			};
		} = {
			message: 'Failed to fetch order details',
			type: 'API_ERROR',
			timestamp: new Date().toISOString(),
			details: {
				orderNumber: orderNumber
			}
		};

		if (error instanceof Error) {
			errorDetails.message = error.message;
			errorDetails.details.error = error.message;
		}

		// Check if it's an axios error for more specific details
		if (error && typeof error === 'object' && 'response' in error) {
			const axiosError = error as any;
			errorDetails.details.status = axiosError.response?.status;
			errorDetails.details.statusText = axiosError.response?.statusText;
			errorDetails.details.data = axiosError.response?.data;
			errorDetails.details.url = axiosError.config?.url;
			errorDetails.details.method = axiosError.config?.method?.toUpperCase();
			errorDetails.details.headers = axiosError.config?.headers;
			errorDetails.details.params = axiosError.config?.params;
			errorDetails.details.responseHeaders = axiosError.response?.headers;
			errorDetails.details.requestData = axiosError.config?.data;
			
			// Add specific API request context
			errorDetails.details.apiContext = {
				apiUrl: apiUrl,
				orderNumber: orderNumber
			};
			
			// Provide user-friendly messages based on status codes
			if (axiosError.response?.status === 401) {
				errorDetails.message = 'Authentication failed - please check your API credentials';
			} else if (axiosError.response?.status === 403) {
				errorDetails.message = 'Access denied - insufficient permissions';
			} else if (axiosError.response?.status === 404) {
				errorDetails.message = `Order ${orderNumber} not found`;
			} else if (axiosError.response?.status === 429) {
				errorDetails.message = 'Rate limit exceeded - please try again later';
			} else if (axiosError.response?.status >= 500) {
				errorDetails.message = 'Server error - TradeVine API is experiencing issues';
			} else if (axiosError.code === 'ECONNABORTED') {
				errorDetails.message = 'Request timeout - API took too long to respond';
			} else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
				errorDetails.message = 'Network error - unable to connect to TradeVine API';
			}
		}

		// Throw the detailed error instead of returning empty array
		throw new Error(JSON.stringify(errorDetails));
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
		
		// Create detailed error information
		let errorDetails: {
			message: string;
			type: string;
			timestamp: string;
			details: {
				error?: string;
				status?: number;
				statusText?: string;
				data?: any;
				url?: string;
				method?: string;
				headers?: any;
				params?: any;
				responseHeaders?: any;
				requestData?: any;
				dateRange?: string;
				apiContext?: {
					apiUrl: string;
					dateRange: string;
					createdFrom: string;
					createdTo: string;
				};
			};
		} = {
			message: 'Failed to fetch sales orders by date',
			type: 'API_ERROR',
			timestamp: new Date().toISOString(),
			details: {
				dateRange: `${createdFrom} to ${createdTo}`
			}
		};

		if (error instanceof Error) {
			errorDetails.message = error.message;
			errorDetails.details.error = error.message;
		}

		// Check if it's an axios error for more specific details
		if (error && typeof error === 'object' && 'response' in error) {
			const axiosError = error as any;
			errorDetails.details.status = axiosError.response?.status;
			errorDetails.details.statusText = axiosError.response?.statusText;
			errorDetails.details.data = axiosError.response?.data;
			errorDetails.details.url = axiosError.config?.url;
			errorDetails.details.method = axiosError.config?.method?.toUpperCase();
			errorDetails.details.headers = axiosError.config?.headers;
			errorDetails.details.params = axiosError.config?.params;
			errorDetails.details.responseHeaders = axiosError.response?.headers;
			errorDetails.details.requestData = axiosError.config?.data;
			
			// Add specific API request context
			errorDetails.details.apiContext = {
				apiUrl: apiUrl,
				dateRange: `${createdFrom} to ${createdTo}`,
				createdFrom: createdFrom,
				createdTo: createdTo
			};
			
			// Provide user-friendly messages based on status codes
			if (axiosError.response?.status === 401) {
				errorDetails.message = 'Authentication failed - please check your API credentials';
			} else if (axiosError.response?.status === 403) {
				errorDetails.message = 'Access denied - insufficient permissions';
			} else if (axiosError.response?.status === 404) {
				errorDetails.message = 'No orders found for the specified date range';
			} else if (axiosError.response?.status === 429) {
				errorDetails.message = 'Rate limit exceeded - please try again later';
			} else if (axiosError.response?.status >= 500) {
				errorDetails.message = 'Server error - TradeVine API is experiencing issues';
			} else if (axiosError.code === 'ECONNABORTED') {
				errorDetails.message = 'Request timeout - API took too long to respond';
			} else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
				errorDetails.message = 'Network error - unable to connect to TradeVine API';
			}
		}

		// Throw the detailed error instead of returning empty array
		throw new Error(JSON.stringify(errorDetails));
	}
}
