import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createAsset,
  createAssetAssignment,
  createNotification,
  deleteAsset,
  getAssetAssignments,
  getAssetById,
  getAssets,
  getCategories,
  getOrgMember,
  updateAsset,
} from "../db";

async function requireOrgMember(organizationId: number, userId: number, minRole?: string[]) {
  const member = await getOrgMember(organizationId, userId);
  if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN" });
  if (minRole && !minRole.includes(member.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  return member;
}

export const assetsRouter = router({
  // List assets with pagination, search, and status filter
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      search: z.string().optional(),
      status: z.enum(["active", "maintenance", "retired", "disposed", "lost"]).optional(),
      categoryId: z.number().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getAssets(input.organizationId, input);
    }),

  // Get single asset with assignment history
  getById: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      const asset = await getAssetById(input.id, input.organizationId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      const assignments = await getAssetAssignments(input.id);
      return { ...asset, assignments };
    }),

  // Create asset
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(1).max(255),
      assetTag: z.string().min(1).max(100),
      serialNumber: z.string().optional(),
      model: z.string().optional(),
      manufacturer: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      warehouseId: z.number().optional(),
      status: z.enum(["active", "maintenance", "retired", "disposed", "lost"]).default("active"),
      condition: z.enum(["new", "good", "fair", "poor"]).default("good"),
      purchaseDate: z.date().optional(),
      purchasePrice: z.number().optional(),
      warrantyExpiry: z.date().optional(),
      depreciationRate: z.number().optional(),
      supplierId: z.number().optional(),
      imageUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { organizationId, purchasePrice, depreciationRate, ...rest } = input;
      const assetId = await createAsset({
        ...rest,
        organizationId,
        purchasePrice: purchasePrice ? String(purchasePrice) : undefined,
        depreciationRate: depreciationRate ? String(depreciationRate) : undefined,
        createdBy: ctx.user.id,
      });
      await createAuditLog({
        organizationId,
        userId: ctx.user.id,
        action: "create",
        module: "assets",
        entityType: "asset",
        entityId: assetId,
        entityName: input.name,
      });
      return { id: assetId };
    }),

  // Update asset
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number(),
      name: z.string().optional(),
      assetTag: z.string().optional(),
      serialNumber: z.string().optional(),
      model: z.string().optional(),
      manufacturer: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      warehouseId: z.number().optional(),
      status: z.enum(["active", "maintenance", "retired", "disposed", "lost"]).optional(),
      condition: z.enum(["new", "good", "fair", "poor"]).optional(),
      purchaseDate: z.date().optional(),
      purchasePrice: z.number().optional(),
      warrantyExpiry: z.date().optional(),
      depreciationRate: z.number().optional(),
      currentValue: z.number().optional(),
      supplierId: z.number().optional(),
      imageUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { id, organizationId, purchasePrice, depreciationRate, currentValue, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (purchasePrice !== undefined) updateData.purchasePrice = String(purchasePrice);
      if (depreciationRate !== undefined) updateData.depreciationRate = String(depreciationRate);
      if (currentValue !== undefined) updateData.currentValue = String(currentValue);

      // Notify on status change to maintenance
      if (input.status === "maintenance") {
        const asset = await getAssetById(id, organizationId);
        if (asset && asset.asset.status !== "maintenance") {
          await createNotification({
            organizationId,
            type: "asset_maintenance",
            title: "Asset Under Maintenance",
            message: `Asset "${asset.asset.name}" (Tag: ${asset.asset.assetTag}) has been moved to maintenance status.`,
            referenceType: "asset",
            referenceId: id,
          });
        }
      }

      await updateAsset(id, organizationId, updateData);
      await createAuditLog({
        organizationId,
        userId: ctx.user.id,
        action: "update",
        module: "assets",
        entityType: "asset",
        entityId: id,
        entityName: input.name,
      });
      return { success: true };
    }),

  // Delete asset (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin"]);
      const asset = await getAssetById(input.id, input.organizationId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteAsset(input.id, input.organizationId);
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "delete",
        module: "assets",
        entityType: "asset",
        entityId: input.id,
        entityName: asset.asset.name,
      });
      return { success: true };
    }),

  // Assign asset to user
  assign: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      assetId: z.number(),
      userId: z.number().optional(),
      assignedTo: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const asset = await getAssetById(input.assetId, input.organizationId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      const assignmentId = await createAssetAssignment({
        ...input,
        assignedBy: ctx.user.id,
      });
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "assign",
        module: "assets",
        entityType: "asset_assignment",
        entityId: assignmentId,
        entityName: `${asset.asset.name} → ${input.assignedTo || `User #${input.userId}`}`,
      });
      return { id: assignmentId };
    }),

  // Get assignment history
  getAssignments: protectedProcedure
    .input(z.object({ assetId: z.number(), organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getAssetAssignments(input.assetId);
    }),

  // Get categories for assets
  getCategories: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getCategories(input.organizationId, "asset");
    }),
});
