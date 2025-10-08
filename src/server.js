import { handler } from './build/handler.js';
import express from 'express';

const app = express();

// Increase body size limit for PDF uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Let SvelteKit handle everything else
app.use(handler);

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
	console.log(`Server running on port ${port}`);
});
