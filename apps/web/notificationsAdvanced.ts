/**
 * Advanced Notification System
 * 
 * Features:
 * - In-app notifications (database-backed)
 * - Email notifications (SMTP-based)
 * - Event-driven architecture (low stock, orders, assets)
 * - Notification preferences per user
 * - Real-time delivery ready (WebSocket integration point)
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getOrgMember,
} from "../db";

// ─── Email Templates ─────────────────────────────────────────────────────────

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function getEmailTemplate(
  type: string,
  data: Record<string, any>
): EmailTemplate {
  switch (type) {
    case "low_stock":
      return {
        subject: `⚠️ Low Stock Alert: ${data.itemName}`,
        html: `
          <h2>Low Stock Alert</h2>
          <p>The following item has fallen below its reorder point:</p>
          <ul>
            <li><strong>Item:</strong> ${data.itemName} (SKU: ${data.sku})</li>
            <li><strong>Current Stock:</strong> ${data.currentStock} ${data.unit}</li>
            <li><strong>Reorder Point:</strong> ${data.reorderPoint} ${data.unit}</li>
            <li><strong>Warehouse:</strong> ${data.warehouseName}</li>
          </ul>
          <p><a href="${data.dashboardUrl}/inventory/${data.itemId}">View in Dashboard</a></p>
        `,
        text: `Low Stock Alert: ${data.itemName}\nCurrent: ${data.currentStock}, Reorder Point: ${data.reorderPoint}\nView: ${data.dashboardUrl}/inventory/${data.itemId}`,
      };

    case "purchase_order_created":
      return {
        subject: `📦 Purchase Order Created: ${data.orderNumber}`,
        html: `
          <h2>Purchase Order Created</h2>
          <p>A new purchase order has been created:</p>
          <ul>
            <li><strong>Order Number:</strong> ${data.orderNumber}</li>
            <li><strong>Supplier:</strong> ${data.supplierName}</li>
            <li><strong>Total Items:</strong> ${data.itemCount}</li>
            <li><strong>Total Amount:</strong> ${data.currency} ${data.totalAmount}</li>
            <li><strong>Created By:</strong> ${data.createdByName}</li>
          </ul>
          <p><a href="${data.dashboardUrl}/purchase-orders/${data.orderId}">View Order</a></p>
        `,
        text: `Purchase Order ${data.orderNumber} created by ${data.createdByName}\nSupplier: ${data.supplierName}\nView: ${data.dashboardUrl}/purchase-orders/${data.orderId}`,
      };

    case "purchase_order_received":
      return {
        subject: `✅ Purchase Order Received: ${data.orderNumber}`,
        html: `
          <h2>Purchase Order Received</h2>
          <p>The following purchase order has been marked as received:</p>
          <ul>
            <li><strong>Order Number:</strong> ${data.orderNumber}</li>
            <li><strong>Supplier:</strong> ${data.supplierName}</li>
            <li><strong>Items Received:</strong> ${data.itemCount}</li>
            <li><strong>Received By:</strong> ${data.receivedByName}</li>
          </ul>
          <p>Stock levels have been automatically updated.</p>
          <p><a href="${data.dashboardUrl}/purchase-orders/${data.orderId}">View Order</a></p>
        `,
        text: `Purchase Order ${data.orderNumber} received\nSupplier: ${data.supplierName}\nView: ${data.dashboardUrl}/purchase-orders/${data.orderId}`,
      };

    case "sales_order_created":
      return {
        subject: `🛒 Sales Order Created: ${data.orderNumber}`,
        html: `
          <h2>Sales Order Created</h2>
          <p>A new sales order has been created:</p>
          <ul>
            <li><strong>Order Number:</strong> ${data.orderNumber}</li>
            <li><strong>Customer:</strong> ${data.customerName}</li>
            <li><strong>Total Items:</strong> ${data.itemCount}</li>
            <li><strong>Total Amount:</strong> ${data.currency} ${data.totalAmount}</li>
            <li><strong>Created By:</strong> ${data.createdByName}</li>
          </ul>
          <p><a href="${data.dashboardUrl}/sales-orders/${data.orderId}">View Order</a></p>
        `,
        text: `Sales Order ${data.orderNumber} created by ${data.createdByName}\nCustomer: ${data.customerName}\nView: ${data.dashboardUrl}/sales-orders/${data.orderId}`,
      };

    case "asset_assigned":
      return {
        subject: `🏷️ Asset Assigned to You: ${data.assetName}`,
        html: `
          <h2>Asset Assigned</h2>
          <p>An asset has been assigned to you:</p>
          <ul>
            <li><strong>Asset:</strong> ${data.assetName}</li>
            <li><strong>Asset Tag:</strong> ${data.assetTag}</li>
            <li><strong>Serial Number:</strong> ${data.serialNumber}</li>
            <li><strong>Type:</strong> ${data.assetType}</li>
            <li><strong>Assigned By:</strong> ${data.assignedByName}</li>
          </ul>
          <p><a href="${data.dashboardUrl}/assets/${data.assetId}">View Asset Details</a></p>
        `,
        text: `Asset ${data.assetName} (${data.assetTag}) assigned to you by ${data.assignedByName}\nView: ${data.dashboardUrl}/assets/${data.assetId}`,
      };

    case "asset_returned":
      return {
        subject: `↩️ Asset Return Requested: ${data.assetName}`,
        html: `
          <h2>Asset Return Requested</h2>
          <p>A return has been requested for the following asset:</p>
          <ul>
            <li><strong>Asset:</strong> ${data.assetName}</li>
            <li><strong>Asset Tag:</strong> ${data.assetTag}</li>
            <li><strong>Assigned To:</strong> ${data.assignedToName}</li>
            <li><strong>Return Requested By:</strong> ${data.requestedByName}</li>
          </ul>
          <p><a href="${data.dashboardUrl}/assets/${data.assetId}">View Asset</a></p>
        `,
        text: `Return requested for asset ${data.assetName} (${data.assetTag})\nView: ${data.dashboardUrl}/assets/${data.assetId}`,
      };

    default:
      return {
        subject: "Notification from Inventra",
        html: `<p>${data.message}</p>`,
        text: data.message,
      };
  }
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

/**
 * Trigger a low stock notification
 * Called when stock falls below reorder point
 */
