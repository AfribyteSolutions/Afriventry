import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OrgProvider } from "./contexts/OrgContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import InventoryPage from "./pages/Inventory";
import AssetsPage from "./pages/Assets";
import WarehousesPage from "./pages/Warehouses";
import PurchaseOrdersPage from "./pages/PurchaseOrders";
import SalesOrdersPage from "./pages/SalesOrders";
import SuppliersPage from "./pages/Suppliers";
import CustomersPage from "./pages/Customers";
import NotificationsPage from "./pages/Notifications";
import AuditLogsPage from "./pages/AuditLogs";
import SettingsPage from "./pages/Settings";
import AnalyticsPage from "./pages/Analytics";
import OrganizationsPage from "./pages/Organizations";

function AppRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/assets" component={AssetsPage} />
        <Route path="/warehouses" component={WarehousesPage} />
        <Route path="/orders/purchase" component={PurchaseOrdersPage} />
        <Route path="/orders/sales" component={SalesOrdersPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/customers" component={CustomersPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/audit-logs" component={AuditLogsPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/settings/organization" component={SettingsPage} />
        <Route path="/organizations/new" component={OrganizationsPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <OrgProvider>
            <AppRoutes />
          </OrgProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
