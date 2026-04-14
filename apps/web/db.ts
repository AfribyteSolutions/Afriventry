import { and, asc, desc, eq, gt, gte, ilike, isNull, like, lt, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  assetAssignments,
  assets,
  auditLogs,
  categories,
  customers,
  fileUploads,
  inventoryItems,
  notifications,
  orgMembers,
  orgSettings,
  organizations,
  permissions,
  purchaseOrderItems,
  purchaseOrders,
  rolePermissions,
  salesOrderItems,
  salesOrders,
  stockLevels,
  stockMovements,
  suppliers,
  users,
  warehouses,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USER HELPERS ────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── ORGANIZATION HELPERS ────────────────────────────────────────────────────

export async function createOrganization(data: {
  name: string; slug: string; description?: string; industry?: string; timezone?: string; currency?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(organizations).values({ ...data, isActive: true });
  const orgId = (result as any).insertId as number;
  // Create default settings
  await db.insert(orgSettings).values({ organizationId: orgId });
  return orgId;
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(and(eq(organizations.id, id), isNull(organizations.deletedAt))).limit(1);
  return result[0];
}

export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt))).limit(1);
  return result[0];
}

export async function getUserOrganizations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ org: organizations, member: orgMembers })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.isActive, true), isNull(organizations.deletedAt)));
}

export async function addOrgMember(data: { organizationId: number; userId: number; role: "owner" | "admin" | "manager" | "staff" | "viewer"; invitedBy?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orgMembers).values({ ...data, isActive: true });
}

export async function getOrgMember(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orgMembers).where(and(eq(orgMembers.organizationId, organizationId), eq(orgMembers.userId, userId))).limit(1);
  return result[0];
}

export async function getOrgMembers(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ member: orgMembers, user: users })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(and(eq(orgMembers.organizationId, organizationId), eq(orgMembers.isActive, true)));
}

// ─── PERMISSIONS HELPERS ─────────────────────────────────────────────────────

export async function seedPermissions() {
  const db = await getDb();
  if (!db) return;
  const modules = ["inventory", "assets", "orders", "suppliers", "customers", "warehouses", "reports", "settings", "users", "audit"];
  const actions = ["read", "create", "update", "delete"];
  const perms = modules.flatMap(m => actions.map(a => ({ name: `${m}:${a}`, module: m, action: a, description: `${a} ${m}` })));
  for (const perm of perms) {
    await db.insert(permissions).values(perm).onDuplicateKeyUpdate({ set: { description: perm.description } });
  }
}

export async function getPermissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(permissions);
}

export async function getRolePermissions(organizationId: number, role: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ permission: permissions })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(eq(rolePermissions.organizationId, organizationId), eq(rolePermissions.role, role as any)));
}

// ─── CATEGORY HELPERS ────────────────────────────────────────────────────────

export async function getCategories(organizationId: number, type?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(categories.organizationId, organizationId), isNull(categories.deletedAt)];
  if (type) conditions.push(or(eq(categories.type, type as any), eq(categories.type, "both"))!);
  return db.select().from(categories).where(and(...conditions)).orderBy(asc(categories.name));
}

export async function createCategory(data: { organizationId: number; name: string; slug: string; description?: string; type?: "inventory" | "asset" | "both"; color?: string; icon?: string; parentId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(categories).values(data);
  return (result as any).insertId as number;
}

// ─── WAREHOUSE HELPERS ───────────────────────────────────────────────────────

export async function getWarehouses(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(warehouses).where(and(eq(warehouses.organizationId, organizationId), isNull(warehouses.deletedAt))).orderBy(asc(warehouses.name));
}

export async function getWarehouseById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(warehouses).where(and(eq(warehouses.id, id), eq(warehouses.organizationId, organizationId), isNull(warehouses.deletedAt))).limit(1);
  return result[0];
}

