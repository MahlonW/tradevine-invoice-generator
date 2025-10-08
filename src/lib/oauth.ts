import { env } from '$env/dynamic/private';
import axios from 'axios';
import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';

export class OAuth1Client {
	private oauth: OAuth;
	private token: { key: string; secret: string };

	constructor() {
		const consumerKey = env.CONSUMER_KEY || 'your-consumer-key';
		const consumerSecret = env.CONSUMER_SECRET || 'your-consumer-secret';
		const tokenKey = env.TOKEN_KEY || 'your-token-key';
		const tokenSecret = env.TOKEN_SECRET || 'your-token-secret';

		this.oauth = new OAuth({
			consumer: { key: consumerKey, secret: consumerSecret },
			signature_method: 'HMAC-SHA1',
			hash_function(base_string, key) {
				return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
			}
		});

		this.token = { key: tokenKey, secret: tokenSecret };
	}

	async makeRequest(method: string, url: string, additionalParams: Record<string, string> = {}): Promise<any> {
		try {
			// Build the full URL with query parameters
			const fullUrl = new URL(url);
			Object.keys(additionalParams).forEach(key => {
				fullUrl.searchParams.set(key, additionalParams[key]);
			});

			const requestData = {
				url: fullUrl.toString(),
				method: method.toUpperCase()
			};

			const authHeader = this.oauth.toHeader(this.oauth.authorize(requestData, this.token));

			console.log('Making OAuth request to:', fullUrl.toString());
			console.log('Authorization header:', authHeader.Authorization);

			const response = await axios({
				method: method.toLowerCase(),
				url: fullUrl.toString(),
				headers: {
					...authHeader,
					'Content-Type': 'application/json'
				},
				timeout: 10000 // 10 second timeout
			});

			console.log('OAuth request successful, status:', response.status);
			return response.data;
		} catch (error) {
			console.error('OAuth request failed:', error);
			if (axios.isAxiosError(error)) {
				console.error('Response status:', error.response?.status);
				console.error('Response data:', error.response?.data);
			}
			throw error;
		}
	}
}
