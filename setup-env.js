#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envExample = `# Database Configuration
DB_HOST=your-database-host
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# OAuth 1.0 Credentials
CONSUMER_KEY=your-consumer-key
CONSUMER_SECRET=your-consumer-secret
TOKEN_KEY=your-token-key
TOKEN_SECRET=your-token-secret

# Server Configuration
PORT=3000`;

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envExample);
    console.log('✅ Created .env file from template');
} else {
    console.log('⚠️  .env file already exists, skipping creation');
}

console.log('🔧 Environment setup complete!');
console.log('📝 Please review and update the .env file with your actual credentials');