export async function createWarehouse(data: { organizationId: number; name: string; code: string; description?: string; address?: string; city?: string; country?: string; postalCode?: string; managerId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(warehouses).values({ ...data, isActive: true });
  return (result as any).insertId as number;
}

export async function updateWarehouse(id: number, organizationId: number, data: Partial<typeof warehouses.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(warehouses).set(data).where(and(eq(warehouses.id, id), eq(warehouses.organizationId, organizationId)));
}

export async function deleteWarehouse(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(warehouses).set({ deletedAt: new Date() }).where(and(eq(warehouses.id, id), eq(warehouses.organizationId, organizationId)));
}

// ─── INVENTORY HELPERS ───────────────────────────────────────────────────────

export async function getInventoryItems(organizationId: number, opts?: { search?: string; categoryId?: number; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { search, categoryId, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(inventoryItems.organizationId, organizationId), isNull(inventoryItems.deletedAt), eq(inventoryItems.isActive, true)];
  if (search) conditions.push(or(like(inventoryItems.name, `%${search}%`), like(inventoryItems.sku, `%${search}%`))!);
  if (categoryId) conditions.push(eq(inventoryItems.categoryId, categoryId));
  const offset = (page - 1) * limit;
  const items = await db
    .select({ item: inventoryItems, category: categories })
    .from(inventoryItems)
    .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(asc(inventoryItems.name))
    .limit(limit)
    .offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(inventoryItems).where(and(...conditions));
  return { items, total: Number(countResult?.count || 0) };
}

export async function getInventoryItemById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ item: inventoryItems, category: categories })
    .from(inventoryItems)
    .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organizationId, organizationId), isNull(inventoryItems.deletedAt)))
    .limit(1);
  return result[0];
}

export async function createInventoryItem(data: typeof inventoryItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(inventoryItems).values(data);
  return (result as any).insertId as number;
}

export async function updateInventoryItem(id: number, organizationId: number, data: Partial<typeof inventoryItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(inventoryItems).set(data).where(and(eq(inventoryItems.id, id), eq(inventoryItems.organizationId, organizationId)));
}

export async function deleteInventoryItem(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(inventoryItems).set({ deletedAt: new Date(), isActive: false }).where(and(eq(inventoryItems.id, id), eq(inventoryItems.organizationId, organizationId)));
}

// ─── STOCK LEVEL HELPERS ─────────────────────────────────────────────────────

export async function getStockLevels(organizationId: number, itemId?: number, warehouseId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(stockLevels.organizationId, organizationId)];
  if (itemId) conditions.push(eq(stockLevels.itemId, itemId));
  if (warehouseId) conditions.push(eq(stockLevels.warehouseId, warehouseId));
  return db
    .select({ level: stockLevels, item: inventoryItems, warehouse: warehouses })
    .from(stockLevels)
    .innerJoin(inventoryItems, eq(stockLevels.itemId, inventoryItems.id))
    .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
    .where(and(...conditions));
}

export async function getTotalStock(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      itemId: stockLevels.itemId,
      totalQty: sql<number>`SUM(${stockLevels.quantity})`,
      reservedQty: sql<number>`SUM(${stockLevels.reservedQty})`,
    })
    .from(stockLevels)
    .where(eq(stockLevels.organizationId, organizationId))
    .groupBy(stockLevels.itemId);
}

export async function getLowStockItems(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const totals = await db
    .select({
      itemId: stockLevels.itemId,
      totalQty: sql<number>`SUM(${stockLevels.quantity})`,
    })
    .from(stockLevels)
    .where(eq(stockLevels.organizationId, organizationId))
    .groupBy(stockLevels.itemId);

  const lowItems = [];
  for (const t of totals) {
    const item = await db.select().from(inventoryItems).where(and(eq(inventoryItems.id, t.itemId), isNull(inventoryItems.deletedAt))).limit(1);
    if (item[0] && item[0].reorderPoint !== null && Number(t.totalQty) <= (item[0].reorderPoint || 0)) {
      lowItems.push({ ...item[0], currentStock: Number(t.totalQty) });
    }
  }
  return lowItems;
}

export async function upsertStockLevel(organizationId: number, itemId: number, warehouseId: number, quantityDelta: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(stockLevels).where(and(eq(stockLevels.itemId, itemId), eq(stockLevels.warehouseId, warehouseId))).limit(1);
  if (existing.length > 0) {
    const newQty = Math.max(0, (existing[0].quantity || 0) + quantityDelta);
    await db.update(stockLevels).set({ quantity: newQty }).where(eq(stockLevels.id, existing[0].id));
  } else {
    const qty = Math.max(0, quantityDelta);
    await db.insert(stockLevels).values({ organizationId, itemId, warehouseId, quantity: qty, reservedQty: 0 });
  }
}

export async function createStockMovement(data: typeof stockMovements.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(stockMovements).values(data);
  return (result as any).insertId as number;
}

