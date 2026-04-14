import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAuditLogs, getOrgMember } from "../db";

export const auditLogsRouter = router({
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      module: z.string().optional(),
      userId: z.number().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin", "manager"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only managers and above can view audit logs" });
      }
      return getAuditLogs(input.organizationId, input);
    }),
});
