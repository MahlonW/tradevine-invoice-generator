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

		// Get PrintNode configuration
		const printNodeApiKey = env.PRINTNODE_API_KEY;
		const printerId = env.PRINTNODE_PRINTER_ID;
		
		if (!printNodeApiKey || !printerId) {
			return json(
				{ error: 'PrintNode configuration not complete' },
				{ status: 500 }
			);
		}

		// Validate PDF format
		const pdfHeader = pdf.substring(0, 20);
		const isBase64 = /^[A-Za-z0-9+/=]+$/.test(pdf);
		const pdfSize = pdf.length;

		console.log('PDF Test Details:', {
			filename: filename,
			pdfSize: pdfSize,
			pdfHeader: pdfHeader,
			isBase64: isBase64,
			printerId: printerId
		});

		// Try to decode and validate PDF
		let pdfValid = false;
		try {
			const binaryString = atob(pdf);
			const pdfBytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				pdfBytes[i] = binaryString.charCodeAt(i);
			}
			
			// Check for PDF header
			const pdfHeaderBytes = Array.from(pdfBytes.slice(0, 4));
			const pdfSignature = String.fromCharCode(...pdfHeaderBytes);
			pdfValid = pdfSignature === '%PDF';
			
			console.log('PDF Validation:', {
				pdfSignature: pdfSignature,
				pdfValid: pdfValid,
				binarySize: binaryString.length
			});
		} catch (error) {
			console.error('PDF validation error:', error);
		}

		// Send to PrintNode with detailed logging
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
				source: 'TradeMe Invoice System Test'
			})
		});

		const responseData = await printResponse.json();
		
		return json({
			success: printResponse.ok,
			status: printResponse.status,
			response: responseData,
			pdfDetails: {
				size: pdfSize,
				header: pdfHeader,
				isBase64: isBase64,
				pdfValid: pdfValid
			},
			printerId: printerId
		});

	} catch (error) {
		console.error('Error in test PDF API:', error);
		return json(
			{ error: 'Failed to test PDF', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