export async function getStockMovements(organizationId: number, opts?: { itemId?: number; warehouseId?: number; type?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { movements: [], total: 0 };
  const { itemId, warehouseId, type, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(stockMovements.organizationId, organizationId)];
  if (itemId) conditions.push(eq(stockMovements.itemId, itemId));
  if (warehouseId) conditions.push(eq(stockMovements.warehouseId, warehouseId));
  if (type) conditions.push(eq(stockMovements.type, type as any));
  const offset = (page - 1) * limit;
  const movements = await db
    .select({ movement: stockMovements, item: inventoryItems, warehouse: warehouses, user: users })
    .from(stockMovements)
    .innerJoin(inventoryItems, eq(stockMovements.itemId, inventoryItems.id))
    .innerJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockMovements.performedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit)
    .offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(stockMovements).where(and(...conditions));
  return { movements, total: Number(countResult?.count || 0) };
}

// ─── ASSET HELPERS ───────────────────────────────────────────────────────────

export async function getAssets(organizationId: number, opts?: { search?: string; status?: string; categoryId?: number; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { assets: [], total: 0 };
  const { search, status, categoryId, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(assets.organizationId, organizationId), isNull(assets.deletedAt)];
  if (search) conditions.push(or(like(assets.name, `%${search}%`), like(assets.assetTag, `%${search}%`))!);
  if (status) conditions.push(eq(assets.status, status as any));
  if (categoryId) conditions.push(eq(assets.categoryId, categoryId));
  const offset = (page - 1) * limit;
  const assetList = await db
    .select({ asset: assets, category: categories })
    .from(assets)
    .leftJoin(categories, eq(assets.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(asc(assets.name))
    .limit(limit)
    .offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(assets).where(and(...conditions));
  return { assets: assetList, total: Number(countResult?.count || 0) };
}

export async function getAssetById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ asset: assets, category: categories })
    .from(assets)
    .leftJoin(categories, eq(assets.categoryId, categories.id))
    .where(and(eq(assets.id, id), eq(assets.organizationId, organizationId), isNull(assets.deletedAt)))
    .limit(1);
  return result[0];
}

export async function createAsset(data: typeof assets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(assets).values(data);
  return (result as any).insertId as number;
}

export async function updateAsset(id: number, organizationId: number, data: Partial<typeof assets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(assets).set(data).where(and(eq(assets.id, id), eq(assets.organizationId, organizationId)));
}

export async function deleteAsset(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(assets).set({ deletedAt: new Date() }).where(and(eq(assets.id, id), eq(assets.organizationId, organizationId)));
}

export async function getAssetAssignments(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ assignment: assetAssignments, user: users })
    .from(assetAssignments)
    .leftJoin(users, eq(assetAssignments.userId, users.id))
    .where(eq(assetAssignments.assetId, assetId))
    .orderBy(desc(assetAssignments.assignedAt));
}

export async function createAssetAssignment(data: typeof assetAssignments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(assetAssignments).values(data);
  return (result as any).insertId as number;
}

// ─── SUPPLIER HELPERS ────────────────────────────────────────────────────────

export async function getSuppliers(organizationId: number, opts?: { search?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { suppliers: [], total: 0 };
  const { search, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(suppliers.organizationId, organizationId), isNull(suppliers.deletedAt), eq(suppliers.isActive, true)];
  if (search) conditions.push(or(like(suppliers.name, `%${search}%`), like(suppliers.email, `%${search}%`))!);
  const offset = (page - 1) * limit;
  const list = await db.select().from(suppliers).where(and(...conditions)).orderBy(asc(suppliers.name)).limit(limit).offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(suppliers).where(and(...conditions));
  return { suppliers: list, total: Number(countResult?.count || 0) };
}

export async function createSupplier(data: typeof suppliers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(suppliers).values(data);
  return (result as any).insertId as number;
}

export async function updateSupplier(id: number, organizationId: number, data: Partial<typeof suppliers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(suppliers).set(data).where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId)));
}

export async function deleteSupplier(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(suppliers).set({ deletedAt: new Date(), isActive: false }).where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId)));
}

// ─── CUSTOMER HELPERS ────────────────────────────────────────────────────────

export async function getCustomers(organizationId: number, opts?: { search?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { customers: [], total: 0 };
  const { search, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(customers.organizationId, organizationId), isNull(customers.deletedAt), eq(customers.isActive, true)];
  if (search) conditions.push(or(like(customers.name, `%${search}%`), like(customers.email, `%${search}%`))!);
  const offset = (page - 1) * limit;
  const list = await db.select().from(customers).where(and(...conditions)).orderBy(asc(customers.name)).limit(limit).offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(customers).where(and(...conditions));
  return { customers: list, total: Number(countResult?.count || 0) };
}

export async function createCustomer(data: typeof customers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(customers).values(data);
  return (result as any).insertId as number;
}

export async function updateCustomer(id: number, organizationId: number, data: Partial<typeof customers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(customers).set(data).where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)));
}

