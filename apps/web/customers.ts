import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAuditLog, createCustomer, deleteCustomer, getCustomers, getOrgMember, updateCustomer } from "../db";

async function requireOrgMember(organizationId: number, userId: number, minRole?: string[]) {
  const member = await getOrgMember(organizationId, userId);
  if (!member || !member.isActive) throw new TRPCError({ code: "FORBIDDEN" });
  if (minRole && !minRole.includes(member.role)) throw new TRPCError({ code: "FORBIDDEN" });
  return member;
}

export const customersRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number(), search: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id);
      return getCustomers(input.organizationId, input);
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(1),
      code: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      contactPerson: z.string().optional(),
      taxId: z.string().optional(),
      creditLimit: z.number().default(0),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { creditLimit, ...rest } = input;
      const id = await createCustomer({ ...rest, creditLimit: String(creditLimit), isActive: true });
      await createAuditLog({ organizationId: input.organizationId, userId: ctx.user.id, action: "create", module: "customers", entityType: "customer", entityId: id, entityName: input.name });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      contactPerson: z.string().optional(),
      taxId: z.string().optional(),
      creditLimit: z.number().optional(),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin", "manager"]);
      const { id, organizationId, creditLimit, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (creditLimit !== undefined) data.creditLimit = String(creditLimit);
      await updateCustomer(id, organizationId, data);
      await createAuditLog({ organizationId, userId: ctx.user.id, action: "update", module: "customers", entityType: "customer", entityId: id, entityName: input.name });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.organizationId, ctx.user.id, ["owner", "admin"]);
      await deleteCustomer(input.id, input.organizationId);
      await createAuditLog({ organizationId: input.organizationId, userId: ctx.user.id, action: "delete", module: "customers", entityType: "customer", entityId: input.id, entityName: "customer" });
      return { success: true };
    }),
});
