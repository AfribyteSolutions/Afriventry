# Inventra — System Architecture & Design Documentation

## Overview

Inventra is a **production-ready, multi-tenant Inventory & Asset Management SaaS platform** built on a modern full-stack TypeScript architecture. It provides complete isolation between organizations (tenants), role-based access control, and a rich set of modules covering the entire inventory and asset lifecycle.

---

## 1. System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + TypeScript | Component-based UI |
| **Routing** | Wouter | Lightweight client-side routing |
| **API Layer** | tRPC 11 | End-to-end type-safe RPC |
| **State / Data** | TanStack Query v5 | Server state, caching, optimistic updates |
| **Styling** | TailwindCSS 4 + shadcn/ui | Utility-first design system |
| **Charts** | Recharts | Dashboard analytics visualizations |
| **Backend** | Express 4 + Node.js | HTTP server, middleware, OAuth |
| **ORM** | Drizzle ORM | Type-safe SQL query builder |
| **Database** | MySQL (TiDB-compatible) | Relational data store |
| **Auth** | Manus OAuth + JWT | Session-based authentication |
| **File Storage** | AWS S3 (via Manus) | Document and image uploads |
| **Testing** | Vitest | Unit and integration tests |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React 19)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Dashboard│  │Inventory │  │  Assets  │  │ Orders/Suppliers│  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│                    tRPC React Query Client                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / tRPC over HTTP
┌────────────────────────────▼────────────────────────────────────┐
│                    Express Server (Node.js)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    tRPC Router Tree                       │   │
│  │  auth │ organizations │ inventory │ assets │ warehouses  │   │
│  │  suppliers │ customers │ orders │ notifications │ audit   │   │
│  │  settings │ dashboard                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               Middleware Stack                            │   │
│  │  OAuth Callback │ JWT Verification │ Tenant Context      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               Database Layer (Drizzle ORM)                │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    MySQL / TiDB Database                         │
│  22 tables across 6 domains (see schema section)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenant Architecture

### Tenant Isolation Strategy

Inventra uses a **shared database, shared schema** multi-tenancy model with `organizationId` as the discriminator on every tenant-scoped table. This approach offers:

- **Simplicity**: Single database, no schema-per-tenant complexity
- **Cost efficiency**: Shared infrastructure
- **Scalability**: Can be sharded by `organizationId` at scale

Every tRPC procedure that accesses tenant data follows this pattern:

```typescript
// 1. Verify the user is a member of the requested organization
const member = await getOrgMember(input.organizationId, ctx.user.id);
if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN" });

// 2. Optionally check minimum role
if (!["owner", "admin", "manager"].includes(member.role)) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// 3. All queries are scoped to organizationId
return getInventoryItems(input.organizationId, filters);
```

### Organization Membership Model

A user can belong to **multiple organizations** with different roles in each. The `org_members` table maps users to organizations with a role assignment.

---

## 3. Role-Based Access Control (RBAC)

### Roles Hierarchy

| Role | Description | Typical Permissions |
|---|---|---|
| **owner** | Organization creator | Full access, cannot be removed |
| **admin** | Organization administrator | Full access except owner-only ops |
| **manager** | Department manager | CRUD on inventory, assets, orders |
| **staff** | Regular team member | Create/read/update, no delete |
| **viewer** | Read-only access | Read only across all modules |

### Permission Enforcement

Role checks are enforced at the **tRPC procedure level** using a `requireOrgMember` helper:

```typescript
async function requireOrgMember(
  organizationId: number,
  userId: number,
  minRole?: string[]
) {
  const member = await getOrgMember(organizationId, userId);
  if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN" });
  if (minRole && !minRole.includes(member.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return member;
}
```

The database also has `roles`, `permissions`, and `role_permissions` tables for fine-grained permission storage, ready for a future permission-per-module CRUD system.

---

## 4. Database Schema

### Schema Overview (22 Tables)

