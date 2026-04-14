# Inventra - Multi-Tenant Inventory & Asset Management TODO

## Phase 1: Foundation
- [x] Create todo.md and design system
- [x] Install additional dependencies (recharts already included)
- [x] Configure global theme (dark sidebar, clean dashboard style)
- [x] Set up global CSS variables and typography

## Phase 2: Database Schema
- [x] Organizations (tenants) table
- [x] User-Organization membership table with roles
- [x] Roles and Permissions tables (RBAC)
- [x] Categories table (multi-tenant)
- [x] Warehouses / Locations table
- [x] Inventory Items table
- [x] Stock Levels per warehouse table
- [x] Stock Movements table
- [x] Assets table (with lifecycle status)
- [x] Asset Assignments table
- [x] Suppliers table
- [x] Customers table
- [x] Purchase Orders table
- [x] Purchase Order Items table
- [x] Sales Orders table
- [x] Sales Order Items table
- [x] Audit Logs table
- [x] Notifications table
- [x] File Uploads table
- [x] Organization Settings table
- [x] Run all migrations

## Phase 3: Backend - Core Routers
- [x] Organization router (CRUD, invite members)
- [x] RBAC router (roles, permissions, assign)
- [x] Inventory router (CRUD items, stock levels)
- [x] Stock movements router (in/out/transfer)
- [x] Assets router (CRUD, lifecycle management)
- [x] Asset assignments router

## Phase 4: Backend - Extended Routers
- [x] Warehouses router (CRUD)
- [x] Suppliers router (CRUD)
- [x] Customers router (CRUD)
- [x] Purchase Orders router (CRUD, status workflow)
- [x] Sales Orders router (CRUD, status workflow)
- [x] Audit Logs router (read-only, filtered)
- [x] Notifications router (list, mark read)
- [x] Settings router (tenant + system level)
- [x] Dashboard analytics router (KPIs, charts data)
- [ ] File uploads router (S3 integration - backend ready, UI pending)

## Phase 5: UI - Layout & Navigation
- [x] Customize DashboardLayout with Inventra branding
- [x] Sidebar navigation with all module links
- [x] Organization switcher in sidebar
- [x] User profile dropdown
- [x] Responsive mobile sidebar

## Phase 6: Dashboard Page
- [x] KPI cards (total assets, inventory value, low stock, open orders)
- [x] Inventory trend chart (bar chart)
- [x] Asset status distribution (pie/donut chart)
- [x] Stock movements chart (bar chart)
- [x] Recent activity feed
- [x] Low stock alerts panel
- [x] Notifications panel

## Phase 7: Inventory & Assets Pages
- [x] Inventory items list page (table with filters, search, pagination)
- [x] Add/Edit inventory item modal/form
- [x] Stock levels per warehouse view
- [x] Stock movements page (history, add movement)
- [x] Assets list page (table with filters)
- [x] Add/Edit asset modal/form
- [x] Asset assignment modal
- [x] Warehouses list page
- [x] Add/Edit warehouse modal/form

## Phase 8: Orders, Suppliers, Customers, Settings Pages
- [x] Suppliers list page (table, CRUD)
- [x] Customers list page (table, CRUD)
- [x] Purchase Orders list page
- [x] Purchase Order create with line items
- [x] Sales Orders list page
- [x] Sales Order create with line items
- [x] Audit Logs page (read-only, filterable by module)
- [x] Notifications page (list, mark read, mark all read)
- [x] Settings page (organization profile, notification preferences)
- [x] Organizations page (org switcher, team members)
- [x] Analytics page (charts: trend, asset distribution, low stock)

## Phase 9: Testing & Delivery
- [x] Write vitest tests for all routers (36 tests passing)
- [x] Fix TypeScript errors (0 errors)
- [x] Final review and bug fixes
- [x] Save checkpoint
- [x] Deliver to user with architecture documentation

## Known Limitations / Future Enhancements (Post v1.0 Roadmap)
- [ ] Invite member by email (requires email lookup service)
- [ ] Role update / member removal UI (backend procedures to add)
- [ ] File upload UI (S3 integration ready in backend)
- [ ] PDF report generation
- [ ] Barcode/QR code scanning
- [ ] Email notification delivery (SMTP integration)
- [ ] Advanced permission system (per-module CRUD permissions)
- [ ] Asset maintenance scheduling
- [ ] Bulk import/export (CSV)

