import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────
// USERS (core auth table, extended by Manus OAuth)
// ─────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// ORGANIZATIONS (tenants)
// ─────────────────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  website: varchar("website", { length: 500 }),
  industry: varchar("industry", { length: 100 }),
  timezone: varchar("timezone", { length: 100 }).default("UTC"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─────────────────────────────────────────────
// ORG MEMBERS (user ↔ org with role)
// ─────────────────────────────────────────────
export const orgMembers = mysqlTable("org_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  userId: int("userId").notNull().references(() => users.id),
  role: mysqlEnum("role", ["owner", "admin", "manager", "staff", "viewer"]).default("staff").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  invitedBy: int("invitedBy").references(() => users.id),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  orgUserIdx: uniqueIndex("org_user_idx").on(t.organizationId, t.userId),
  orgIdx: index("org_idx").on(t.organizationId),
  userIdx: index("user_idx").on(t.userId),
}));

export type OrgMember = typeof orgMembers.$inferSelect;
export type InsertOrgMember = typeof orgMembers.$inferInsert;

// ─────────────────────────────────────────────
// PERMISSIONS (fine-grained per module/action)
// ─────────────────────────────────────────────
export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g. "inventory:read"
  module: varchar("module", { length: 50 }).notNull(),       // e.g. "inventory"
  action: varchar("action", { length: 50 }).notNull(),       // e.g. "read"
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Permission = typeof permissions.$inferSelect;

// ─────────────────────────────────────────────
// ROLE PERMISSIONS (role → permissions mapping per org)
// ─────────────────────────────────────────────
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  role: mysqlEnum("role", ["owner", "admin", "manager", "staff", "viewer"]).notNull(),
  permissionId: int("permissionId").notNull().references(() => permissions.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  rolePermIdx: uniqueIndex("role_perm_idx").on(t.organizationId, t.role, t.permissionId),
  orgIdx: index("rp_org_idx").on(t.organizationId),
}));

export type RolePermission = typeof rolePermissions.$inferSelect;

// ─────────────────────────────────────────────
// CATEGORIES (multi-tenant, hierarchical)
// ─────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  parentId: int("parentId"),
  type: mysqlEnum("type", ["inventory", "asset", "both"]).default("both").notNull(),
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("cat_org_idx").on(t.organizationId),
  orgSlugIdx: uniqueIndex("cat_org_slug_idx").on(t.organizationId, t.slug),
}));

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─────────────────────────────────────────────
// WAREHOUSES / LOCATIONS
// ─────────────────────────────────────────────
export const warehouses = mysqlTable("warehouses", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postalCode", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  managerId: int("managerId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("wh_org_idx").on(t.organizationId),
  orgCodeIdx: uniqueIndex("wh_org_code_idx").on(t.organizationId, t.code),
}));

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

// ─────────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────────
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  taxId: varchar("taxId", { length: 100 }),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("sup_org_idx").on(t.organizationId),
}));

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  taxId: varchar("taxId", { length: 100 }),
  creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).default("0"),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("cust_org_idx").on(t.organizationId),
}));

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ─────────────────────────────────────────────
// INVENTORY ITEMS
// ─────────────────────────────────────────────
export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  categoryId: int("categoryId").references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).notNull(),
  barcode: varchar("barcode", { length: 100 }),
  description: text("description"),
  unit: varchar("unit", { length: 50 }).default("pcs"),
  costPrice: decimal("costPrice", { precision: 15, scale: 2 }).default("0"),
  sellingPrice: decimal("sellingPrice", { precision: 15, scale: 2 }).default("0"),
  reorderPoint: int("reorderPoint").default(0),
  reorderQty: int("reorderQty").default(0),
  maxStock: int("maxStock"),
  imageUrl: text("imageUrl"),
  supplierId: int("supplierId").references(() => suppliers.id),
  isActive: boolean("isActive").default(true).notNull(),
  tags: json("tags").$type<string[]>(),
  customFields: json("customFields").$type<Record<string, unknown>>(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("inv_org_idx").on(t.organizationId),
  orgSkuIdx: uniqueIndex("inv_org_sku_idx").on(t.organizationId, t.sku),
  catIdx: index("inv_cat_idx").on(t.categoryId),
}));

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

