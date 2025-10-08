import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const printNodeApiKey = env.PRINTNODE_API_KEY;
		const printerId = env.PRINTNODE_PRINTER_ID;
		
		return json({
			hasApiKey: !!printNodeApiKey,
			hasPrinterId: !!printerId,
			printerId: printerId,
			apiKeyLength: printNodeApiKey ? printNodeApiKey.length : 0
		});
	} catch (error) {
		return json({ error: 'Failed to check configuration' }, { status: 500 });
	}
};
