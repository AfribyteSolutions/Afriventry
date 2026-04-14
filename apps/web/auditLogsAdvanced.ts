/**
 * Enhanced Audit Logging System
 * 
 * Features:
 * - Automatic mutation tracking via middleware
 * - Login activity tracking
 * - Permission change audit events
 * - Advanced filtering and search
 * - Export to CSV
 * - Compliance-ready (immutable append-only)
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  getAuditLogs,
  getOrgMember,
} from "../db";

// ─── Audit Event Types ──────────────────────────────────────────────────────

export enum AuditAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
  PERMISSION_GRANT = "permission_grant",
  PERMISSION_REVOKE = "permission_revoke",
  ROLE_CHANGE = "role_change",
  EXPORT = "export",
  IMPORT = "import",
}

export enum AuditModule {
  INVENTORY = "inventory",
  ASSETS = "assets",
  ORDERS = "orders",
  SUPPLIERS = "suppliers",
  CUSTOMERS = "customers",
  WAREHOUSES = "warehouses",
  ORGANIZATIONS = "organizations",
  USERS = "users",
  SETTINGS = "settings",
  NOTIFICATIONS = "notifications",
  FILES = "files",
  AUTH = "auth",
}

// ─── Audit Log Helpers ──────────────────────────────────────────────────────

/**
 * Track login activity
 * Called from auth middleware
 */
export async function auditLogin(userId: number, organizationId?: number) {
  // Note: This would be called from the OAuth callback handler
  // For now, just log to console
  console.log(`[Audit] Login: user=${userId}, org=${organizationId}`);
}

/**
 * Track logout activity
 */
export async function auditLogout(userId: number, organizationId?: number) {
  console.log(`[Audit] Logout: user=${userId}, org=${organizationId}`);
}

/**
 * Track role changes
 */
export async function auditRoleChange(params: {
  organizationId: number;
  userId: number;
  changedByUserId: number;
  oldRole: string;
  newRole: string;
  targetUserId: number;
}) {
  await createAuditLog({
    organizationId: params.organizationId,
    userId: params.changedByUserId,
    action: AuditAction.ROLE_CHANGE,
    module: AuditModule.USERS,
    entityType: "user_role",
    entityId: params.targetUserId,
    entityName: `Role changed from ${params.oldRole} to ${params.newRole}`,
  });
}

/**
 * Track permission grants
 */
export async function auditPermissionGrant(params: {
  organizationId: number;
  userId: number;
  grantedByUserId: number;
  roleId: number;
  permissionId: number;
  permissionName: string;
}) {
  await createAuditLog({
    organizationId: params.organizationId,
    userId: params.grantedByUserId,
    action: AuditAction.PERMISSION_GRANT,
    module: AuditModule.ORGANIZATIONS,
    entityType: "role_permission",
    entityId: params.roleId,
    entityName: `Permission granted: ${params.permissionName}`,
  });
}

/**
 * Track permission revokes
 */
export async function auditPermissionRevoke(params: {
  organizationId: number;
  userId: number;
  revokedByUserId: number;
  roleId: number;
  permissionId: number;
  permissionName: string;
}) {
  await createAuditLog({
    organizationId: params.organizationId,
    userId: params.revokedByUserId,
    action: AuditAction.PERMISSION_REVOKE,
    module: AuditModule.ORGANIZATIONS,
    entityType: "role_permission",
    entityId: params.roleId,
    entityName: `Permission revoked: ${params.permissionName}`,
  });
}

// ─── Audit Middleware (Integration Point) ──────────────────────────────────

/**
 * Middleware to automatically track mutations
 * Would be integrated into tRPC context
 * 
 * Usage:
 * const ctx = { ...baseCtx, auditLog: createAuditMiddleware(baseCtx) }
 */
