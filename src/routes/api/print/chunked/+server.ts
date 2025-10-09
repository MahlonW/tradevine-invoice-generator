import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Store chunks temporarily (in production, use Redis or similar)
const chunks = new Map<string, { data: string[], totalChunks: number, currentChunks: number }>();

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { chunk, chunkIndex, totalChunks, filename, chunkId } = await request.json();

		if (!chunk || chunkIndex === undefined || !totalChunks || !filename || !chunkId) {
			return json(
				{ error: 'Missing required fields: chunk, chunkIndex, totalChunks, filename, chunkId' },
				{ status: 400 }
			);
		}

		// Store or update chunk data
		if (!chunks.has(chunkId)) {
			chunks.set(chunkId, {
				data: new Array(totalChunks).fill(''),
				totalChunks,
				currentChunks: 0
			});
		}

		const chunkData = chunks.get(chunkId)!;
		chunkData.data[chunkIndex] = chunk;
		chunkData.currentChunks++;

		console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} for ${filename}`);

		// If all chunks received, process the complete PDF
		if (chunkData.currentChunks === totalChunks) {
			console.log('All chunks received, processing PDF...');
			
			// Combine all chunks
			const completePdf = chunkData.data.join('');
			console.log('Complete PDF size:', completePdf.length, 'bytes');

			// Get PrintNode configuration
			const printNodeApiKey = env.PRINTNODE_API_KEY;
			const printerId = env.PRINTNODE_PRINTER_ID;
			
			if (!printNodeApiKey || !printerId) {
				chunks.delete(chunkId); // Clean up
				return json(
					{ error: 'PrintNode configuration not complete' },
					{ status: 500 }
				);
			}

			// Send to PrintNode
			console.log('Sending to PrintNode:', {
				printerId: printerId,
				filename: filename,
				pdfSize: completePdf.length,
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
					content: completePdf,
					source: 'TradeMe Invoice System'
				})
			});

			console.log('PrintNode response status:', printResponse.status);

			// Clean up chunks
			chunks.delete(chunkId);

			if (!printResponse.ok) {
				const errorData = await printResponse.json();
				console.error('PrintNode API error:', errorData);
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
		}

		// Return progress for this chunk
		return json({
			success: true,
			progress: chunkData.currentChunks / totalChunks,
			message: `Chunk ${chunkIndex + 1}/${totalChunks} received`
		});

	} catch (error) {
		console.error('Error in chunked print API:', error);
		return json(
			{ error: 'Failed to process chunk' },
			{ status: 500 }
		);
	}
};