export async function deleteCustomer(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(customers).set({ deletedAt: new Date(), isActive: false }).where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)));
}

// ─── PURCHASE ORDER HELPERS ──────────────────────────────────────────────────

export async function getPurchaseOrders(organizationId: number, opts?: { status?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };
  const { status, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(purchaseOrders.organizationId, organizationId), isNull(purchaseOrders.deletedAt)];
  if (status) conditions.push(eq(purchaseOrders.status, status as any));
  const offset = (page - 1) * limit;
  const orders = await db
    .select({ order: purchaseOrders, supplier: suppliers })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(...conditions))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(limit)
    .offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(and(...conditions));
  return { orders, total: Number(countResult?.count || 0) };
}

export async function getPurchaseOrderById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ order: purchaseOrders, supplier: suppliers })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId), isNull(purchaseOrders.deletedAt)))
    .limit(1);
  if (!result[0]) return undefined;
  const items = await db
    .select({ item: purchaseOrderItems, inventoryItem: inventoryItems })
    .from(purchaseOrderItems)
    .innerJoin(inventoryItems, eq(purchaseOrderItems.itemId, inventoryItems.id))
    .where(eq(purchaseOrderItems.purchaseOrderId, id));
  return { ...result[0], items };
}

export async function createPurchaseOrder(data: typeof purchaseOrders.$inferInsert, items: { itemId: number; quantity: number; unitPrice: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(purchaseOrders).values(data);
  const orderId = (result as any).insertId as number;
  for (const item of items) {
    await db.insert(purchaseOrderItems).values({
      purchaseOrderId: orderId,
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      totalPrice: String(item.quantity * item.unitPrice),
    });
  }
  return orderId;
}

export async function updatePurchaseOrderStatus(id: number, organizationId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { status };
  if (status === "received") updateData.receivedDate = new Date();
  await db.update(purchaseOrders).set(updateData).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId)));
}

// ─── SALES ORDER HELPERS ─────────────────────────────────────────────────────

export async function getSalesOrders(organizationId: number, opts?: { status?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };
  const { status, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(salesOrders.organizationId, organizationId), isNull(salesOrders.deletedAt)];
  if (status) conditions.push(eq(salesOrders.status, status as any));
  const offset = (page - 1) * limit;
  const orders = await db
    .select({ order: salesOrders, customer: customers })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(salesOrders.createdAt))
    .limit(limit)
    .offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(and(...conditions));
  return { orders, total: Number(countResult?.count || 0) };
}

export async function getSalesOrderById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ order: salesOrders, customer: customers })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(and(eq(salesOrders.id, id), eq(salesOrders.organizationId, organizationId), isNull(salesOrders.deletedAt)))
    .limit(1);
  if (!result[0]) return undefined;
  const items = await db
    .select({ item: salesOrderItems, inventoryItem: inventoryItems })
    .from(salesOrderItems)
    .innerJoin(inventoryItems, eq(salesOrderItems.itemId, inventoryItems.id))
    .where(eq(salesOrderItems.salesOrderId, id));
  return { ...result[0], items };
}

export async function createSalesOrder(data: typeof salesOrders.$inferInsert, items: { itemId: number; quantity: number; unitPrice: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(salesOrders).values(data);
  const orderId = (result as any).insertId as number;
  for (const item of items) {
    await db.insert(salesOrderItems).values({
      salesOrderId: orderId,
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      totalPrice: String(item.quantity * item.unitPrice),
    });
  }
  return orderId;
}

export async function updateSalesOrderStatus(id: number, organizationId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { status };
  if (status === "shipped") updateData.shippedDate = new Date();
  await db.update(salesOrders).set(updateData).where(and(eq(salesOrders.id, id), eq(salesOrders.organizationId, organizationId)));
}

// ─── NOTIFICATION HELPERS ────────────────────────────────────────────────────

export async function getNotifications(organizationId: number, userId: number, opts?: { unreadOnly?: boolean; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { notifications: [], total: 0 };
  const { unreadOnly, page = 1, limit = 20 } = opts || {};
  const conditions = [eq(notifications.organizationId, organizationId), or(eq(notifications.userId, userId), isNull(notifications.userId))!];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  const offset = (page - 1) * limit;
  const list = await db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(...conditions));
  return { notifications: list, total: Number(countResult?.count || 0) };
}

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function getUnreadNotificationCount(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.organizationId, organizationId), or(eq(notifications.userId, userId), isNull(notifications.userId))!, eq(notifications.isRead, false)));
  return Number(result?.count || 0);
}

// ─── AUDIT LOG HELPERS ───────────────────────────────────────────────────────

