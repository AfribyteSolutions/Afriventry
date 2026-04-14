import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgContext } from "@/contexts/OrgContext";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  Building2,
  ClipboardList,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation } from "wouter";
const ASSET_STATUS_COLORS: Record<string, string> = {
  active: "#6366f1",
  maintenance: "#f59e0b",
  retired: "#94a3b8",
  disposed: "#ef4444",
  lost: "#f97316",
};

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "default",
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: "default" | "warning" | "success" | "danger";
  onClick?: () => void;
}) {
  const colorMap = {
    default: "text-primary bg-primary/10",
    warning: "text-amber-600 bg-amber-100",
    success: "text-emerald-600 bg-emerald-100",
    danger: "text-red-600 bg-red-100",
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.value >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend.value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {Math.abs(trend.value)}% {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ml-3 ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.getKPIs.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: trend, isLoading: trendLoading } = trpc.dashboard.getInventoryTrend.useQuery(
    { organizationId: orgId!, days: 30 },
    { enabled: !!orgId }
  );

  const { data: assetDist } = trpc.dashboard.getAssetDistribution.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: recentActivity } = trpc.dashboard.getRecentActivity.useQuery(
    { organizationId: orgId!, limit: 8 },
    { enabled: !!orgId }
  );

  const { data: lowStock } = trpc.dashboard.getLowStockAlerts.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: notifications } = trpc.dashboard.getRecentNotifications.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  // Process trend data for chart
  const chartData = (() => {
    if (!trend) return [];
    const map: Record<string, { date: string; in: number; out: number }> = {};
    for (const t of trend) {
      if (!map[t.date]) map[t.date] = { date: t.date, in: 0, out: 0 };
      if (t.type === "in" || t.type === "return") map[t.date].in += Number(t.total);
      if (t.type === "out" || t.type === "transfer") map[t.date].out += Number(t.total);
    }
    return Object.values(map).slice(-14);
  })();

  // Process asset distribution for pie chart
  const pieData = (assetDist || []).map((d) => ({
    name: d.status,
    value: Number(d.count),
    color: ASSET_STATUS_COLORS[d.status] || "#94a3b8",
  }));

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Organization Found</h2>
          <p className="text-muted-foreground text-sm mt-1">Create your first organization to get started.</p>
        </div>
        <Button onClick={() => setLocation("/organizations/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {currentOrg?.org.name} — Overview & Analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/inventory")}>
            <Package className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button size="sm" onClick={() => setLocation("/orders/purchase")}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Inventory Items"
            value={kpis?.totalInventoryItems ?? 0}
            icon={Package}
            subtitle="Active SKUs"
            onClick={() => setLocation("/inventory")}
          />
          <KPICard
            title="Total Assets"
            value={kpis?.totalAssets ?? 0}
            icon={Box}
            subtitle={`${kpis?.activeAssets ?? 0} active`}
            color="default"
            onClick={() => setLocation("/assets")}
          />
          <KPICard
            title="Inventory Value"
            value={`$${(kpis?.inventoryValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={TrendingUp}
            subtitle="At cost price"
            color="success"
          />
          <KPICard
            title="Low Stock Alerts"
            value={kpis?.lowStockCount ?? 0}
            icon={AlertTriangle}
            subtitle="Items below reorder point"
            color={kpis?.lowStockCount ? "warning" : "default"}
            onClick={() => setLocation("/inventory")}
          />
          <KPICard
            title="Open Purchase Orders"
            value={kpis?.openPurchaseOrders ?? 0}
            icon={ShoppingCart}
            subtitle="Pending receipt"
            onClick={() => setLocation("/orders/purchase")}
          />
          <KPICard
            title="Open Sales Orders"
            value={kpis?.openSalesOrders ?? 0}
            icon={ClipboardList}
            subtitle="In progress"
            onClick={() => setLocation("/orders/sales")}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Stock Movement Trend</CardTitle>
                <CardDescription className="text-xs">Last 14 days — stock in vs. out</CardDescription>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {trendLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No movement data yet. Start recording stock movements.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(value, name) => [value, name === "in" ? "Stock In" : "Stock Out"]}
                  />
                  <Legend formatter={(v) => (v === "in" ? "Stock In" : "Stock Out")} iconSize={8} />
                  <Area type="monotone" dataKey="in" stroke="#6366f1" fill="url(#colorIn)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="out" stroke="#f59e0b" fill="url(#colorOut)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Asset Distribution Pie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Asset Status</CardTitle>
            <CardDescription className="text-xs">Distribution by lifecycle status</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No assets tracked yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(value, name) => [value, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                  />
                  <Legend
                    formatter={(v) => String(v).charAt(0).toUpperCase() + String(v).slice(1)}
                    iconSize={8}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Low Stock + Activity + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Low Stock Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/inventory")}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!lowStock || lowStock.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                All items are well-stocked.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <Badge variant="destructive" className="text-xs">
                        {item.currentStock} left
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">min: {item.reorderPoint}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/audit-logs")}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!recentActivity || recentActivity.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map(({ log, user }) => (
                  <div key={log.id} className="flex items-start gap-2.5 py-1.5 border-b border-border/50 last:border-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-primary">
                        {user?.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-tight">
                        <span className="text-primary capitalize">{log.action}</span>{" "}
                        <span className="text-muted-foreground">{log.entityType.replace("_", " ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{log.entityName}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/notifications")}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!notifications || notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No notifications.</div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className={`flex items-start gap-2.5 py-1.5 border-b border-border/50 last:border-0 ${!n.isRead ? "opacity-100" : "opacity-60"}`}>
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
