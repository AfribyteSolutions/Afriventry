import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { organizationsRouter } from "./routers/organizations";
import { inventoryRouter } from "./routers/inventory";
import { assetsRouter } from "./routers/assets";
import { warehousesRouter } from "./routers/warehouses";
import { suppliersRouter } from "./routers/suppliers";
import { customersRouter } from "./routers/customers";
import { ordersRouter } from "./routers/orders";
import { notificationsRouter } from "./routers/notifications";
import { auditLogsRouter } from "./routers/auditLogs";
import { settingsRouter } from "./routers/settings";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Feature routers
  organizations: organizationsRouter,
  inventory: inventoryRouter,
  assets: assetsRouter,
  warehouses: warehousesRouter,
  suppliers: suppliersRouter,
  customers: customersRouter,
  orders: ordersRouter,
  notifications: notificationsRouter,
  auditLogs: auditLogsRouter,
  settings: settingsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
