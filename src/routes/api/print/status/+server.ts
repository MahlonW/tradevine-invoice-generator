import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const printNodeApiKey = env.PRINTNODE_API_KEY;
		const printerId = env.PRINTNODE_PRINTER_ID;
		
		if (!printNodeApiKey || !printerId) {
			return json({
				error: 'PrintNode configuration not complete',
				hasApiKey: !!printNodeApiKey,
				hasPrinterId: !!printerId
			});
		}

		// Get printer status from PrintNode
		const printerResponse = await fetch(`https://api.printnode.com/printers/${printerId}`, {
			method: 'GET',
			headers: {
				'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`,
				'Content-Type': 'application/json',
			}
		});

		if (!printerResponse.ok) {
			const errorData = await printerResponse.json();
			return json({
				error: 'Failed to get printer status',
				status: printerResponse.status,
				errorData: errorData
			});
		}

		const printerData = await printerResponse.json();
		
		// Get recent print jobs
		const jobsResponse = await fetch('https://api.printnode.com/printjobs', {
			method: 'GET',
			headers: {
				'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`,
				'Content-Type': 'application/json',
			}
		});

		let recentJobs = [];
		if (jobsResponse.ok) {
			const jobsData = await jobsResponse.json();
			recentJobs = jobsData.slice(0, 5); // Get last 5 jobs
		}

		return json({
			printer: printerData,
			recentJobs: recentJobs,
			printerId: printerId,
			apiKeyLength: printNodeApiKey.length
		});

	} catch (error) {
		console.error('Error checking PrintNode status:', error);
		return json({
			error: 'Failed to check PrintNode status',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
};
