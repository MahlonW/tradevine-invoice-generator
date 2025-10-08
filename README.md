# TradeMe Sales Orders Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Svelte](https://img.shields.io/badge/Svelte-4.2.0-orange.svg)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF.svg)](https://vitejs.dev/)

A modern Svelte-based web application for managing TradeMe sales orders, invoices, and sales analytics. Built with SvelteKit, TypeScript, and Tailwind CSS.

Mostly an ai port of an old python project with a few improvements.

## Features

- **Sales Orders Dashboard**: View and manage sales orders from TradeMe API
- **Invoice Generation**: Generate and view invoices for orders
- **Database Integration**: MySQL/MariaDB integration for order tracking
- **OAuth 1.0 Authentication**: Secure API access to TradeMe services
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose (for containerized deployment)
- MySQL/MariaDB database
- TradeMe API credentials

## Environment Variables

Copy `env.example` to `.env` and configure the following variables:

```bash
# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# OAuth 1.0 Credentials
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
TOKEN_KEY=your_token_key
TOKEN_SECRET=your_token_secret

# Logo Configuration (Optional)
LOGO_URL=/logo.svg
# You can also use external URLs:
# LOGO_URL=https://example.com/your-logo.png

# Server Configuration
PORT=3000
NODE_ENV=production
```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Docker Deployment

### Using Docker Compose (Recommended for Development)

1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Application: `http://localhost:3000`
   - Nginx (if configured): `http://localhost:80`

### Using Pre-built Images from GitHub Container Registry

Docker images are automatically built and pushed to GitHub Container Registry on every push to main/develop branches and when creating version tags.

**Available image tags:**
- `ghcr.io/mahlonw/tradevine-invoice-generator:latest` - Latest stable release
- `ghcr.io/mahlonw/tradevine-invoice-generator:v1.0.0` - Specific version
- `ghcr.io/mahlonw/tradevine-invoice-generator:main` - Latest from main branch

## Project Structure

```
svelt/
├── src/
│   ├── lib/
│   │   ├── api-service.ts    # TradeMe API integration
│   │   ├── database.ts       # Database utilities
│   │   └── oauth.ts          # OAuth 1.0 client
│   └── routes/
│       ├── api/              # API endpoints
│       ├── invoice/          # Invoice pages
│       ├── sales/            # Sales dashboard
│       └── +page.svelte      # Main dashboard
├── static/
│   ├── logo.svg             # Default company logo (SVG)
│   └── items_data.json      # Product mapping data
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── package.json
```

## API Endpoints

- `GET /api/sales-orders` - Fetch all sales orders
- `GET /api/order/[orderId]` - Get specific order details

## Database Schema

The application creates an `orders` table with the following structure:

```sql
CREATE TABLE orders (
    order_number VARCHAR(255) PRIMARY KEY,
    invoice_number INT
);
```

## Features

### Sales Orders Dashboard
- Real-time order listing from TradeMe API
- Order status tracking (processed/unprocessed)
- Customer and shipping information display
- Direct links to invoice generation

### Invoice Generation
- Professional invoice layout with customizable logo
- Editable product names
- Automatic invoice numbering
- Print-friendly design
- Environment-configurable branding

## CI/CD Pipeline

This project includes automated CI/CD workflows:

### Continuous Integration (CI)
- **Type Checking**: TypeScript compilation and Svelte component validation
- **Security Audit**: Automated dependency vulnerability scanning
- **Docker Build**: Multi-architecture Docker image building
- **Container Registry**: Automatic pushing to GitHub Container Registry

### Continuous Deployment (CD)
- **Branch-based Images**: Automatic builds for `main` and `develop` branches
- **Version Tags**: Semantic versioning support with `v*` tags
- **Multi-Architecture**: Support for `linux/amd64` and `linux/arm64`
- **Caching**: Optimized build caching for faster builds

### Workflow Triggers
- **Push to main/develop**: Builds and pushes `main`/`develop` tagged images
- **Pull Requests**: Builds and tests without pushing images
- **Version Tags**: Creates release images with version tags (e.g., `v1.0.0`)

## Security

- OAuth 1.0 authentication for API access
- Environment variable configuration
- Database connection security
- Input validation and sanitization
- Automated security scanning in CI pipeline

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, contact the development team.