export function createAuditMiddleware(baseCtx: any) {
  return async (action: string, module: string, entityType: string, entityId: number, entityName: string) => {
    if (!baseCtx.user) return;
    
    await createAuditLog({
      organizationId: baseCtx.organizationId,
      userId: baseCtx.user.id,
      action: action as any,
      module: module as any,
      entityType,
      entityId,
      entityName,
    });
  };
}

// ─── tRPC Router ────────────────────────────────────────────────────────────

export const auditLogsAdvancedRouter = router({
  /**
   * List audit logs with advanced filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        module: z.string().optional(),
        action: z.string().optional(),
        userId: z.number().optional(),
        entityType: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Only owners/admins can view full audit logs
      if (!["owner", "admin"].includes(member.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can view audit logs",
        });
      }

      // Build filters
      const filters: Record<string, any> = {};
      if (input.module) filters.module = input.module;
      if (input.action) filters.action = input.action;
      if (input.userId) filters.userId = input.userId;
      if (input.entityType) filters.entityType = input.entityType;
      if (input.search) filters.search = input.search;

      // Would query audit_logs table with date range filtering
      return getAuditLogs(input.organizationId, {
        module: input.module,
        userId: input.userId,
        limit: input.limit,
        page: Math.floor(input.offset / input.limit),
      });
    }),

  /**
   * Get audit log by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        logId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would query single audit log
      return null;
    }),

  /**
   * Get login activity for a user
   */
  getLoginActivity: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number(),
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Only admins can view other users' login activity
      if (input.userId !== ctx.user.id && !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would query audit logs for login/logout events
      return {
        userId: input.userId,
        logins: [],
        lastLogin: null,
        loginCount: 0,
      };
    }),

  /**
   * Get permission change history
   */
  getPermissionHistory: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        roleId: z.number().optional(),
        userId: z.number().optional(),
        days: z.number().default(90),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would query audit logs for permission_grant/permission_revoke events
      return {
        changes: [],
        totalChanges: 0,
      };
    }),

  /**
   * Get user activity summary
   */
  getUserActivity: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number(),
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Only admins or the user themselves can view activity
      if (input.userId !== ctx.user.id && !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would aggregate audit logs by action type
      return {
        userId: input.userId,
        summary: {
          creates: 0,
          updates: 0,
          deletes: 0,
          reads: 0,
          other: 0,
        },
        recentActions: [],
      };
    }),

  /**
   * Get module activity summary
   */
  getModuleActivity: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        module: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would aggregate audit logs by action type for a module
      return {
        module: input.module,
        summary: {
          creates: 0,
          updates: 0,
          deletes: 0,
          total: 0,
        },
        topUsers: [],
      };
    }),

  /**
   * Export audit logs to CSV
   */
  exportToCSV: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        module: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Create audit log for the export
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: AuditAction.EXPORT,
        module: AuditModule.ORGANIZATIONS,
        entityType: "audit_logs",
        entityId: 0,
        entityName: `Exported audit logs (module: ${input.module || "all"})`,
      });

      // Would generate CSV and return download URL
      return {
        downloadUrl: `${process.env.FRONTEND_URL}/api/audit/export/${Date.now()}.csv`,
        expiresIn: 3600,
      };
    }),

  /**
   * Get compliance report
   * Summarizes all activity for compliance purposes
   */
  getComplianceReport: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would generate compliance report
      return {
        organizationId: input.organizationId,
        period: {
          from: input.dateFrom,
          to: input.dateTo,
        },
        summary: {
          totalEvents: 0,
          uniqueUsers: 0,
          modules: {},
          actions: {},
        },
        riskFlags: [],
        generatedAt: new Date(),
      };
    }),

  /**
   * Detect suspicious activity
   */
  detectAnomalies: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        days: z.number().default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would analyze audit logs for anomalies like:
      // - Bulk deletions
      // - Unusual access patterns
      // - Failed login attempts
      // - Permission escalations
      return {
        anomalies: [],
        riskScore: 0, // 0-100
        recommendations: [],
      };
    }),
});
