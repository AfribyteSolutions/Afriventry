# Afriventry Deployment Guide

This guide covers deploying Afriventry to production environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Cloud Platforms](#cloud-platforms)
5. [Database Migrations](#database-migrations)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Considerations](#security-considerations)

---

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL 8.0+
- Redis 7+

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/afriventry.git
cd afriventry

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Start development server
pnpm dev

# In another terminal, run database migrations
pnpm db:push
```

The app will be available at `http://localhost:3000`

---

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

This starts:
- MySQL database
- Redis cache
- Afriventry application

### Build Custom Docker Image

```bash
# Build image
docker build -t afriventry:latest .

# Run container
docker run -d \
  --name afriventry \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@db:3306/afriventry" \
  -e REDIS_URL="redis://redis:6379" \
  -e JWT_SECRET="your-secret" \
  afriventry:latest
```

### Docker Compose Production Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.9'

services:
  mysql:
    image: mysql:8.0-alpine
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: afriventry
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: always
    networks:
      - afriventry

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always
    networks:
      - afriventry

  app:
    image: ghcr.io/your-org/afriventry:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/afriventry
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      # ... other env vars
    depends_on:
      - mysql
      - redis
    restart: always
    networks:
      - afriventry

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: always
    networks:
      - afriventry

volumes:
  mysql_data:
  redis_data:

networks:
  afriventry:
    driver: bridge
```

Deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Kubernetes Deployment

### Prerequisites

- kubectl configured
- Kubernetes cluster (1.24+)
- Helm 3+ (optional)

### Create Namespace

```bash
kubectl create namespace afriventry
```

### Create Secrets

```bash
kubectl create secret generic afriventry-secrets \
  --from-literal=database-url="mysql://user:pass@mysql:3306/afriventry" \
  --from-literal=jwt-secret="your-secret" \
  --from-literal=redis-url="redis://redis:6379" \
  -n afriventry
```

### Deploy with Helm (Recommended)

```bash
# Add Helm repository
helm repo add afriventry https://charts.afriventry.com
helm repo update

# Install
helm install afriventry afriventry/afriventry \
  --namespace afriventry \
  --values values.yaml
```

### Manual Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: afriventry
  namespace: afriventry
spec:
  replicas: 3
  selector:
    matchLabels:
      app: afriventry
  template:
    metadata:
      labels:
        app: afriventry
    spec:
      containers:
      - name: afriventry
        image: ghcr.io/your-org/afriventry:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: afriventry-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: afriventry-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: afriventry-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: afriventry
  namespace: afriventry
spec:
  selector:
    app: afriventry
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

Deploy:

```bash
kubectl apply -f k8s/deployment.yaml
```

---

## Cloud Platforms

### AWS Deployment

#### Option 1: ECS (Elastic Container Service)

```bash
# Push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag afriventry:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/afriventry:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/afriventry:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS service
aws ecs create-service --cluster afriventry --service-name afriventry --task-definition afriventry --desired-count 3
```

#### Option 2: Elastic Beanstalk

```bash
# Initialize Elastic Beanstalk
eb init -p "Node.js 22 running on 64bit Amazon Linux 2" afriventry

# Create environment
eb create afriventry-prod

# Deploy
eb deploy
```

#### Option 3: App Runner

```bash
# Create App Runner service
aws apprunner create-service \
  --service-name afriventry \
  --source-configuration ImageRepository={ImageIdentifier=123456789.dkr.ecr.us-east-1.amazonaws.com/afriventry:latest,ImageRepositoryType=ECR}
```

### Google Cloud Platform (GCP)

#### Cloud Run

```bash
# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/afriventry

# Deploy to Cloud Run
gcloud run deploy afriventry \
  --image gcr.io/PROJECT_ID/afriventry \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL="mysql://..." \
  --memory 512Mi \
  --cpu 1
```

#### GKE (Google Kubernetes Engine)

```bash
# Create cluster
gcloud container clusters create afriventry --num-nodes 3

# Deploy
kubectl apply -f k8s/deployment.yaml
```

### Azure Deployment

#### Container Instances

```bash
# Create resource group
az group create --name afriventry --location eastus

# Deploy container
az container create \
  --resource-group afriventry \
  --name afriventry \
  --image ghcr.io/your-org/afriventry:latest \
  --ports 3000 \
  --environment-variables DATABASE_URL="mysql://..." \
  --memory 1 --cpu 1
```

#### App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name afriventry-plan \
  --resource-group afriventry \
  --sku B2

# Create Web App
az webapp create \
  --resource-group afriventry \
  --plan afriventry-plan \
  --name afriventry-app \
  --deployment-container-image-name ghcr.io/your-org/afriventry:latest
```

---

## Database Migrations

### Running Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm db:push

# Or manually run SQL
mysql -u user -p database < migrations/001_initial.sql
```

### Backup Before Migration

```bash
# MySQL backup
mysqldump -u user -p afriventry > backup-$(date +%Y%m%d).sql

# Restore from backup
mysql -u user -p afriventry < backup-20260411.sql
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/afriventry

# Cache
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=your-super-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-key

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://afriventry.com
```

### Secrets Management

**AWS Secrets Manager:**

```bash
aws secretsmanager create-secret \
  --name afriventry/prod \
  --secret-string file://secrets.json
```

**HashiCorp Vault:**

```bash
vault kv put secret/afriventry/prod \
  database_url="mysql://..." \
  jwt_secret="..."
```

---

## Monitoring & Logging

### Application Monitoring

**Datadog:**

```bash
# Add Datadog agent
docker run -d \
  -e DD_AGENT_HOST=localhost \
  -e DD_TRACE_ENABLED=true \
  afriventry:latest
```

**New Relic:**

```bash
# Install New Relic agent
npm install newrelic

# Add to server startup
require('newrelic');
```

### Logging

**ELK Stack (Elasticsearch, Logstash, Kibana):**

```javascript
// server/_core/logging.ts
import winston from 'winston';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

**CloudWatch (AWS):**

```bash
# Configure CloudWatch Logs
export AWS_REGION=us-east-1
export LOG_GROUP=/aws/ecs/afriventry
```

---

## Security Considerations

### SSL/TLS Certificates

**Let's Encrypt with Nginx:**

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d afriventry.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Network Security

**Firewall Rules:**

```bash
# Allow only HTTPS
ufw allow 443/tcp
ufw allow 80/tcp  # For redirect
ufw deny 3000/tcp # Block direct app access
```

**VPC Security Groups (AWS):**

```bash
# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### Database Security

**Enable SSL:**

```bash
# MySQL SSL connection
DATABASE_URL=mysql://user:pass@host:3306/afriventry?ssl=true
```

**Backup Strategy:**

```bash
# Daily automated backups
0 2 * * * mysqldump -u user -p afriventry | gzip > /backups/afriventry-$(date +\%Y\%m\%d).sql.gz
```

### API Rate Limiting

```typescript
// server/_core/rateLimit.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
});

app.use('/api/', limiter);
```

---

## Troubleshooting

### Common Issues

**Database Connection Error:**

```bash
# Check MySQL is running
docker-compose ps mysql

# Check connection string
echo $DATABASE_URL

# Test connection
mysql -u user -p -h host -e "SELECT 1"
```

**Redis Connection Error:**

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli ping
```

**Out of Memory:**

```bash
# Increase container memory
docker-compose.yml: mem_limit: 2g

# Or in Kubernetes
resources:
  limits:
    memory: "2Gi"
```

### Health Checks

```bash
# Check app health
curl http://localhost:3000/health

# Check database
curl http://localhost:3000/api/health/db

# Check Redis
curl http://localhost:3000/api/health/redis
```

---

## Support & Documentation

- **GitHub Issues:** https://github.com/your-org/afriventry/issues
- **Documentation:** https://docs.afriventry.com
- **Community:** https://community.afriventry.com
- **Email:** support@afriventry.com
