import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAuditLog, createWarehouse, deleteWarehouse, getOrgMember, getWarehouseById, getWarehouses, updateWarehouse } from "../db";

async function requireOrgMember(organizationId: number, userId: number, minRole?: string[]) {
  const member = await getOrgMember(organizationId, userId);
  if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN" });
  if (minRole && !minRole.includes(member.role)) throw new TRPCError({ code: "FORBIDDEN" });
  return member;
}

export const warehousesRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getWarehouses(input.organizationId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      const wh = await getWarehouseById(input.id, input.organizationId);
      if (!wh) throw new TRPCError({ code: "NOT_FOUND" });
      return wh;
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(1).max(255),
      code: z.string().min(1).max(50),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      managerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const id = await createWarehouse(input);
      await createAuditLog({ organizationId: input.organizationId, userId: ctx.user.id, action: "create", module: "warehouses", entityType: "warehouse", entityId: id, entityName: input.name });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      isActive: z.boolean().optional(),
      managerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { id, organizationId, ...data } = input;
      await updateWarehouse(id, organizationId, data);
      await createAuditLog({ organizationId, userId: ctx.user.id, action: "update", module: "warehouses", entityType: "warehouse", entityId: id, entityName: input.name });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin"]);
      await deleteWarehouse(input.id, input.organizationId);
      await createAuditLog({ organizationId: input.organizationId, userId: ctx.user.id, action: "delete", module: "warehouses", entityType: "warehouse", entityId: input.id, entityName: "warehouse" });
      return { success: true };
    }),
});
