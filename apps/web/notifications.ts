import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getNotifications, getOrgMember, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from "../db";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      unreadOnly: z.boolean().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      return getNotifications(input.organizationId, ctx.user.id, input);
    }),

  getUnreadCount: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) return 0;
      return getUnreadNotificationCount(input.organizationId, ctx.user.id);
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),

  markAllRead: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      await markAllNotificationsRead(input.organizationId, ctx.user.id);
      return { success: true };
    }),
});
