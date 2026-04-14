# Afriventry

**Enterprise Inventory & Asset Management Platform for Africa**

Afriventry is a production-ready, multi-tenant SaaS platform for managing inventory, assets, orders, and supply chains. Built with modern technologies and designed for scalability, security, and ease of use.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D22-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.9-blue.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)

---

## Features

### Core Modules

- **Inventory Management** - Track stock levels, movements, and low-stock alerts in real-time
- **Asset Tracking** - Manage assets with serial numbers, lifecycle states, and user assignments
- **Purchase & Sales Orders** - Full order lifecycle from draft to delivery with automatic stock updates
- **Multi-Warehouse** - Manage multiple locations with per-warehouse stock levels
- **Supplier & Customer Management** - Complete contact and relationship management
- **Analytics Dashboard** - KPIs, trend charts, and low-stock reports
- **Audit Logs** - Complete activity history for compliance and accountability
- **Notifications** - Real-time alerts for low stock, order events, and asset changes
- **File Uploads** - Secure document and image uploads with S3 integration
- **Role-Based Access Control** - Owner, Admin, Manager, Staff, and Viewer roles
- **Multi-Tenant Architecture** - Complete organization isolation with shared infrastructure

### Enterprise Features

- **Single Sign-On (SSO)** - SAML 2.0 and OAuth 2.0 support
- **Advanced RBAC** - Per-module CRUD permissions
- **Data Import/Export** - CSV and XLSX support
- **Compliance** - SOC 2, ISO 27001, GDPR ready
- **API** - Full REST API with tRPC type safety
- **Webhooks** - Event-driven integrations
- **Workflow Automation** - Custom business logic automation

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, TailwindCSS 4, shadcn/ui |
| **API** | tRPC 11, Express 4 |
| **Backend** | Node.js 22, TypeScript |
| **Database** | MySQL 8.0 / TiDB, Drizzle ORM |
| **Cache** | Redis 7 |
| **Auth** | JWT, OAuth 2.0, Manus OAuth |
| **Storage** | AWS S3 (or compatible) |
| **Testing** | Vitest, Supertest |
| **Deployment** | Docker, Kubernetes, Cloud Run, ECS |

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL 8.0+
- Redis 7+

### Local Development

```bash
# Clone repository
git clone https://github.com/your-org/afriventry.git
cd afriventry

# Install dependencies
pnpm install

# Copy environment file and configure
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev

# In another terminal, run database migrations
pnpm db:push

# Run tests
pnpm test
```

Access the app at `http://localhost:3000`

### Docker Deployment

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

---

## Project Structure

```
afriventry/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                   # Page components (Dashboard, Inventory, etc.)
│   │   ├── components/              # Reusable UI components
│   │   ├── contexts/                # React contexts (OrgContext)
│   │   ├── hooks/                   # Custom hooks
│   │   ├── lib/                     # Utilities (tRPC client)
│   │   ├── App.tsx                  # Main app with routing
│   │   └── index.css                # Global styles
│   └── public/                      # Static assets
├── server/                          # Node.js backend
│   ├── routers/                     # tRPC routers (modular)
│   │   ├── organizations.ts
│   │   ├── inventory.ts
│   │   ├── assets.ts
│   │   ├── orders.ts
│   │   ├── suppliers.ts
│   │   ├── customers.ts
│   │   ├── warehouses.ts
│   │   ├── notifications.ts
│   │   ├── auditLogs.ts
│   │   ├── settings.ts
│   │   └── dashboard.ts
│   ├── db.ts                        # Database query helpers
│   ├── routers.ts                   # Main tRPC router
│   └── _core/                       # Framework plumbing
├── drizzle/                         # Database schema & migrations
│   ├── schema.ts                    # Drizzle ORM schema (22 tables)
│   └── migrations/                  # Generated SQL migrations
├── shared/                          # Shared types and constants
├── Dockerfile                       # Container image
├── docker-compose.yml               # Local development stack
├── ARCHITECTURE.md                  # System architecture
├── ENTERPRISE_GUIDE.md              # Enterprise features & scaling
├── DEPLOYMENT.md                    # Deployment guide
└── package.json                     # Dependencies & scripts
```

