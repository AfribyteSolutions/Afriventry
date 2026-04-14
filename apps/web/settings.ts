import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createCategory,
  getCategories,
  getOrgMember,
  getOrgSettings,
  updateOrganization,
  updateOrgSettings,
} from "../db";

async function requireOrgMember(organizationId: number, userId: number, minRole?: string[]) {
  const member = await getOrgMember(organizationId, userId);
  if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN" });
  if (minRole && !minRole.includes(member.role)) throw new TRPCError({ code: "FORBIDDEN" });
  return member;
}

export const settingsRouter = router({
  // Get org settings
  getOrgSettings: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getOrgSettings(input.organizationId);
    }),

  // Update org settings
  updateOrgSettings: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      lowStockAlerts: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      autoReorder: z.boolean().optional(),
      defaultWarehouseId: z.number().optional(),
      fiscalYearStart: z.string().optional(),
      dateFormat: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin"]);
      const { organizationId, ...data } = input;
      await updateOrgSettings(organizationId, data);
      await createAuditLog({ organizationId, userId: ctx.user.id, action: "update", module: "settings", entityType: "org_settings", entityId: organizationId, entityName: "Organization Settings" });
      return { success: true };
    }),

  // Update organization profile
  updateOrgProfile: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      industry: z.string().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
      website: z.string().optional(),
      logoUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin"]);
      const { organizationId, ...data } = input;
      await updateOrganization(organizationId, data);
      await createAuditLog({ organizationId, userId: ctx.user.id, action: "update", module: "settings", entityType: "organization", entityId: organizationId, entityName: "Organization Profile" });
      return { success: true };
    }),

  // Categories management
  listCategories: protectedProcedure
    .input(z.object({ organizationId: z.number(), type: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getCategories(input.organizationId, input.type);
    }),

  createCategory: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(100),
      description: z.string().optional(),
      type: z.enum(["inventory", "asset", "both"]).default("both"),
      color: z.string().optional(),
      icon: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const id = await createCategory(input);
      await createAuditLog({ organizationId: input.organizationId, userId: ctx.user.id, action: "create", module: "settings", entityType: "category", entityId: id, entityName: input.name });
      return { id };
    }),
});
