import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgContext } from "@/contexts/OrgContext";
import { trpc } from "@/lib/trpc";
import {
  Bar,
  BarChart,
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

const ASSET_STATUS_COLORS: Record<string, string> = {
  active: "#6366f1",
  maintenance: "#f59e0b",
  retired: "#94a3b8",
  disposed: "#ef4444",
  lost: "#f97316",
};

export default function AnalyticsPage() {
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

  const { data: lowStock } = trpc.dashboard.getLowStockAlerts.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  // Process trend data
  const trendData = (() => {
    if (!trend) return [];
    const map: Record<string, { date: string; in: number; out: number }> = {};
    for (const t of trend) {
      if (!map[t.date]) map[t.date] = { date: t.date, in: 0, out: 0 };
      if (t.type === "in" || t.type === "return") map[t.date].in += Number(t.total);
      if (t.type === "out" || t.type === "transfer") map[t.date].out += Number(t.total);
    }
    return Object.values(map);
  })();

  const pieData = (assetDist || []).map((d) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: Number(d.count),
    color: ASSET_STATUS_COLORS[d.status] || "#94a3b8",
  }));

  const lowStockData = (lowStock || []).slice(0, 10).map((item) => ({
    name: item.name.length > 15 ? item.name.slice(0, 15) + "…" : item.name,
    stock: item.currentStock,
    reorderPoint: item.reorderPoint,
  }));

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Comprehensive insights for {currentOrg?.org.name}</p>
      </div>

      {/* Summary KPIs */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Inventory Items", value: kpis?.totalInventoryItems ?? 0, sub: "Active SKUs" },
            { label: "Total Assets", value: kpis?.totalAssets ?? 0, sub: `${kpis?.activeAssets ?? 0} active` },
            { label: "Inventory Value", value: `$${(kpis?.inventoryValue ?? 0).toLocaleString()}`, sub: "At cost" },
            { label: "Low Stock Items", value: kpis?.lowStockCount ?? 0, sub: "Need reorder" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Movement Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stock Movement (30 Days)</CardTitle>
            <CardDescription className="text-xs">Daily stock in vs. out volumes</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : trendData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No movement data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend iconSize={8} />
                  <Bar dataKey="in" name="Stock In" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="out" name="Stock Out" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Asset Status Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Asset Status Distribution</CardTitle>
            <CardDescription className="text-xs">Assets by lifecycle status</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No assets tracked yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend iconSize={8} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Low Stock Items</CardTitle>
            <CardDescription className="text-xs">Current stock vs. reorder point for items below threshold</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">All items are well-stocked.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={lowStockData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend iconSize={8} />
                  <Bar dataKey="stock" name="Current Stock" fill="#6366f1" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="reorderPoint" name="Reorder Point" fill="#ef4444" radius={[0, 2, 2, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