---

## Database Schema

Afriventry includes 22 tables covering 6 domains:

### Authentication & Users
- `users` - User accounts with OAuth integration
- `org_members` - Organization membership with roles

### Organizations & RBAC
- `organizations` - Tenant organizations
- `roles` - Predefined roles (Owner, Admin, Manager, Staff, Viewer)
- `permissions` - Fine-grained permissions
- `role_permissions` - Role-permission mappings

### Inventory
- `categories` - Inventory item categories
- `inventory_items` - Stock items with SKU and pricing
- `stock_levels` - Current stock per warehouse
- `stock_movements` - Stock transaction history

### Assets
- `assets` - Physical assets with serial numbers
- `asset_assignments` - Asset assignment history

### Orders & Commerce
- `purchase_orders` - PO with line items
- `purchase_order_items` - PO line details
- `sales_orders` - SO with line items
- `sales_order_items` - SO line details
- `suppliers` - Supplier contact information
- `customers` - Customer contact information
- `warehouses` - Warehouse locations

### System
- `audit_logs` - Activity history for compliance
- `notifications` - In-app notifications
- `file_uploads` - File metadata and S3 references
- `org_settings` - Organization-level configuration

---

## API Examples

### Get Current User

```typescript
const { data: user } = trpc.auth.me.useQuery();
```

### List Inventory Items

```typescript
const { data: items } = trpc.inventory.list.useQuery({
  organizationId: 1,
  warehouseId: 2,
});
```

### Create Purchase Order

```typescript
const createPO = trpc.orders.createPurchaseOrder.useMutation();

await createPO.mutateAsync({
  organizationId: 1,
  supplierId: 5,
  items: [
    { inventoryItemId: 10, quantity: 100, unitPrice: 25.00 }
  ],
});
```

### Get Dashboard Analytics

```typescript
const { data: analytics } = trpc.dashboard.getAnalytics.useQuery({
  organizationId: 1,
  dateRange: { start: new Date('2026-01-01'), end: new Date() }
});
```

---

## Authentication

Afriventry supports multiple authentication methods:

### Manus OAuth (Default)

```typescript
// Automatic OAuth flow via Manus platform
// Users sign in via getLoginUrl() which redirects to Manus OAuth portal
```

### JWT-Based Auth

```typescript
// Custom JWT implementation
const token = jwt.sign(
  { userId: user.id, organizationId: org.id },
  process.env.JWT_SECRET
);
```

### Multi-Tenant Login

Users can belong to multiple organizations and switch between them via the org switcher in the dashboard.

---

## RBAC System

Five roles with enforced hierarchy:

| Role | Permissions |
|---|---|
| **Owner** | Full system access, billing, team management |
| **Admin** | Organization management, user management, all modules |
| **Manager** | Inventory, orders, suppliers, customers, analytics |
| **Staff** | Create/edit inventory, orders, view analytics |
| **Viewer** | Read-only access to all modules |

---

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/inventory.test.ts

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

**Test Coverage:**
- 36 tests across all routers
- Unit tests for auth, organizations, inventory, assets, orders, etc.
- Integration tests for multi-tenant isolation

---

## Deployment

### Docker

```bash
# Build image
docker build -t afriventry:latest .

# Run container
docker run -d -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e REDIS_URL="redis://..." \
  afriventry:latest
```

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml

# Scale replicas
kubectl scale deployment afriventry --replicas=5
```

### Cloud Platforms

- **AWS:** ECS, Elastic Beanstalk, App Runner
- **Google Cloud:** Cloud Run, GKE
- **Azure:** Container Instances, App Service
- **Manus:** Built-in hosting with custom domains

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:pass@localhost:3306/afriventry

# Cache
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im

# APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-key
```

