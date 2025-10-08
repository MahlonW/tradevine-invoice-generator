import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		return json({
			status: 'ok',
			message: 'API is working',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return json(
			{ error: 'Test failed' },
			{ status: 500 }
		);
	}
}
