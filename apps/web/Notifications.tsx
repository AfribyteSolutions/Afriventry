import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgContext } from "@/contexts/OrgContext";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, string> = {
  low_stock: "⚠️",
  order_received: "📦",
  order_created: "🛒",
  asset_assigned: "🔧",
  system: "ℹ️",
};

export default function NotificationsPage() {
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notifications.list.useQuery(
    { organizationId: orgId!, limit: 50 },
    { enabled: !!orgId }
  );

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const notifications = data?.notifications || [];

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unreadCount ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount && unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate({ organizationId: orgId! })}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <BellOff className="h-12 w-12 opacity-20" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-all ${!n.isRead ? "border-primary/30 bg-primary/5" : "opacity-70"}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.isRead && (
                        <Badge variant="default" className="text-[10px] h-4 px-1.5">New</Badge>
                      )}
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => markReadMutation.mutate({ id: n.id })}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