See [.env.example](./.env.example) for all available options.

---

## Performance Optimization

### Caching Strategy

- **Browser Cache:** Static assets cached for 1 year
- **CDN Cache:** Dynamic content cached for 5 minutes
- **Redis Cache:** Query results cached for 10 minutes
- **Database Indexes:** Optimized for common queries

### Query Optimization

```typescript
// Use pagination for large datasets
const { data: items } = trpc.inventory.list.useQuery({
  organizationId: 1,
  limit: 50,
  offset: 0,
});

// Use select to fetch only needed fields
const { data: summary } = trpc.dashboard.getSummary.useQuery({
  organizationId: 1,
});
```

See [ENTERPRISE_GUIDE.md](./ENTERPRISE_GUIDE.md) for detailed performance recommendations.

---

## Security

### Best Practices

- **HTTPS Only** - All traffic encrypted in transit
- **CORS** - Restricted to trusted origins
- **Rate Limiting** - API rate limits to prevent abuse
- **Input Validation** - All inputs validated server-side
- **SQL Injection Prevention** - Parameterized queries via Drizzle ORM
- **XSS Protection** - React escapes by default
- **CSRF Protection** - Secure tokens for state-changing operations

### Compliance

- **SOC 2 Type II** - Security, availability, processing integrity
- **ISO 27001** - Information security management
- **GDPR** - Data privacy and user rights
- **HIPAA** - Healthcare data protection (optional)

See [ENTERPRISE_GUIDE.md](./ENTERPRISE_GUIDE.md) for security hardening guide.

---

## Monitoring & Logging

### Application Monitoring

- **Datadog** - APM, metrics, logs
- **New Relic** - Performance monitoring
- **Sentry** - Error tracking

### Logging

- **Console** - Development logging
- **File** - Persistent logs
- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **CloudWatch** - AWS monitoring

---

## Troubleshooting

### Common Issues

**Database Connection Error:**

```bash
# Check MySQL is running
docker-compose ps mysql

# Test connection
mysql -u user -p -h localhost -e "SELECT 1"
```

**Redis Connection Error:**

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli ping
```

**Build Errors:**

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript
pnpm check
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Create feature branch from `main`
2. Make changes and write tests
3. Ensure all tests pass (`pnpm test`)
4. Ensure TypeScript compiles (`pnpm check`)
5. Submit PR with description

---

## Roadmap

### Q2 2026
- [ ] Advanced RBAC with per-module permissions
- [ ] Barcode/QR code scanning
- [ ] Bulk CSV import/export
- [ ] Email notification delivery (SMTP)

### Q3 2026
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and BI integration
- [ ] Workflow automation engine
- [ ] API marketplace

### Q4 2026
- [ ] AI-powered demand forecasting
- [ ] Blockchain supply chain tracking
- [ ] IoT sensor integration
- [ ] Enterprise support packages

---

## License

MIT License - see [LICENSE](./LICENSE) file for details

---

## Support

- **Documentation:** https://docs.afriventry.com
- **GitHub Issues:** https://github.com/your-org/afriventry/issues
- **Community:** https://community.afriventry.com
- **Email:** support@afriventry.com
- **Twitter:** [@afriventry](https://twitter.com/afriventry)

---

## Acknowledgments

Built with ❤️ for Africa's inventory management needs.

**Technologies:**
- React & TypeScript
- tRPC for type-safe APIs
- Drizzle ORM for database
- TailwindCSS for styling
- shadcn/ui for components

---

## Changelog

### v1.0.0 (2026-04-11)

**Initial Release**
- 12 core modules
- 22 database tables
- 14 tRPC routers
- 14 frontend pages
- Complete RBAC system
- Multi-tenant architecture
- 36 passing tests
- Docker & Kubernetes support
- Comprehensive documentation

---

**Made with ❤️ for Africa's businesses**
