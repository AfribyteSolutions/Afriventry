import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  BarChart3,
  Bell,
  Box,
  Building2,
  ClipboardList,
  Cpu,
  FileText,
  Globe,
  Package,
  Shield,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const FEATURES = [
  { icon: Package, title: "Inventory Management", desc: "Track stock levels, movements, and low-stock alerts in real time." },
  { icon: Cpu, title: "Asset Tracking", desc: "Manage assets with serial numbers, lifecycle states, and assignments." },
  { icon: ClipboardList, title: "Purchase & Sales Orders", desc: "Full order lifecycle from draft to delivery with auto stock updates." },
  { icon: Warehouse, title: "Multi-Warehouse", desc: "Manage multiple locations with per-warehouse stock levels." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "KPIs, trend charts, and low-stock reports at a glance." },
  { icon: Bell, title: "Notifications", desc: "Real-time alerts for low stock, order events, and asset changes." },
  { icon: Building2, title: "Multi-Tenant", desc: "Isolated organizations with role-based access control." },
  { icon: FileText, title: "Audit Logs", desc: "Complete activity history for compliance and accountability." },
  { icon: Shield, title: "RBAC Security", desc: "Owner, Admin, Manager, Staff, and Viewer roles with fine-grained permissions." },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Box className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Loading Afriventry…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Box className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Afriventry</span>
          </div>
          <Button size="sm" onClick={() => window.location.href = getLoginUrl()}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 border border-primary/20">
            <Globe className="h-3 w-3" />
            Multi-Tenant SaaS Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-5">
            Inventory & Asset<br />
            <span className="text-primary">Management</span> Platform
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A production-ready, multi-tenant system for managing inventory, assets, orders,
            suppliers, and warehouses — with real-time analytics and role-based access control.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button size="lg" className="px-8" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = getLoginUrl()}>
              View Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: "12+", label: "Core Modules" },
              { value: "22", label: "Database Tables" },
              { value: "5", label: "User Roles" },
              { value: "∞", label: "Organizations" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Everything You Need</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A complete suite of tools to manage your entire inventory and asset lifecycle.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group p-5 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-6">Built with</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {["React 19", "TypeScript", "tRPC", "Drizzle ORM", "MySQL", "TailwindCSS", "shadcn/ui", "Recharts"].map((tech) => (
              <span key={tech} className="px-3 py-1 rounded-full bg-background border border-border/60 text-xs font-medium">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <TrendingUp className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold tracking-tight mb-3">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">Sign in to create your organization and start managing your inventory today.</p>
          <Button size="lg" className="px-10" onClick={() => window.location.href = getLoginUrl()}>
            Start for Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
              <Box className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium">Afriventry</span>
          </div>
          <p>Enterprise Inventory & Asset Management Platform for Africa</p>
        </div>
      </footer>
    </div>
  );
}
