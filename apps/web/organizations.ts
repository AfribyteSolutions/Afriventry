import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addOrgMember,
  createAuditLog,
  createOrganization,
  getOrgMember,
  getOrgMembers,
  getOrganizationById,
  getOrganizationBySlug,
  getUserOrganizations,
  updateOrganization,
} from "../db";

export const organizationsRouter = router({
  // List all orgs the current user belongs to
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserOrganizations(ctx.user.id);
  }),

  // Get a single org by ID (must be a member)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.id, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
      return getOrganizationById(input.id);
    }),

  // Create a new organization (any authenticated user)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(255),
      slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
      industry: z.string().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check slug uniqueness
      const existing = await getOrganizationBySlug(input.slug);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Organization slug already taken" });

      const orgId = await createOrganization(input);
      // Add creator as owner
      await addOrgMember({ organizationId: orgId, userId: ctx.user.id, role: "owner" });
      await createAuditLog({
        organizationId: orgId,
        userId: ctx.user.id,
        action: "create",
        module: "organizations",
        entityType: "organization",
        entityId: orgId,
        entityName: input.name,
      });
      return { id: orgId };
    }),

  // Update organization (admin/owner only)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(255).optional(),
      description: z.string().optional(),
      industry: z.string().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
      logoUrl: z.string().optional(),
      website: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.id, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
      }
      const { id, ...data } = input;
      await updateOrganization(id, data);
      await createAuditLog({
        organizationId: id,
        userId: ctx.user.id,
        action: "update",
        module: "organizations",
        entityType: "organization",
        entityId: id,
        entityName: input.name,
      });
      return { success: true };
    }),

  // Get members of an organization
  getMembers: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return getOrgMembers(input.organizationId);
    }),

  // Add a member (admin/owner only)
  addMember: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      userId: z.number(),
      role: z.enum(["admin", "manager", "staff", "viewer"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await addOrgMember({ ...input, invitedBy: ctx.user.id });
      return { success: true };
    }),

  // Get current user's role in an org
  getMyRole: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      return member ? { role: member.role, isActive: member.isActive } : null;
    }),
});