// ─────────────────────────────────────────────
// STOCK LEVELS (per item per warehouse)
// ─────────────────────────────────────────────
export const stockLevels = mysqlTable("stock_levels", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  itemId: int("itemId").notNull().references(() => inventoryItems.id),
  warehouseId: int("warehouseId").notNull().references(() => warehouses.id),
  quantity: int("quantity").default(0).notNull(),
  reservedQty: int("reservedQty").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  itemWarehouseIdx: uniqueIndex("stock_item_wh_idx").on(t.itemId, t.warehouseId),
  orgIdx: index("stock_org_idx").on(t.organizationId),
}));

export type StockLevel = typeof stockLevels.$inferSelect;
export type InsertStockLevel = typeof stockLevels.$inferInsert;

// ─────────────────────────────────────────────
// STOCK MOVEMENTS (audit trail for stock changes)
// ─────────────────────────────────────────────
export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  itemId: int("itemId").notNull().references(() => inventoryItems.id),
  warehouseId: int("warehouseId").notNull().references(() => warehouses.id),
  toWarehouseId: int("toWarehouseId").references(() => warehouses.id), // for transfers
  type: mysqlEnum("type", ["in", "out", "transfer", "adjustment", "return"]).notNull(),
  quantity: int("quantity").notNull(),
  unitCost: decimal("unitCost", { precision: 15, scale: 2 }),
  referenceType: varchar("referenceType", { length: 50 }), // "purchase_order", "sales_order", "manual"
  referenceId: int("referenceId"),
  notes: text("notes"),
  performedBy: int("performedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  orgIdx: index("sm_org_idx").on(t.organizationId),
  itemIdx: index("sm_item_idx").on(t.itemId),
  warehouseIdx: index("sm_wh_idx").on(t.warehouseId),
  createdAtIdx: index("sm_created_idx").on(t.createdAt),
}));

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

// ─────────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────────
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  categoryId: int("categoryId").references(() => categories.id),
  warehouseId: int("warehouseId").references(() => warehouses.id),
  name: varchar("name", { length: 255 }).notNull(),
  assetTag: varchar("assetTag", { length: 100 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 100 }),
  model: varchar("model", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  description: text("description"),
  status: mysqlEnum("status", ["active", "maintenance", "retired", "disposed", "lost"]).default("active").notNull(),
  condition: mysqlEnum("condition", ["new", "good", "fair", "poor"]).default("good").notNull(),
  purchaseDate: timestamp("purchaseDate"),
  purchasePrice: decimal("purchasePrice", { precision: 15, scale: 2 }),
  warrantyExpiry: timestamp("warrantyExpiry"),
  depreciationRate: decimal("depreciationRate", { precision: 5, scale: 2 }),
  currentValue: decimal("currentValue", { precision: 15, scale: 2 }),
  supplierId: int("supplierId").references(() => suppliers.id),
  imageUrl: text("imageUrl"),
  qrCode: text("qrCode"),
  notes: text("notes"),
  customFields: json("customFields").$type<Record<string, unknown>>(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("asset_org_idx").on(t.organizationId),
  orgTagIdx: uniqueIndex("asset_org_tag_idx").on(t.organizationId, t.assetTag),
  statusIdx: index("asset_status_idx").on(t.status),
}));

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ─────────────────────────────────────────────
// ASSET ASSIGNMENTS (who has which asset)
// ─────────────────────────────────────────────
export const assetAssignments = mysqlTable("asset_assignments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  assetId: int("assetId").notNull().references(() => assets.id),
  userId: int("userId").references(() => users.id),
  assignedTo: varchar("assignedTo", { length: 255 }), // free-text if not a user
  location: varchar("location", { length: 255 }),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  returnedAt: timestamp("returnedAt"),
  notes: text("notes"),
  assignedBy: int("assignedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  assetIdx: index("aa_asset_idx").on(t.assetId),
  orgIdx: index("aa_org_idx").on(t.organizationId),
}));

export type AssetAssignment = typeof assetAssignments.$inferSelect;
export type InsertAssetAssignment = typeof assetAssignments.$inferInsert;

// ─────────────────────────────────────────────
// PURCHASE ORDERS
// ─────────────────────────────────────────────
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  orderNumber: varchar("orderNumber", { length: 100 }).notNull(),
  supplierId: int("supplierId").notNull().references(() => suppliers.id),
  warehouseId: int("warehouseId").references(() => warehouses.id),
  status: mysqlEnum("status", ["draft", "pending", "approved", "ordered", "partial", "received", "cancelled"]).default("draft").notNull(),
  orderDate: timestamp("orderDate").defaultNow().notNull(),
  expectedDate: timestamp("expectedDate"),
  receivedDate: timestamp("receivedDate"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  approvedBy: int("approvedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("po_org_idx").on(t.organizationId),
  orgNumIdx: uniqueIndex("po_org_num_idx").on(t.organizationId, t.orderNumber),
  statusIdx: index("po_status_idx").on(t.status),
}));

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

