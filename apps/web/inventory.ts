import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createInventoryItem,
  createNotification,
  createStockMovement,
  deleteInventoryItem,
  getCategories,
  getInventoryItemById,
  getInventoryItems,
  getLowStockItems,
  getOrgMember,
  getStockLevels,
  getStockMovements,
  getTotalStock,
  updateInventoryItem,
  upsertStockLevel,
} from "../db";

// Helper: check org membership and role
async function requireOrgMember(organizationId: number, userId: number, minRole?: string[]) {
  const member = await getOrgMember(organizationId, userId);
  if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  if (minRole && !minRole.includes(member.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  return member;
}

export const inventoryRouter = router({
  // List inventory items with pagination and search
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      search: z.string().optional(),
      categoryId: z.number().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getInventoryItems(input.organizationId, input);
    }),

  // Get single item with stock levels
  getById: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      const item = await getInventoryItemById(input.id, input.organizationId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const stockLevels = await getStockLevels(input.organizationId, input.id);
      return { ...item, stockLevels };
    }),

  // Create inventory item
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(1).max(255),
      sku: z.string().min(1).max(100),
      barcode: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      unit: z.string().default("pcs"),
      costPrice: z.number().min(0).default(0),
      sellingPrice: z.number().min(0).default(0),
      reorderPoint: z.number().min(0).default(0),
      reorderQty: z.number().min(0).default(0),
      maxStock: z.number().optional(),
      supplierId: z.number().optional(),
      imageUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { organizationId, costPrice, sellingPrice, ...rest } = input;
      const itemId = await createInventoryItem({
        ...rest,
        organizationId,
        costPrice: String(costPrice),
        sellingPrice: String(sellingPrice),
        createdBy: ctx.user.id,
      });
      await createAuditLog({
        organizationId,
        userId: ctx.user.id,
        action: "create",
        module: "inventory",
        entityType: "inventory_item",
        entityId: itemId,
        entityName: input.name,
      });
      return { id: itemId };
    }),

  // Update inventory item
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number(),
      name: z.string().min(1).max(255).optional(),
      sku: z.string().optional(),
      barcode: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      unit: z.string().optional(),
      costPrice: z.number().min(0).optional(),
      sellingPrice: z.number().min(0).optional(),
      reorderPoint: z.number().min(0).optional(),
      reorderQty: z.number().min(0).optional(),
      maxStock: z.number().optional(),
      supplierId: z.number().optional(),
      imageUrl: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { id, organizationId, costPrice, sellingPrice, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (costPrice !== undefined) updateData.costPrice = String(costPrice);
      if (sellingPrice !== undefined) updateData.sellingPrice = String(sellingPrice);
      await updateInventoryItem(id, organizationId, updateData);
      await createAuditLog({
        organizationId,
        userId: ctx.user.id,
        action: "update",
        module: "inventory",
        entityType: "inventory_item",
        entityId: id,
        entityName: input.name,
      });
      return { success: true };
    }),

  // Delete inventory item (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin"]);
      const item = await getInventoryItemById(input.id, input.organizationId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteInventoryItem(input.id, input.organizationId);
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "delete",
        module: "inventory",
        entityType: "inventory_item",
        entityId: input.id,
        entityName: item.item.name,
      });
      return { success: true };
    }),

  // Get stock levels for an item
  getStockLevels: protectedProcedure
    .input(z.object({ organizationId: z.number(), itemId: z.number().optional(), warehouseId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getStockLevels(input.organizationId, input.itemId, input.warehouseId);
    }),

  // Record a stock movement (in/out/transfer/adjustment)
  recordMovement: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      itemId: z.number(),
      warehouseId: z.number(),
      toWarehouseId: z.number().optional(),
      type: z.enum(["in", "out", "transfer", "adjustment", "return"]),
      quantity: z.number().min(1),
      unitCost: z.number().optional(),
      notes: z.string().optional(),
      referenceType: z.string().optional(),
      referenceId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager", "staff"]);

      const { organizationId, unitCost, ...rest } = input;

      // Validate stock for outbound movements
      if (["out", "transfer"].includes(input.type)) {
        const levels = await getStockLevels(organizationId, input.itemId, input.warehouseId);
        const currentQty = levels[0]?.level.quantity || 0;
        if (currentQty < input.quantity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Insufficient stock. Available: ${currentQty}, Requested: ${input.quantity}` });
        }
      }

      // Create movement record
      const movementId = await createStockMovement({
        ...rest,
        organizationId,
        unitCost: unitCost ? String(unitCost) : undefined,
        performedBy: ctx.user.id,
      });

      // Update stock levels
      if (input.type === "in" || input.type === "return") {
        await upsertStockLevel(organizationId, input.itemId, input.warehouseId, input.quantity);
      } else if (input.type === "out") {
        await upsertStockLevel(organizationId, input.itemId, input.warehouseId, -input.quantity);
      } else if (input.type === "transfer" && input.toWarehouseId) {
        await upsertStockLevel(organizationId, input.itemId, input.warehouseId, -input.quantity);
        await upsertStockLevel(organizationId, input.itemId, input.toWarehouseId, input.quantity);
      } else if (input.type === "adjustment") {
        // For adjustment, quantity can be negative (set absolute)
        await upsertStockLevel(organizationId, input.itemId, input.warehouseId, input.quantity);
      }

      // Check for low stock and create notification
      const levels = await getStockLevels(organizationId, input.itemId);
      const totalQty = levels.reduce((sum, l) => sum + (l.level.quantity || 0), 0);
      const item = await getInventoryItemById(input.itemId, organizationId);
      if (item && item.item.reorderPoint && totalQty <= item.item.reorderPoint) {
        await createNotification({
          organizationId,
          type: "low_stock",
          title: "Low Stock Alert",
          message: `${item.item.name} (SKU: ${item.item.sku}) is running low. Current stock: ${totalQty}, Reorder point: ${item.item.reorderPoint}`,
          referenceType: "inventory_item",
          referenceId: input.itemId,
        });
      }

      await createAuditLog({
        organizationId,
        userId: ctx.user.id,
        action: "stock_movement",
        module: "inventory",
        entityType: "stock_movement",
        entityId: movementId,
        entityName: `${input.type} - qty: ${input.quantity}`,
      });

      return { id: movementId };
    }),

  // Get stock movement history
  getMovements: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      itemId: z.number().optional(),
      warehouseId: z.number().optional(),
      type: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getStockMovements(input.organizationId, input);
    }),

  // Get low stock items
  getLowStock: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getLowStockItems(input.organizationId);
    }),

  // Get total stock per item
  getTotalStock: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getTotalStock(input.organizationId);
    }),

  // Get categories for inventory
  getCategories: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getCategories(input.organizationId, "inventory");
    }),
});
