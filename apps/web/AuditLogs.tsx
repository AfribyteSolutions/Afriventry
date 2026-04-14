import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgContext } from "@/contexts/OrgContext";
import { trpc } from "@/lib/trpc";
import { FileText } from "lucide-react";
import { useState } from "react";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 border-emerald-200",
  update: "bg-blue-100 text-blue-700 border-blue-200",
  delete: "bg-red-100 text-red-700 border-red-200",
  status_change: "bg-amber-100 text-amber-700 border-amber-200",
  login: "bg-slate-100 text-slate-600 border-slate-200",
};

const MODULES = ["inventory", "assets", "orders", "warehouses", "suppliers", "customers", "settings", "organizations"];

export default function AuditLogsPage() {
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;
  const [moduleFilter, setModuleFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.auditLogs.list.useQuery(
    { organizationId: orgId!, module: moduleFilter || undefined, page, limit: 50 },
    { enabled: !!orgId }
  );

  const logs = data?.logs || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Complete activity history for your organization</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={moduleFilter || "all"} onValueChange={(v) => { setModuleFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULES.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No audit logs found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(({ log, user }) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-primary">
                            {user?.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <span className="text-xs font-medium">{user?.name || "System"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.module}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="text-muted-foreground text-xs">{log.entityType}: </span>
                      <span className="font-medium text-xs">{log.entityName}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 50 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
