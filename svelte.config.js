import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// Increase body size limit for PDF uploads
		bodySizeLimit: 10 * 1024 * 1024 // 10MB
	}
};

export default config;