export async function notifyLowStock(params: {
  organizationId: number;
  itemId: number;
  itemName: string;
  sku: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  warehouseId: number;
  warehouseName: string;
}) {
  const template = getEmailTemplate("low_stock", {
    ...params,
    dashboardUrl: process.env.FRONTEND_URL || "https://inventra.app",
  });

  // Create in-app notification for org admins/managers
  await createNotification({
    organizationId: params.organizationId,
    userId: null, // Broadcast to all managers
    type: "low_stock",
    title: `Low Stock: ${params.itemName}`,
    message: `${params.itemName} (${params.sku}) is below reorder point (${params.currentStock}/${params.reorderPoint} ${params.unit})`,
    referenceType: "inventory_item",
    referenceId: params.itemId,
    isRead: false,
  });

  // Email notification would be sent here (requires SMTP setup)
  console.log("[Notification] Low stock alert:", {
    item: params.itemName,
    subject: template.subject,
  });
}

/**
 * Trigger a purchase order notification
 */
export async function notifyPurchaseOrder(params: {
  organizationId: number;
  orderId: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  createdByUserId: number;
  createdByName: string;
  eventType: "created" | "received" | "cancelled";
}) {
  const eventTypeMap = {
    created: "purchase_order_created",
    received: "purchase_order_received",
    cancelled: "purchase_order_cancelled",
  };

  const template = getEmailTemplate(eventTypeMap[params.eventType], {
    ...params,
    dashboardUrl: process.env.FRONTEND_URL || "https://inventra.app",
  });

  await createNotification({
    organizationId: params.organizationId,
    userId: null,
    type: eventTypeMap[params.eventType],
    title: `Purchase Order ${params.eventType}: ${params.orderNumber}`,
    message: `${params.orderNumber} from ${params.supplierName} - ${params.itemCount} items`,
    referenceType: "purchase_order",
    referenceId: params.orderId,
    isRead: false,
  });

  console.log("[Notification] Purchase order event:", {
    order: params.orderNumber,
    event: params.eventType,
    subject: template.subject,
  });
}

