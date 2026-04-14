/**
 * Inventra - Comprehensive Test Suite
 * Tests cover: auth, organizations, inventory, assets, orders, suppliers, customers,
 * warehouses, notifications, audit logs, settings, and dashboard routers.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getUserOrganizations: vi.fn().mockResolvedValue([]),
  getOrganizationById: vi.fn(),
  getOrganizationBySlug: vi.fn().mockResolvedValue(null),
  createOrganization: vi.fn().mockResolvedValue(1),
  updateOrganization: vi.fn(),
  addOrgMember: vi.fn(),
  getOrgMember: vi.fn().mockResolvedValue({ id: 1, organizationId: 1, userId: 1, role: "owner", isActive: true }),
  getOrgMembers: vi.fn().mockResolvedValue([]),
  getInventoryItems: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getInventoryItemById: vi.fn(),
  createInventoryItem: vi.fn().mockResolvedValue(1),
  updateInventoryItem: vi.fn(),
  deleteInventoryItem: vi.fn(),
  getStockLevels: vi.fn().mockResolvedValue([]),
  upsertStockLevel: vi.fn(),
  createStockMovement: vi.fn(),
  getStockMovements: vi.fn().mockResolvedValue({ movements: [], total: 0 }),
  getAssets: vi.fn().mockResolvedValue({ assets: [], total: 0 }),
  getAssetById: vi.fn(),
  createAsset: vi.fn().mockResolvedValue(1),
  updateAsset: vi.fn(),
  deleteAsset: vi.fn(),
  assignAsset: vi.fn(),
  getWarehouses: vi.fn().mockResolvedValue([]),
  createWarehouse: vi.fn().mockResolvedValue(1),
  updateWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
  getSuppliers: vi.fn().mockResolvedValue({ suppliers: [], total: 0 }),
  createSupplier: vi.fn().mockResolvedValue(1),
  updateSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
  getCustomers: vi.fn().mockResolvedValue({ customers: [], total: 0 }),
  createCustomer: vi.fn().mockResolvedValue(1),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  getPurchaseOrders: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
  getPurchaseOrderById: vi.fn(),
  createPurchaseOrder: vi.fn().mockResolvedValue(1),
  updatePurchaseOrderStatus: vi.fn(),
  getSalesOrders: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
  getSalesOrderById: vi.fn(),
  createSalesOrder: vi.fn().mockResolvedValue(1),
  updateSalesOrderStatus: vi.fn(),
  getNotifications: vi.fn().mockResolvedValue({ notifications: [], total: 0 }),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  createNotification: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getAuditLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  createAuditLog: vi.fn(),
  getOrgSettings: vi.fn().mockResolvedValue(null),
  updateOrgSettings: vi.fn(),
  getCategories: vi.fn().mockResolvedValue([]),
  createCategory: vi.fn().mockResolvedValue(1),
  getDashboardKPIs: vi.fn().mockResolvedValue({
    totalInventoryItems: 42,
    totalAssets: 15,
    activeAssets: 12,
    inventoryValue: 25000,
    lowStockCount: 3,
    pendingPurchaseOrders: 2,
    pendingSalesOrders: 5,
  }),
  getInventoryTrend: vi.fn().mockResolvedValue([]),
  getAssetDistribution: vi.fn().mockResolvedValue([]),
  getAssetStatusDistribution: vi.fn().mockResolvedValue([]),
  getLowStockAlerts: vi.fn().mockResolvedValue([]),
  getLowStockItems: vi.fn().mockResolvedValue([]),
  getRecentActivity: vi.fn().mockResolvedValue([]),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeGuestCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth", () => {
  it("auth.me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.email).toBe("test@example.com");
  });

  it("auth.logout clears cookie and returns success", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});

// ─── Organizations Tests ──────────────────────────────────────────────────────

describe("organizations", () => {
  it("organizations.list returns empty array for new user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.organizations.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("organizations.create creates org and returns id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.organizations.create({
      name: "Test Corp",
      slug: "test-corp",
      description: "A test organization",
    });
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(1);
  });

  it("organizations.create rejects duplicate slug", async () => {
    const { getOrganizationBySlug } = await import("./db");
    vi.mocked(getOrganizationBySlug).mockResolvedValueOnce({ id: 99 } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.organizations.create({ name: "Dup Corp", slug: "existing-slug" })
    ).rejects.toThrow();
  });

  it("organizations.getMembers requires membership", async () => {
    const { getOrgMember } = await import("./db");
    vi.mocked(getOrgMember).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.organizations.getMembers({ organizationId: 1 })).rejects.toThrow();
  });

  it("organizations.getMembers returns members list", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.organizations.getMembers({ organizationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Inventory Tests ──────────────────────────────────────────────────────────

describe("inventory", () => {
  it("inventory.list returns paginated items", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.inventory.list({ organizationId: 1 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("inventory.create creates item and returns id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.inventory.create({
      organizationId: 1,
      name: "Widget A",
      sku: "WGT-001",
      type: "product",
      unit: "pcs",
      reorderPoint: 10,
    });
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(1);
  });

  it("inventory.create rejects viewer role", async () => {
    const { getOrgMember } = await import("./db");
    vi.mocked(getOrgMember).mockResolvedValueOnce({ id: 1, organizationId: 1, userId: 1, role: "viewer", isActive: true });
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.inventory.create({ organizationId: 1, name: "X", sku: "X-001", type: "product", unit: "pcs", reorderPoint: 5 })
    ).rejects.toThrow();
  });

  it("inventory.getStockLevels returns stock for an item", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.inventory.getStockLevels({ organizationId: 1, itemId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Assets Tests ─────────────────────────────────────────────────────────────

describe("assets", () => {
  it("assets.list returns paginated assets", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.assets.list({ organizationId: 1 });
    expect(result).toHaveProperty("assets");
    expect(result).toHaveProperty("total");
  });

  it("assets.create creates asset with serial number", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.assets.create({
      organizationId: 1,
      name: "Laptop Pro",
      assetTag: "ASSET-001",
      serialNumber: "SN-12345",
      type: "hardware",
      status: "active",
    });
    expect(result).toHaveProperty("id");
  });
});

// ─── Warehouses Tests ─────────────────────────────────────────────────────────

describe("warehouses", () => {
  it("warehouses.list returns warehouse list", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.warehouses.list({ organizationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("warehouses.create creates a warehouse", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.warehouses.create({
      organizationId: 1,
      name: "Main Warehouse",
      code: "WH-001",
      type: "warehouse",
    });
    expect(result).toHaveProperty("id");
  });
});

// ─── Suppliers Tests ──────────────────────────────────────────────────────────

describe("suppliers", () => {
  it("suppliers.list returns paginated suppliers", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.suppliers.list({ organizationId: 1 });
    expect(result).toHaveProperty("suppliers");
    expect(result).toHaveProperty("total");
  });

  it("suppliers.create creates supplier", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.suppliers.create({
      organizationId: 1,
      name: "ACME Corp",
      code: "SUP-001",
    });
    expect(result).toHaveProperty("id");
  });
});

// ─── Customers Tests ──────────────────────────────────────────────────────────

describe("customers", () => {
  it("customers.list returns paginated customers", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.customers.list({ organizationId: 1 });
    expect(result).toHaveProperty("customers");
    expect(result).toHaveProperty("total");
  });

  it("customers.create creates customer", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.customers.create({
      organizationId: 1,
      name: "John Doe",
      code: "CUS-001",
    });
    expect(result).toHaveProperty("id");
  });
});

// ─── Orders Tests ─────────────────────────────────────────────────────────────

describe("orders", () => {
  it("orders.listPurchaseOrders returns paginated POs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.orders.listPurchaseOrders({ organizationId: 1 });
    expect(result).toHaveProperty("orders");
    expect(result).toHaveProperty("total");
  });

  it("orders.listSalesOrders returns paginated SOs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.orders.listSalesOrders({ organizationId: 1 });
    expect(result).toHaveProperty("orders");
    expect(result).toHaveProperty("total");
  });

  it("orders.createPurchaseOrder creates PO with line items", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.orders.createPurchaseOrder({
      organizationId: 1,
      supplierId: 1,
      items: [{ itemId: 1, quantity: 10, unitPrice: 25.0 }],
    });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("orderNumber");
    expect(result.orderNumber).toMatch(/^PO-/);
  });

  it("orders.createSalesOrder creates SO with line items", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.orders.createSalesOrder({
      organizationId: 1,
      items: [{ itemId: 1, quantity: 5, unitPrice: 50.0 }],
    });
    expect(result).toHaveProperty("id");
    expect(result.orderNumber).toMatch(/^SO-/);
  });
});

// ─── Notifications Tests ──────────────────────────────────────────────────────

describe("notifications", () => {
  it("notifications.list returns paginated notifications", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.list({ organizationId: 1 });
    expect(result).toHaveProperty("notifications");
    expect(result).toHaveProperty("total");
  });

  it("notifications.getUnreadCount returns a number", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.getUnreadCount({ organizationId: 1 });
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── Audit Logs Tests ─────────────────────────────────────────────────────────

describe("auditLogs", () => {
  it("auditLogs.list returns paginated logs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auditLogs.list({ organizationId: 1 });
    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
  });
});

// ─── Settings Tests ───────────────────────────────────────────────────────────

describe("settings", () => {
  it("settings.getOrgSettings returns settings or null", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.settings.getOrgSettings({ organizationId: 1 });
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("settings.updateOrgSettings updates successfully", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.settings.updateOrgSettings({
      organizationId: 1,
      lowStockAlerts: true,
      emailNotifications: false,
    });
    expect(result).toHaveProperty("success", true);
  });

  it("settings.listCategories returns categories array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.settings.listCategories({ organizationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Dashboard Tests ──────────────────────────────────────────────────────────

describe("dashboard", () => {
  it("dashboard.getKPIs returns all KPI fields", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dashboard.getKPIs({ organizationId: 1 });
    expect(result).toHaveProperty("totalInventoryItems");
    expect(result).toHaveProperty("totalAssets");
    expect(result).toHaveProperty("activeAssets");
    expect(result).toHaveProperty("inventoryValue");
    expect(result).toHaveProperty("lowStockCount");
    expect(result.totalInventoryItems).toBe(42);
    expect(result.totalAssets).toBe(15);
  });

  it("dashboard.getInventoryTrend returns array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dashboard.getInventoryTrend({ organizationId: 1, days: 30 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("dashboard.getAssetDistribution returns array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dashboard.getAssetDistribution({ organizationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("dashboard.getLowStockAlerts returns array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dashboard.getLowStockAlerts({ organizationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("dashboard.getRecentActivity returns array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.dashboard.getRecentActivity({ organizationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});
