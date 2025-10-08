# TradeMe Svelte App - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- MySQL/MariaDB database
- TradeMe API credentials

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env with your credentials
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
```

### 2. Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

### 3. Production Deployment

#### Option A: Docker Compose (Recommended)
```bash
# Build and start all services
docker-compose up --build -d

# Check logs
docker-compose logs -f

# Access application
# - App: http://localhost:3000
# - Nginx: http://localhost:80
```

#### Option B: Manual Docker Build
```bash
# Build image
docker build -t trademe-svelte .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=your_host \
  -e DB_USER=your_user \
  -e DB_PASSWORD=your_password \
  -e DB_NAME=your_db \
  trademe-svelte
```

#### Option C: Direct Node.js
```bash
# Build application
npm run build

# Start production server
npm run preview
```

## 📁 Project Structure

```
svelt/
├── src/
│   ├── lib/
│   │   ├── api-service.ts    # TradeMe API integration
│   │   ├── database.ts       # Database utilities
│   │   ├── oauth.ts          # OAuth 1.0 client
│   │   └── types.ts          # TypeScript interfaces
│   └── routes/
│       ├── api/              # API endpoints
│       │   ├── sales-orders/
│       │   ├── order/[orderId]/
│       │   └── sales/
│       ├── invoice/[orderId]/ # Invoice pages
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

## 🔧 Configuration

### Environment Variables
- `DB_HOST`: Database host address
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `CONSUMER_KEY`: TradeMe OAuth consumer key
- `CONSUMER_SECRET`: TradeMe OAuth consumer secret
- `TOKEN_KEY`: TradeMe OAuth token key
- `TOKEN_SECRET`: TradeMe OAuth token secret
- `PORT`: Application port (default: 3000)
- `LOGO_URL`: Logo URL (works in both development and production)

### Database Schema
The application automatically creates the required table:
```sql
CREATE TABLE orders (
    order_number VARCHAR(255) PRIMARY KEY,
    invoice_number INT
);
```

## 🌐 API Endpoints

- `GET /api/sales-orders` - Fetch all sales orders
- `GET /api/order/[orderId]` - Get specific order details
- `GET /api/sales` - Get sales analytics data

## 🎯 Features

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

### Sales Analytics
- 30-day sales tracking
- Performance gauges
- Comparative analytics
- Visual data representation

## 🐳 Docker Services

### Application Container
- **Image**: Node.js 18 Alpine
- **Port**: 3000
- **Features**: SvelteKit app with API endpoints

### Nginx Container
- **Image**: Nginx Alpine
- **Ports**: 80, 443
- **Features**: Reverse proxy and static file serving

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf .svelte-kit node_modules
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   - Verify database credentials in `.env`
   - Ensure database is accessible from container
   - Check firewall settings

3. **API Authentication Issues**
   - Verify OAuth credentials in `.env`
   - Check TradeMe API endpoint availability
   - Review OAuth signature generation

4. **Docker Issues**
   ```bash
   # Check container logs
   docker-compose logs app
   
   # Restart services
   docker-compose restart
   
   # Rebuild from scratch
   docker-compose down
   docker-compose up --build
   ```

### Health Checks
```bash
# Check application health
curl http://localhost:3000/api/sales-orders

# Check database connection
docker-compose exec app node -e "
const db = require('./src/lib/database');
db.getConnection().then(() => console.log('DB OK')).catch(console.error);
"
```

## 📊 Monitoring

### Logs
```bash
# Application logs
docker-compose logs -f app

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nginx
```

### Performance
- Monitor database connection pool
- Check API response times
- Review memory usage in containers

## 🔒 Security

### Production Checklist
- [ ] Change default database credentials
- [ ] Use strong OAuth secrets
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs

### Environment Security
- Never commit `.env` files
- Use secrets management in production
- Rotate credentials regularly
- Monitor for unauthorized access

## 📈 Scaling

### Horizontal Scaling
- Use load balancer with multiple app instances
- Database read replicas for API queries
- CDN for static assets

### Vertical Scaling
- Increase container resources
- Optimize database queries
- Cache frequently accessed data

## 🆘 Support

For issues and questions:
1. Check this documentation
2. Review application logs
3. Verify configuration
4. Contact development team

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintainer**: Development Team
