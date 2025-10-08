import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ setHeaders }) => {
	const logoUrl = env.LOGO_URL || '/logo.svg';
	
	// Set cache control headers
	setHeaders({
		'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutes
		'ETag': `"logo-${logoUrl}"`, // ETag for conditional requests
		'Last-Modified': new Date().toUTCString()
	});
	
	return json({
		logoUrl,
		footerText: {
			main: env.FOOTER_MAIN_TEXT || 'Thank you for your order!',
			sub: env.FOOTER_SUB_TEXT || 'Visit us at www.example.com'
		},
		companyAddress: {
			line1: env.COMPANY_ADDRESS_LINE1 || '123 Example Street,',
			line2: env.COMPANY_ADDRESS_LINE2 || 'Example City,',
			line3: env.COMPANY_ADDRESS_LINE3 || 'Example 1234',
			email: env.COMPANY_EMAIL || 'Email: contact@example.com'
		}
	});
};