```
Authentication Domain
├── users                    (id, openId, name, email, role)

Organization Domain
├── organizations            (id, name, slug, description, industry, ...)
├── org_members              (id, organizationId, userId, role, isActive, ...)
├── roles                    (id, organizationId, name, slug, description)
├── permissions              (id, name, slug, module, action)
├── role_permissions         (roleId, permissionId)
└── org_settings             (id, organizationId, lowStockAlerts, ...)

Inventory Domain
├── categories               (id, organizationId, name, slug, type, ...)
├── inventory_items          (id, organizationId, name, sku, type, unit, ...)
├── stock_levels             (id, organizationId, itemId, warehouseId, qty)
└── stock_movements          (id, organizationId, itemId, type, qty, ...)

Asset Domain
├── assets                   (id, organizationId, name, assetTag, serialNumber, status, ...)
└── asset_assignments        (id, assetId, userId, assignedAt, returnedAt, ...)

Location Domain
└── warehouses               (id, organizationId, name, code, type, address, ...)

Supplier/Customer Domain
├── suppliers                (id, organizationId, name, code, contactName, ...)
└── customers                (id, organizationId, name, code, contactName, ...)

Order Domain
├── purchase_orders          (id, organizationId, orderNumber, supplierId, status, ...)
├── purchase_order_items     (id, purchaseOrderId, itemId, quantity, unitPrice, ...)
├── sales_orders             (id, organizationId, orderNumber, customerId, status, ...)
└── sales_order_items        (id, salesOrderId, itemId, quantity, unitPrice, ...)

System Domain
├── audit_logs               (id, organizationId, userId, action, module, entityType, ...)
├── notifications            (id, organizationId, userId, type, title, message, isRead, ...)
└── file_uploads             (id, organizationId, userId, filename, fileKey, url, ...)
```

### Key Relationships

- `org_members` links `users` ↔ `organizations` (many-to-many with role)
- `role_permissions` links `roles` ↔ `permissions` (many-to-many)
- `stock_levels` links `inventory_items` ↔ `warehouses` (per-location stock)
- `stock_movements` tracks every change to `stock_levels`
- `asset_assignments` tracks who has each `asset` and when
- `purchase_order_items` / `sales_order_items` are line items for orders

### Soft Deletes

The following tables support soft deletes via `deletedAt`:
- `organizations`, `inventory_items`, `assets`, `suppliers`, `customers`

---

## 5. API Layer (tRPC Routers)

### Router Structure

```
server/
├── routers.ts                  # Root router — assembles all sub-routers
└── routers/
    ├── organizations.ts        # Org CRUD, member management
    ├── inventory.ts            # Items CRUD, stock levels, movements
    ├── assets.ts               # Assets CRUD, assignment, lifecycle
    ├── warehouses.ts           # Location management
    ├── suppliers.ts            # Supplier management
    ├── customers.ts            # Customer management
    ├── orders.ts               # Purchase & Sales orders
    ├── notifications.ts        # Notification management
    ├── auditLogs.ts            # Audit log querying
    ├── settings.ts             # Org settings, categories
    └── dashboard.ts            # Analytics & KPI aggregations
```

### Procedure Types

- **`publicProcedure`**: No authentication required (auth.me, auth.logout)
- **`protectedProcedure`**: Requires valid JWT session (all feature procedures)

### Business Logic Examples

**Stock Movement (Inventory)**
```typescript
// When a stock movement is created:
// 1. Validate sufficient stock for outbound movements
// 2. Create the movement record
// 3. Update the stock_levels table
// 4. Create an audit log entry
// 5. Check if stock fell below reorder point → create notification
```

**Purchase Order Receiving**
```typescript
// When a PO status changes to "received":
// 1. Update PO status
// 2. For each line item, create a stock_movement (type: "in")
// 3. Update stock_levels for each item/warehouse
// 4. Create audit log
```

**Asset Lifecycle**
```typescript
// Asset statuses: active → maintenance → retired
// Assignment: assign to user → track in asset_assignments
// Return: set returnedAt, update asset status
```

---

## 6. Frontend Architecture

### Page Structure

```
client/src/
├── App.tsx                     # Route definitions
├── index.css                   # Global theme (CSS variables)
├── contexts/
│   ├── OrgContext.tsx          # Current org state, org switching
│   └── ThemeContext.tsx        # Light/dark theme
├── components/
│   ├── DashboardLayout.tsx     # Sidebar + header shell
│   └── ui/                     # shadcn/ui components
└── pages/
    ├── Home.tsx                # Landing page (public)
    ├── Dashboard.tsx           # KPIs + charts
    ├── Inventory.tsx           # Inventory management
    ├── Assets.tsx              # Asset tracking
    ├── Warehouses.tsx          # Location management
    ├── PurchaseOrders.tsx      # PO management
    ├── SalesOrders.tsx         # SO management
    ├── Suppliers.tsx           # Supplier management
    ├── Customers.tsx           # Customer management
    ├── Notifications.tsx       # Notification center
    ├── AuditLogs.tsx           # Activity history
    ├── Analytics.tsx           # Advanced analytics
    ├── Settings.tsx            # Org settings
    └── Organizations.tsx       # Org & team management
```

### State Management Pattern

