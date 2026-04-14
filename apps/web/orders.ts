import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createNotification,
  createPurchaseOrder,
  createSalesOrder,
  createStockMovement,
  getOrgMember,
  getPurchaseOrderById,
  getPurchaseOrders,
  getSalesOrderById,
  getSalesOrders,
  updatePurchaseOrderStatus,
  updateSalesOrderStatus,
  upsertStockLevel,
} from "../db";

async function requireOrgMember(organizationId: number, userId: number, minRole?: string[]) {
  const member = await getOrgMember(organizationId, userId);
  if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN" });
  if (minRole && !minRole.includes(member.role)) throw new TRPCError({ code: "FORBIDDEN" });
  return member;
}

function generateOrderNumber(prefix: string) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${year}${month}-${random}`;
}

export const ordersRouter = router({
  // ─── PURCHASE ORDERS ───────────────────────────────────────────────────────

  listPurchaseOrders: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getPurchaseOrders(input.organizationId, input);
    }),

  getPurchaseOrder: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      const order = await getPurchaseOrderById(input.id, input.organizationId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  createPurchaseOrder: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      supplierId: z.number(),
      warehouseId: z.number().optional(),
      expectedDate: z.date().optional(),
      currency: z.string().default("USD"),
      notes: z.string().optional(),
      items: z.array(z.object({
        itemId: z.number(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { organizationId, items, ...rest } = input;
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const orderNumber = generateOrderNumber("PO");
      const orderId = await createPurchaseOrder(
        {
          ...rest,
          organizationId,
          orderNumber,
          subtotal: String(subtotal),
          totalAmount: String(subtotal),
          createdBy: ctx.user.id,
        },
        items,
      );
      await createAuditLog({ organizationId, userId: ctx.user.id, action: "create", module: "orders", entityType: "purchase_order", entityId: orderId, entityName: orderNumber });
      return { id: orderId, orderNumber };
    }),

  updatePurchaseOrderStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number(),
      status: z.enum(["draft", "pending", "approved", "ordered", "partial", "received", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const order = await getPurchaseOrderById(input.id, input.organizationId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      await updatePurchaseOrderStatus(input.id, input.organizationId, input.status);

      // When received, update stock levels
      if (input.status === "received" && order.items) {
        for (const { item, inventoryItem } of order.items) {
          if (order.order.warehouseId) {
            await upsertStockLevel(input.organizationId, item.itemId, order.order.warehouseId, item.quantity);
            await createStockMovement({
              organizationId: input.organizationId,
              itemId: item.itemId,
              warehouseId: order.order.warehouseId,
              type: "in",
              quantity: item.quantity,
              unitCost: item.unitPrice,
              referenceType: "purchase_order",
              referenceId: input.id,
              performedBy: ctx.user.id,
            });
          }
        }
        await createNotification({
          organizationId: input.organizationId,
          type: "order_received",
          title: "Purchase Order Received",
          message: `Purchase order ${order.order.orderNumber} has been received.`,
          referenceType: "purchase_order",
          referenceId: input.id,
        });
      }

      await createAuditLog({ organizationId: input.organizationId, userId: ctx.user.id, action: "status_change", module: "orders", entityType: "purchase_order", entityId: input.id, entityName: `${order.order.orderNumber} → ${input.status}` });
      return { success: true };
    }),

  // ─── SALES ORDERS ──────────────────────────────────────────────────────────

  listSalesOrders: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getSalesOrders(input.organizationId, input);
    }),

  getSalesOrder: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      const order = await getSalesOrderById(input.id, input.organizationId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  createSalesOrder: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      customerId: z.number().optional(),
      warehouseId: z.number().optional(),
      requiredDate: z.date().optional(),
      shippingAddress: z.string().optional(),
      currency: z.string().default("USD"),
      notes: z.string().optional(),
      items: z.array(z.object({
        itemId: z.number(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { organizationId, items, ...rest } = input;
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const orderNumber = generateOrderNumber("SO");
      const orderId = await createSalesOrder(
        {
          ...rest,
          organizationId,
          orderNumber,
          subtotal: String(subtotal),
          totalAmount: String(subtotal),
          createdBy: ctx.user.id,
        },
        items,
      );
      await createAuditLog({ organizationId, userId: ctx.user.id, action: "create", module: "orders", entityType: "sales_order", entityId: orderId, entityName: orderNumber });
      return { id: orderId, orderNumber };
    }),

  updateSalesOrderStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number(),
      status: z.enum(["draft", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const order = await getSalesOrderById(input.id, input.organizationId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      await updateSalesOrderStatus(input.id, input.organizationId, input.status);

      // When processing/shipped, deduct stock
      if (input.status === "processing" && order.order.status === "confirmed" && order.items && order.order.warehouseId) {
        for (const { item } of order.items) {
          await upsertStockLevel(input.organizationId, item.itemId, order.order.warehouseId, -item.quantity);
          await createStockMovement({
            organizationId: input.organizationId,
            itemId: item.itemId,
            warehouseId: order.order.warehouseId,
            type: "out",
            quantity: item.quantity,
            referenceType: "sales_order",
            referenceId: input.id,
            performedBy: ctx.user.id,
          });
        }
      }

      await createAuditLog({ organizationId: input.organizationId, userId: ctx.user.id, action: "status_change", module: "orders", entityType: "sales_order", entityId: input.id, entityName: `${order.order.orderNumber} → ${input.status}` });
      return { success: true };
    }),
});
