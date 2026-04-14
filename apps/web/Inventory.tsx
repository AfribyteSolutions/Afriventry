import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertTriangle, Edit, Package, Plus, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ItemForm = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  reorderPoint: string;
  reorderQty: string;
  categoryId: string;
};

const defaultForm: ItemForm = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  unit: "pcs",
  costPrice: "0",
  sellingPrice: "0",
  reorderPoint: "0",
  reorderQty: "0",
  categoryId: "",
};

export default function InventoryPage() {
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>(defaultForm);
  const [showMovement, setShowMovement] = useState(false);
  const [movementForm, setMovementForm] = useState({ itemId: 0, warehouseId: 0, type: "in", quantity: "1", notes: "" });

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.inventory.list.useQuery(
    { organizationId: orgId!, search, page, limit: 20 },
    { enabled: !!orgId }
  );

  const { data: categories } = trpc.inventory.getCategories.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: warehouses } = trpc.warehouses.list.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: lowStock } = trpc.inventory.getLowStock.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: () => {
      toast.success("Item created successfully");
      utils.inventory.list.invalidate();
      utils.dashboard.getKPIs.invalidate();
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated successfully");
      utils.inventory.list.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      utils.inventory.list.invalidate();
      utils.dashboard.getKPIs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const movementMutation = trpc.inventory.recordMovement.useMutation({
    onSuccess: () => {
      toast.success("Stock movement recorded");
      utils.inventory.list.invalidate();
      utils.dashboard.getKPIs.invalidate();
      utils.dashboard.getInventoryTrend.invalidate();
      setShowMovement(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!orgId) return;
    const payload = {
      organizationId: orgId,
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      unit: form.unit,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      reorderPoint: parseInt(form.reorderPoint) || 0,
      reorderQty: parseInt(form.reorderQty) || 0,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
    };
    if (editId) {
      updateMutation.mutate({ ...payload, id: editId });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || "",
      description: item.description || "",
      unit: item.unit || "pcs",
      costPrice: String(item.costPrice || 0),
      sellingPrice: String(item.sellingPrice || 0),
      reorderPoint: String(item.reorderPoint || 0),
      reorderQty: String(item.reorderQty || 0),
      categoryId: item.categoryId ? String(item.categoryId) : "",
    });
    setShowForm(true);
  };

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} total items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowMovement(true); setMovementForm({ itemId: 0, warehouseId: 0, type: "in", quantity: "1", notes: "" }); }}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Record Movement
          </Button>
          <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Low Stock Banner */}
      {lowStock && lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{lowStock.length} items</strong> are below reorder point:{" "}
              {lowStock.slice(0, 3).map((i) => i.name).join(", ")}
              {lowStock.length > 3 ? ` and ${lowStock.length - 3} more` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Sell Price</TableHead>
                <TableHead className="text-right">Reorder Pt.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No inventory items found.</p>
                    <Button variant="link" size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}>
                      Add your first item
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                items.map(({ item, category }) => {
                  const isLow = lowStock?.some((l) => l.id === item.id);
                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.barcode && <p className="text-xs text-muted-foreground">{item.barcode}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell>
                        {category ? (
                          <Badge variant="outline" className="text-xs">{category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{item.unit}</TableCell>
                      <TableCell className="text-right text-sm">${Number(item.costPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">${Number(item.sellingPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={isLow ? "text-amber-600 font-medium" : ""}>{item.reorderPoint}</span>
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete "${item.name}"?`)) {
                                deleteMutation.mutate({ id: item.id, organizationId: orgId! });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
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
            <DialogTitle>{editId ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Item name" className="mt-1" />
            </div>
            <div>
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" className="mt-1" />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pcs", "kg", "g", "lbs", "oz", "m", "cm", "L", "mL", "box", "carton", "pair", "set"].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
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
              <Label>Cost Price ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm(f => ({ ...f, costPrice: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Selling Price ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm(f => ({ ...f, sellingPrice: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Reorder Point</Label>
              <Input type="number" min="0" value={form.reorderPoint} onChange={(e) => setForm(f => ({ ...f, reorderPoint: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Reorder Qty</Label>
              <Input type="number" min="0" value={form.reorderQty} onChange={(e) => setForm(f => ({ ...f, reorderQty: e.target.value }))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="mt-1 h-20 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.sku || createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Movement Dialog */}
      <Dialog open={showMovement} onOpenChange={setShowMovement}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Item *</Label>
              <Select value={String(movementForm.itemId || "")} onValueChange={(v) => setMovementForm(f => ({ ...f, itemId: parseInt(v) }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select item..." /></SelectTrigger>
                <SelectContent>
                  {items.map(({ item }) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warehouse *</Label>
              <Select value={String(movementForm.warehouseId || "")} onValueChange={(v) => setMovementForm(f => ({ ...f, warehouseId: parseInt(v) }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select warehouse..." /></SelectTrigger>
                <SelectContent>
                  {(warehouses || []).map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Movement Type *</Label>
              <Select value={movementForm.type} onValueChange={(v) => setMovementForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In (Receive)</SelectItem>
                  <SelectItem value="out">Stock Out (Issue)</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={movementForm.quantity} onChange={(e) => setMovementForm(f => ({ ...f, quantity: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={movementForm.notes} onChange={(e) => setMovementForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-16 resize-none" placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovement(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!movementForm.itemId || !movementForm.warehouseId || !orgId) return;
                movementMutation.mutate({
                  organizationId: orgId,
                  itemId: movementForm.itemId,
                  warehouseId: movementForm.warehouseId,
                  type: movementForm.type as any,
                  quantity: parseInt(movementForm.quantity),
                  notes: movementForm.notes || undefined,
                });
              }}
              disabled={!movementForm.itemId || !movementForm.warehouseId || movementMutation.isPending}
            >
              Record Movement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
