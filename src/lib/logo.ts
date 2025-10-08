import { browser } from '$app/environment';

/**
 * Get the logo URL from API endpoint
 * Uses HTTP cache control headers for caching
 */
export async function getLogoUrl(): Promise<string> {
	if (!browser) {
		// Server-side: no caching, just return default
		return '/logo.svg';
	}

	try {
		// Fetch logo URL from API endpoint
		// Browser will handle caching based on Cache-Control headers
		const response = await fetch('/api/info');
		
		if (response.ok) {
			const data = await response.json();
			return data.logoUrl || '/logo.svg';
		}
	} catch (error) {
		console.warn('Failed to fetch logo URL from API:', error);
	}

	// Fallback to default logo
	return '/logo.svg';
}
