import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAssetStatusDistribution,
  getDashboardKPIs,
  getInventoryTrend,
  getLowStockItems,
  getNotifications,
  getOrgMember,
  getRecentActivity,
} from "../db";

export const dashboardRouter = router({
  // Main KPI metrics
  getKPIs: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return getDashboardKPIs(input.organizationId);
    }),

  // Inventory trend (stock movements over time)
  getInventoryTrend: protectedProcedure
    .input(z.object({ organizationId: z.number(), days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return getInventoryTrend(input.organizationId, input.days);
    }),

  // Asset status distribution for pie chart
  getAssetDistribution: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return getAssetStatusDistribution(input.organizationId);
    }),

  // Recent activity feed
  getRecentActivity: protectedProcedure
    .input(z.object({ organizationId: z.number(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return getRecentActivity(input.organizationId, input.limit);
    }),

  // Low stock alerts
  getLowStockAlerts: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return getLowStockItems(input.organizationId);
    }),

  // Recent notifications
  getRecentNotifications: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      const result = await getNotifications(input.organizationId, ctx.user.id, { limit: 5 });
      return result.notifications;
    }),
});