export async function createAuditLog(data: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (e) {
    console.warn("[AuditLog] Failed to write:", e);
  }
}

export async function getAuditLogs(organizationId: number, opts?: { module?: string; userId?: number; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };
  const { module, userId, page = 1, limit = 50 } = opts || {};
  const conditions = [eq(auditLogs.organizationId, organizationId)];
  if (module) conditions.push(eq(auditLogs.module, module));
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  const offset = (page - 1) * limit;
  const logs = await db
    .select({ log: auditLogs, user: users })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(...conditions));
  return { logs, total: Number(countResult?.count || 0) };
}

// ─── SETTINGS HELPERS ────────────────────────────────────────────────────────

export async function getOrgSettings(organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orgSettings).where(eq(orgSettings.organizationId, organizationId)).limit(1);
  return result[0];
}

export async function updateOrgSettings(organizationId: number, data: Partial<typeof orgSettings.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orgSettings).set(data).where(eq(orgSettings.organizationId, organizationId));
}

export async function updateOrganization(id: number, data: Partial<typeof organizations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(organizations).set(data).where(eq(organizations.id, id));
}

// ─── DASHBOARD ANALYTICS HELPERS ─────────────────────────────────────────────

export async function getDashboardKPIs(organizationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [totalItems] = await db.select({ count: sql<number>`count(*)` }).from(inventoryItems).where(and(eq(inventoryItems.organizationId, organizationId), isNull(inventoryItems.deletedAt), eq(inventoryItems.isActive, true)));
  const [totalAssets] = await db.select({ count: sql<number>`count(*)` }).from(assets).where(and(eq(assets.organizationId, organizationId), isNull(assets.deletedAt)));
  const [activeAssets] = await db.select({ count: sql<number>`count(*)` }).from(assets).where(and(eq(assets.organizationId, organizationId), eq(assets.status, "active"), isNull(assets.deletedAt)));
  const [openPOs] = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(and(eq(purchaseOrders.organizationId, organizationId), or(eq(purchaseOrders.status, "pending"), eq(purchaseOrders.status, "approved"), eq(purchaseOrders.status, "ordered"))!, isNull(purchaseOrders.deletedAt)));
  const [openSOs] = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(and(eq(salesOrders.organizationId, organizationId), or(eq(salesOrders.status, "confirmed"), eq(salesOrders.status, "processing"))!, isNull(salesOrders.deletedAt)));

  // Total inventory value
  const stockValue = await db
    .select({
      totalValue: sql<number>`SUM(${stockLevels.quantity} * COALESCE(${inventoryItems.costPrice}, 0))`,
    })
    .from(stockLevels)
    .innerJoin(inventoryItems, eq(stockLevels.itemId, inventoryItems.id))
    .where(eq(stockLevels.organizationId, organizationId));

  // Low stock count
  const lowStockItems = await getLowStockItems(organizationId);

  return {
    totalInventoryItems: Number(totalItems?.count || 0),
    totalAssets: Number(totalAssets?.count || 0),
    activeAssets: Number(activeAssets?.count || 0),
    openPurchaseOrders: Number(openPOs?.count || 0),
    openSalesOrders: Number(openSOs?.count || 0),
    inventoryValue: Number(stockValue[0]?.totalValue || 0),
    lowStockCount: lowStockItems.length,
  };
}

export async function getInventoryTrend(organizationId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db
    .select({
      date: sql<string>`DATE(${stockMovements.createdAt})`,
      type: stockMovements.type,
      total: sql<number>`SUM(${stockMovements.quantity})`,
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.organizationId, organizationId), gte(stockMovements.createdAt, since)))
    .groupBy(sql`DATE(${stockMovements.createdAt})`, stockMovements.type)
    .orderBy(sql`DATE(${stockMovements.createdAt})`);
}

export async function getAssetStatusDistribution(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      status: assets.status,
      count: sql<number>`count(*)`,
    })
    .from(assets)
    .where(and(eq(assets.organizationId, organizationId), isNull(assets.deletedAt)))
    .groupBy(assets.status);
}

export async function getRecentActivity(organizationId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ log: auditLogs, user: users })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.organizationId, organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ─── FILE UPLOAD HELPERS ─────────────────────────────────────────────────────

export async function createFileUpload(data: typeof fileUploads.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(fileUploads).values(data);
  return (result as any).insertId as number;
}

export async function getFilesByReference(organizationId: number, referenceType: string, referenceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fileUploads).where(and(eq(fileUploads.organizationId, organizationId), eq(fileUploads.referenceType, referenceType), eq(fileUploads.referenceId, referenceId)));
}