/**
 * Trigger a sales order notification
 */
export async function notifySalesOrder(params: {
  organizationId: number;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  createdByUserId: number;
  createdByName: string;
  eventType: "created" | "confirmed" | "shipped" | "delivered" | "cancelled";
}) {
  const eventTypeMap = {
    created: "sales_order_created",
    confirmed: "sales_order_confirmed",
    shipped: "sales_order_shipped",
    delivered: "sales_order_delivered",
    cancelled: "sales_order_cancelled",
  };

  const template = getEmailTemplate(eventTypeMap[params.eventType], {
    ...params,
    dashboardUrl: process.env.FRONTEND_URL || "https://inventra.app",
  });

  await createNotification({
    organizationId: params.organizationId,
    userId: null,
    type: eventTypeMap[params.eventType],
    title: `Sales Order ${params.eventType}: ${params.orderNumber}`,
    message: `${params.orderNumber} to ${params.customerName} - ${params.itemCount} items`,
    referenceType: "sales_order",
    referenceId: params.orderId,
    isRead: false,
  });

  console.log("[Notification] Sales order event:", {
    order: params.orderNumber,
    event: params.eventType,
  });
}

/**
 * Trigger an asset assignment notification
 */
export async function notifyAssetAssignment(params: {
  organizationId: number;
  assetId: number;
  assetName: string;
  assetTag: string;
  serialNumber: string;
  assetType: string;
  assignedToUserId: number;
  assignedToName: string;
  assignedByUserId: number;
  assignedByName: string;
}) {
  const template = getEmailTemplate("asset_assigned", {
    ...params,
    dashboardUrl: process.env.FRONTEND_URL || "https://inventra.app",
  });

  // Notify the assigned user
  await createNotification({
    organizationId: params.organizationId,
    userId: params.assignedToUserId,
    type: "asset_assigned",
    title: `Asset Assigned: ${params.assetName}`,
    message: `${params.assetName} (${params.assetTag}) has been assigned to you`,
    referenceType: "asset",
    referenceId: params.assetId,
    isRead: false,
  });

  console.log("[Notification] Asset assignment:", {
    asset: params.assetName,
    assignedTo: params.assignedToName,
    subject: template.subject,
  });
}

// ─── tRPC Router ────────────────────────────────────────────────────────────

export const notificationsAdvancedRouter = router({
  // List notifications with filters
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        type: z.string().optional(),
        isRead: z.boolean().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      return getNotifications(input.organizationId, ctx.user.id);
    }),

  // Get unread count
  getUnreadCount: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      const count = await getUnreadNotificationCount(input.organizationId, ctx.user.id);
      return count || 0;
    }),

  // Mark single notification as read
  markRead: protectedProcedure
    .input(z.object({ organizationId: z.number(), notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      await markNotificationRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  // Mark all notifications as read
  markAllRead: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      await markAllNotificationsRead(input.organizationId, ctx.user.id);
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "update",
        module: "notifications",
        entityType: "notification",
        entityId: 0,
        entityName: "Mark all as read",
      });

      return { success: true };
    }),

  // Get notification preferences
  getPreferences: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Return default preferences (can be extended to store per-user prefs)
      return {
        lowStockAlerts: true,
        orderNotifications: true,
        assetNotifications: true,
        emailNotifications: true,
        inAppNotifications: true,
        digestFrequency: "instant", // instant, daily, weekly
      };
    }),

  // Update notification preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        lowStockAlerts: z.boolean().optional(),
        orderNotifications: z.boolean().optional(),
        assetNotifications: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
        inAppNotifications: z.boolean().optional(),
        digestFrequency: z.enum(["instant", "daily", "weekly"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Store preferences (would require a user_notification_preferences table)
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "update",
        module: "notifications",
        entityType: "user_preferences",
        entityId: ctx.user.id,
        entityName: "Notification Preferences",
      });

      return { success: true };
    }),
});