// ─────────────────────────────────────────────
// PURCHASE ORDER ITEMS
// ─────────────────────────────────────────────
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull().references(() => purchaseOrders.id),
  itemId: int("itemId").notNull().references(() => inventoryItems.id),
  quantity: int("quantity").notNull(),
  receivedQty: int("receivedQty").default(0).notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  poIdx: index("poi_po_idx").on(t.purchaseOrderId),
  itemIdx: index("poi_item_idx").on(t.itemId),
}));

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

// ─────────────────────────────────────────────
// SALES ORDERS
// ─────────────────────────────────────────────
export const salesOrders = mysqlTable("sales_orders", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  orderNumber: varchar("orderNumber", { length: 100 }).notNull(),
  customerId: int("customerId").references(() => customers.id),
  warehouseId: int("warehouseId").references(() => warehouses.id),
  status: mysqlEnum("status", ["draft", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]).default("draft").notNull(),
  orderDate: timestamp("orderDate").defaultNow().notNull(),
  requiredDate: timestamp("requiredDate"),
  shippedDate: timestamp("shippedDate"),
  shippingAddress: text("shippingAddress"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (t) => ({
  orgIdx: index("so_org_idx").on(t.organizationId),
  orgNumIdx: uniqueIndex("so_org_num_idx").on(t.organizationId, t.orderNumber),
  statusIdx: index("so_status_idx").on(t.status),
}));

export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = typeof salesOrders.$inferInsert;

// ─────────────────────────────────────────────
// SALES ORDER ITEMS
// ─────────────────────────────────────────────
export const salesOrderItems = mysqlTable("sales_order_items", {
  id: int("id").autoincrement().primaryKey(),
  salesOrderId: int("salesOrderId").notNull().references(() => salesOrders.id),
  itemId: int("itemId").notNull().references(() => inventoryItems.id),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  soIdx: index("soi_so_idx").on(t.salesOrderId),
  itemIdx: index("soi_item_idx").on(t.itemId),
}));

export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = typeof salesOrderItems.$inferInsert;

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  userId: int("userId").references(() => users.id), // null = broadcast to org
  type: varchar("type", { length: 50 }).notNull(), // "low_stock", "order_received", "asset_maintenance"
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: int("referenceId"),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  orgIdx: index("notif_org_idx").on(t.organizationId),
  userIdx: index("notif_user_idx").on(t.userId),
  readIdx: index("notif_read_idx").on(t.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // "create", "update", "delete"
  module: varchar("module", { length: 50 }).notNull(),  // "inventory", "asset", etc.
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  entityName: varchar("entityName", { length: 255 }),
  changes: json("changes").$type<Record<string, { old: unknown; new: unknown }>>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  orgIdx: index("audit_org_idx").on(t.organizationId),
  userIdx: index("audit_user_idx").on(t.userId),
  moduleIdx: index("audit_module_idx").on(t.module),
  createdAtIdx: index("audit_created_idx").on(t.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─────────────────────────────────────────────
// FILE UPLOADS
// ─────────────────────────────────────────────
export const fileUploads = mysqlTable("file_uploads", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id),
  uploadedBy: int("uploadedBy").references(() => users.id),
  filename: varchar("filename", { length: 500 }).notNull(),
  originalName: varchar("originalName", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  size: int("size").notNull(),
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: int("referenceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  orgIdx: index("file_org_idx").on(t.organizationId),
  refIdx: index("file_ref_idx").on(t.referenceType, t.referenceId),
}));

export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertFileUpload = typeof fileUploads.$inferInsert;

// ─────────────────────────────────────────────
// ORGANIZATION SETTINGS
// ─────────────────────────────────────────────
export const orgSettings = mysqlTable("org_settings", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().references(() => organizations.id).unique(),
  lowStockAlerts: boolean("lowStockAlerts").default(true).notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  autoReorder: boolean("autoReorder").default(false).notNull(),
  defaultWarehouseId: int("defaultWarehouseId").references(() => warehouses.id),
  fiscalYearStart: varchar("fiscalYearStart", { length: 10 }).default("01-01"),
  dateFormat: varchar("dateFormat", { length: 20 }).default("MM/DD/YYYY"),
  customFields: json("customFields").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrgSettings = typeof orgSettings.$inferSelect;
export type InsertOrgSettings = typeof orgSettings.$inferInsert;