- **Server state**: Managed entirely by TanStack Query via tRPC hooks
- **UI state**: Local `useState` within components
- **Global state**: React Context for auth (`useAuth`) and org (`useOrgContext`)
- **Optimistic updates**: Used for list mutations (add/edit/delete) for instant feedback

### Authentication Flow

```
1. User visits app → useAuth() checks session via trpc.auth.me
2. If not authenticated → redirect to Manus OAuth portal
3. OAuth completes → /api/oauth/callback sets JWT cookie
4. Subsequent requests include cookie → ctx.user populated in tRPC context
5. User selects/creates organization → stored in localStorage + OrgContext
6. All feature queries include organizationId → tenant isolation enforced
```

---

## 7. Key Design Decisions

### Decision 1: tRPC over REST

**Choice**: tRPC with end-to-end type safety

**Rationale**: Eliminates the need for API documentation, manual type synchronization between frontend and backend, and reduces runtime errors. The TypeScript types flow directly from Drizzle schema → db helpers → tRPC procedures → React components.

### Decision 2: Shared Schema Multi-Tenancy

**Choice**: Single database with `organizationId` discriminator

**Rationale**: Simpler to operate and scale initially. Every query is automatically scoped. Can be migrated to schema-per-tenant or database-per-tenant if a specific customer requires stronger isolation.

### Decision 3: Role Checks at Procedure Level

**Choice**: `requireOrgMember()` called at the start of every protected procedure

**Rationale**: Defense in depth. Even if the frontend sends a request with a wrong `organizationId`, the server verifies membership before any data access. This prevents cross-tenant data leakage.

### Decision 4: Drizzle ORM over Prisma

**Choice**: Drizzle ORM (required by the template)

**Rationale**: Drizzle provides type-safe SQL with zero runtime overhead, excellent TypeScript inference, and is compatible with the MySQL/TiDB stack used in the Manus platform.

### Decision 5: Audit Logging Strategy

**Choice**: Append-only `audit_logs` table, written on every mutation

**Rationale**: Provides a complete, immutable history of all changes. The `createAuditLog()` helper is called at the end of every mutation procedure, capturing: who, what, when, which organization, and what changed.

### Decision 6: Stock Level Architecture

**Choice**: Separate `stock_levels` table (per item per warehouse) + `stock_movements` history

**Rationale**: The `stock_levels` table provides fast current-state queries. The `stock_movements` table provides the complete audit trail. Every movement updates the level atomically, preventing race conditions.

---

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| **Cross-tenant access** | `organizationId` verified against `org_members` on every request |
| **Unauthorized mutations** | Role checks (`requireOrgMember`) with minimum role enforcement |
| **Session security** | JWT stored in HttpOnly, Secure, SameSite=None cookie |
| **SQL injection** | Drizzle ORM uses parameterized queries exclusively |
| **IDOR** | All entity lookups include `organizationId` in WHERE clause |
| **Privilege escalation** | Role hierarchy enforced server-side; owner role cannot be self-assigned |

---

## 9. Scalability Considerations

| Concern | Current Approach | Scale Path |
|---|---|---|
| **Database** | Single MySQL instance | Read replicas, then sharding by `organizationId` |
| **API** | Single Express process | Horizontal scaling behind load balancer |
| **File storage** | S3 (already distributed) | CDN for public assets |
| **Notifications** | DB polling | WebSockets or SSE for real-time push |
| **Search** | SQL LIKE queries | Elasticsearch for full-text search at scale |

---

## 10. Module Summary

| Module | Backend Router | Frontend Page | Tables Used |
|---|---|---|---|
| Authentication | `auth` | Home (login) | `users` |
| Organizations | `organizations` | Organizations | `organizations`, `org_members` |
| Inventory | `inventory` | Inventory | `inventory_items`, `stock_levels`, `stock_movements` |
| Assets | `assets` | Assets | `assets`, `asset_assignments` |
| Warehouses | `warehouses` | Warehouses | `warehouses` |
| Purchase Orders | `orders` | PurchaseOrders | `purchase_orders`, `purchase_order_items` |
| Sales Orders | `orders` | SalesOrders | `sales_orders`, `sales_order_items` |
| Suppliers | `suppliers` | Suppliers | `suppliers` |
| Customers | `customers` | Customers | `customers` |
| Notifications | `notifications` | Notifications | `notifications` |
| Audit Logs | `auditLogs` | AuditLogs | `audit_logs` |
| Analytics | `dashboard` | Analytics, Dashboard | Multiple (aggregations) |
| Settings | `settings` | Settings | `org_settings`, `categories` |
| File Uploads | *(backend ready)* | *(UI pending)* | `file_uploads` |
