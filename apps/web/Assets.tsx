import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useOrgContext } from "@/contexts/OrgContext";
import { trpc } from "@/lib/trpc";
import { Box, Edit, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-100 text-amber-700 border-amber-200",
  retired: "bg-slate-100 text-slate-600 border-slate-200",
  disposed: "bg-red-100 text-red-700 border-red-200",
  lost: "bg-orange-100 text-orange-700 border-orange-200",
};

const CONDITION_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  good: "bg-emerald-100 text-emerald-700 border-emerald-200",
  fair: "bg-amber-100 text-amber-700 border-amber-200",
  poor: "bg-red-100 text-red-700 border-red-200",
};

type AssetForm = {
  name: string;
  assetTag: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  description: string;
  status: string;
  condition: string;
  purchasePrice: string;
  categoryId: string;
  warehouseId: string;
  notes: string;
};

const defaultForm: AssetForm = {
  name: "",
  assetTag: "",
  serialNumber: "",
  model: "",
  manufacturer: "",
  description: "",
  status: "active",
  condition: "good",
  purchasePrice: "",
  categoryId: "",
  warehouseId: "",
  notes: "",
};

export default function AssetsPage() {
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AssetForm>(defaultForm);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.assets.list.useQuery(
    { organizationId: orgId!, search, status: statusFilter as any || undefined, page, limit: 20 },
    { enabled: !!orgId }
  );

  const { data: categories } = trpc.assets.getCategories.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: warehouses } = trpc.warehouses.list.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const createMutation = trpc.assets.create.useMutation({
    onSuccess: () => {
      toast.success("Asset created");
      utils.assets.list.invalidate();
      utils.dashboard.getKPIs.invalidate();
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.assets.update.useMutation({
    onSuccess: () => {
      toast.success("Asset updated");
      utils.assets.list.invalidate();
      setShowForm(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.assets.delete.useMutation({
    onSuccess: () => {
      toast.success("Asset deleted");
      utils.assets.list.invalidate();
      utils.dashboard.getKPIs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!orgId) return;
    const payload = {
      organizationId: orgId,
      name: form.name,
      assetTag: form.assetTag,
      serialNumber: form.serialNumber || undefined,
      model: form.model || undefined,
      manufacturer: form.manufacturer || undefined,
      description: form.description || undefined,
      status: form.status as any,
      condition: form.condition as any,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      warehouseId: form.warehouseId ? parseInt(form.warehouseId) : undefined,
      notes: form.notes || undefined,
    };
    if (editId) {
      updateMutation.mutate({ ...payload, id: editId });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (asset: any) => {
    setEditId(asset.id);
    setForm({
      name: asset.name,
      assetTag: asset.assetTag,
      serialNumber: asset.serialNumber || "",
      model: asset.model || "",
      manufacturer: asset.manufacturer || "",
      description: asset.description || "",
      status: asset.status,
      condition: asset.condition,
      purchasePrice: asset.purchasePrice ? String(asset.purchasePrice) : "",
      categoryId: asset.categoryId ? String(asset.categoryId) : "",
      warehouseId: asset.warehouseId ? String(asset.warehouseId) : "",
      notes: asset.notes || "",
    });
    setShowForm(true);
  };

  const assets = data?.assets || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} total assets</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or tag..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Box className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No assets found.</p>
                    <Button variant="link" size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}>
                      Add your first asset
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map(({ asset, category }) => (
                  <TableRow key={asset.id} className="group">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{asset.name}</p>
                        {asset.model && <p className="text-xs text-muted-foreground">{asset.manufacturer} {asset.model}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{asset.assetTag}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{asset.serialNumber || "—"}</TableCell>
                    <TableCell>
                      {category ? <Badge variant="outline" className="text-xs">{category.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[asset.status] || ""}`}>
                        {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CONDITION_COLORS[asset.condition] || ""}`}>
                        {asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {asset.purchasePrice ? `$${Number(asset.purchasePrice).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(asset)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete asset "${asset.name}"?`)) {
                              deleteMutation.mutate({ id: asset.id, organizationId: orgId! });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditId(null); setForm(defaultForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Asset name" className="mt-1" />
            </div>
            <div>
              <Label>Asset Tag *</Label>
              <Input value={form.assetTag} onChange={(e) => setForm(f => ({ ...f, assetTag: e.target.value }))} placeholder="AST-001" className="mt-1" />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={form.serialNumber} onChange={(e) => setForm(f => ({ ...f, serialNumber: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm(f => ({ ...f, manufacturer: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(categories || []).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warehouse</Label>
              <Select value={form.warehouseId} onValueChange={(v) => setForm(f => ({ ...f, warehouseId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(warehouses || []).map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchase Price ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => setForm(f => ({ ...f, purchasePrice: e.target.value }))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-16 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.assetTag || createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
