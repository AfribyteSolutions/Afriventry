import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useOrgContext } from "@/contexts/OrgContext";
import { trpc } from "@/lib/trpc";
import { Building2, Settings2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { currentOrg, refetch: refetchOrgs } = useOrgContext();
  const orgId = currentOrg?.org.id;

  const [orgForm, setOrgForm] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    currency: "USD",
    timezone: "UTC",
  });

  const [notifSettings, setNotifSettings] = useState({
    lowStockAlerts: true,
    emailNotifications: true,
    autoReorder: false,
  });

  useEffect(() => {
    if (currentOrg?.org) {
      const o = currentOrg.org;
      setOrgForm({
        name: o.name || "",
        description: o.description || "",
        website: o.website || "",
        industry: o.industry || "",
        currency: o.currency || "USD",
        timezone: o.timezone || "UTC",
      });
    }
  }, [currentOrg]);

  const { data: orgSettings } = trpc.settings.getOrgSettings.useQuery(
    { organizationId: orgId! },
    {
      enabled: !!orgId,
      onSuccess: (data: any) => {
        if (data) {
          setNotifSettings({
            lowStockAlerts: data.lowStockAlerts ?? true,
            emailNotifications: data.emailNotifications ?? true,
            autoReorder: data.autoReorder ?? false,
          });
        }
      },
    } as any
  );

  const updateProfileMutation = trpc.settings.updateOrgProfile.useMutation({
    onSuccess: () => {
      toast.success("Organization profile saved");
      refetchOrgs();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSettingsMutation = trpc.settings.updateOrgSettings.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError: (e: any) => toast.error(e.message),
  });

  const handleProfileSave = () => {
    if (!orgId) return;
    updateProfileMutation.mutate({
      organizationId: orgId,
      name: orgForm.name || undefined,
      description: orgForm.description || undefined,
      website: orgForm.website || undefined,
      industry: orgForm.industry || undefined,
      currency: orgForm.currency || undefined,
      timezone: orgForm.timezone || undefined,
    });
  };

  const handleNotifSave = () => {
    if (!orgId) return;
    updateSettingsMutation.mutate({
      organizationId: orgId,
      lowStockAlerts: notifSettings.lowStockAlerts,
      emailNotifications: notifSettings.emailNotifications,
      autoReorder: notifSettings.autoReorder,
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your organization configuration</p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Notifications & Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization Profile</CardTitle>
              <CardDescription className="text-xs">Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Organization Name *</Label>
                  <Input value={orgForm.name} onChange={(e) => setOrgForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea value={orgForm.description} onChange={(e) => setOrgForm(f => ({ ...f, description: e.target.value }))} className="mt-1 h-16 resize-none" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={orgForm.website} onChange={(e) => setOrgForm(f => ({ ...f, website: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input value={orgForm.industry} onChange={(e) => setOrgForm(f => ({ ...f, industry: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={orgForm.currency} onChange={(e) => setOrgForm(f => ({ ...f, currency: e.target.value }))} className="mt-1" placeholder="USD" />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Input value={orgForm.timezone} onChange={(e) => setOrgForm(f => ({ ...f, timezone: e.target.value }))} className="mt-1" placeholder="UTC" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleProfileSave} disabled={updateProfileMutation.isPending}>
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription className="text-xs">Configure which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: "lowStockAlerts" as const,
                  label: "Low Stock Alerts",
                  description: "Get notified when items fall below reorder point",
                },
                {
                  key: "emailNotifications" as const,
                  label: "Email Notifications",
                  description: "Receive email updates for important events",
                },
                {
                  key: "autoReorder" as const,
                  label: "Auto Reorder Suggestions",
                  description: "Automatically suggest reorder when stock is low",
                },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{setting.label}</p>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    checked={notifSettings[setting.key]}
                    onCheckedChange={(v) => setNotifSettings(s => ({ ...s, [setting.key]: v }))}
                  />
                </div>
              ))}

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleNotifSave} disabled={updateSettingsMutation.isPending}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
