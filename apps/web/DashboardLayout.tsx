import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Box,
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeft,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { useOrgContext } from "@/contexts/OrgContext";

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { icon: Package, label: "Inventory Items", path: "/inventory" },
      { icon: Box, label: "Assets", path: "/assets" },
      { icon: Warehouse, label: "Warehouses", path: "/warehouses" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { icon: ShoppingCart, label: "Purchase Orders", path: "/orders/purchase" },
      { icon: ClipboardList, label: "Sales Orders", path: "/orders/sales" },
      { icon: Truck, label: "Suppliers", path: "/suppliers" },
      { icon: Users, label: "Customers", path: "/customers" },
    ],
  },
  {
    label: "Reports",
    items: [
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
      { icon: Bell, label: "Notifications", path: "/notifications" },
      { icon: FileText, label: "Audit Logs", path: "/audit-logs" },
    ],
  },
  {
    label: "Administration",
    items: [
      { icon: Building2, label: "Organization", path: "/settings/organization" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Afriventry</span>
            </div>
            <h1 className="text-xl font-semibold text-center">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground text-center">
              Enterprise Inventory & Asset Management Platform for Africa
            </p>
          </div>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="w-full">
            Sign in to Afriventry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { currentOrg, orgs, setCurrentOrg } = useOrgContext();

  // Unread notification count
  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(
    { organizationId: currentOrg?.org.id ?? 0 },
    { enabled: !!currentOrg, refetchInterval: 30000 }
  );

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const isActive = (path: string) => {
    if (path === "/dashboard") return location === "/dashboard" || location === "/";
    return location.startsWith(path);
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/50" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-14 border-b border-border/50">
            <div className="flex items-center gap-2 px-2 h-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Package className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-base tracking-tight truncate">Afriventry</span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Org Switcher */}
          {!isCollapsed && currentOrg && (
            <div className="px-3 py-2 border-b border-border/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm transition-colors">
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-3 w-3 text-primary" />
                    </div>
                    <span className="flex-1 truncate font-medium text-xs">{currentOrg.org.name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Organization</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {orgs.map((o) => (
                    <DropdownMenuItem
                      key={o.org.id}
                      onClick={() => setCurrentOrg(o)}
                      className={`text-sm cursor-pointer ${currentOrg.org.id === o.org.id ? "bg-accent" : ""}`}
                    >
                      {o.org.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/organizations/new")} className="text-sm cursor-pointer text-primary">
                    + New Organization
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Navigation */}
          <SidebarContent className="gap-0 py-2">
            {navGroups.map((group) => (
              <SidebarGroup key={group.label} className="py-0">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-4 py-1.5">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu className="px-2">
                  {group.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 font-normal relative"
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={active ? "font-medium" : ""}>{item.label}</span>
                          {item.path === "/notifications" && unreadCount && unreadCount > 0 ? (
                            <Badge variant="destructive" className="ml-auto h-4 min-w-4 px-1 text-[10px]">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                          ) : null}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors w-full text-left">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">{user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer text-sm">
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive text-sm">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Mobile header */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                  <Package className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm">Inventra</span>
              </div>
            </div>
            <button onClick={() => setLocation("/notifications")} className="relative p-2 rounded-lg hover:bg-accent">
              <Bell className="h-4 w-4" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              ) : null}
            </button>
          </div>
        )}
        <main className="flex-1 min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
