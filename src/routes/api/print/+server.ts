import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { pdf, filename } = await request.json();

		if (!pdf || !filename) {
			return json(
				{ error: 'Missing required fields: pdf, filename' },
				{ status: 400 }
			);
		}

		// Get PrintNode configuration from environment
		const printNodeApiKey = env.PRINTNODE_API_KEY;
		const printerId = env.PRINTNODE_PRINTER_ID;
		
		console.log('PrintNode config check:', {
			hasApiKey: !!printNodeApiKey,
			hasPrinterId: !!printerId,
			printerId: printerId
		});
		
		if (!printNodeApiKey || !printerId) {
			return json(
				{ error: 'PrintNode configuration not complete. Please set PRINTNODE_API_KEY and PRINTNODE_PRINTER_ID' },
				{ status: 500 }
			);
		}

		// Send print job to PrintNode
		console.log('Sending to PrintNode:', {
			printerId: printerId,
			filename: filename,
			pdfSize: pdf.length,
			apiKeyLength: printNodeApiKey.length
		});

		const printResponse = await fetch('https://api.printnode.com/printjobs', {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				printerId: printerId,
				title: filename,
				contentType: 'pdf_base64',
				content: pdf,
				source: 'TradeMe Invoice System'
			})
		});

		console.log('PrintNode response status:', printResponse.status);

		if (!printResponse.ok) {
			const errorData = await printResponse.json();
			console.error('PrintNode API error:', {
				status: printResponse.status,
				statusText: printResponse.statusText,
				errorData: errorData
			});
			return json(
				{ error: `PrintNode API error: ${errorData.message || errorData.error || 'Unknown error'}` },
				{ status: printResponse.status }
			);
		}

		const result = await printResponse.json();
		console.log('PrintNode success:', result);
		
		return json({
			success: true,
			printJobId: result.id,
			message: 'Print job sent successfully'
		});

	} catch (error) {
		console.error('Error in print API:', error);
		return json(
			{ error: 'Failed to send print job' },
			{ status: 500 }
		);
	}
};
