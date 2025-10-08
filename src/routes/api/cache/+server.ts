import { json } from '@sveltejs/kit';
import { cacheService } from '$lib/cache';

export async function GET() {
	try {
		const cacheInfo = cacheService.getCacheInfo();
		return json({
			...cacheInfo,
			message: 'Cache status retrieved successfully'
		});
	} catch (error) {
		console.error('Error getting cache info:', error);
		return json(
			{ error: 'Failed to get cache info' },
			{ status: 500 }
		);
	}
}

export async function DELETE() {
	try {
		cacheService.clear();
		return json({
			message: 'Cache cleared successfully'
		});
	} catch (error) {
		console.error('Error clearing cache:', error);
		return json(
			{ error: 'Failed to clear cache' },
			{ status: 500 }
		);
	}
}
