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
import { ClipboardList, Eye, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  shipped: "bg-purple-100 text-purple-700 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  returned: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function SalesOrdersPage() {
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [form, setForm] = useState({ customerId: "", warehouseId: "", notes: "", shippingAddress: "", requiredDate: "" });
  const [lineItems, setLineItems] = useState<{ itemId: string; quantity: string; unitPrice: string }[]>([
    { itemId: "", quantity: "1", unitPrice: "0" },
  ]);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.orders.listSalesOrders.useQuery(
    { organizationId: orgId!, status: statusFilter as any || undefined, page, limit: 20 },
    { enabled: !!orgId }
  );

  const { data: customers } = trpc.customers.list.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: warehouses } = trpc.warehouses.list.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const { data: inventoryItems } = trpc.inventory.list.useQuery(
    { organizationId: orgId!, limit: 200 },
    { enabled: !!orgId }
  );

  const createMutation = trpc.orders.createSalesOrder.useMutation({
    onSuccess: () => {
      toast.success("Sales order created");
      utils.orders.listSalesOrders.invalidate();
      utils.dashboard.getKPIs.invalidate();
      setShowForm(false);
      setForm({ customerId: "", warehouseId: "", notes: "", shippingAddress: "", requiredDate: "" });
      setLineItems([{ itemId: "", quantity: "1", unitPrice: "0" }]);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.orders.updateSalesOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.orders.listSalesOrders.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!orgId) return;
    const validItems = lineItems.filter(l => l.itemId && parseInt(l.quantity) > 0);
    if (validItems.length === 0) { toast.error("Add at least one line item"); return; }
    createMutation.mutate({
      organizationId: orgId,
      customerId: form.customerId ? parseInt(form.customerId) : undefined,
      warehouseId: form.warehouseId ? parseInt(form.warehouseId) : undefined,
      notes: form.notes || undefined,
      shippingAddress: form.shippingAddress || undefined,
      requiredDate: form.requiredDate ? new Date(form.requiredDate) : undefined,
      items: validItems.map(l => ({
        itemId: parseInt(l.itemId),
        quantity: parseInt(l.quantity),
        unitPrice: parseFloat(l.unitPrice) || 0,
      })),
    });
  };

  const orders = data?.orders || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} total orders</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Sales Order
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["draft", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SO Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Required Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No sales orders yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map(({ order, customer }) => (
                  <TableRow key={order.id} className="group">
                    <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-sm">{customer?.name || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status] || ""}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">${Number(order.totalAmount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.requiredDate ? new Date(order.requiredDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewOrder({ order, customer })}>
                          <Eye className="h-3.5 w-3.5" />
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

      {/* Create SO Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Sales Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm(f => ({ ...f, customerId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Customer</SelectItem>
                    {(customers?.customers || []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Warehouse</Label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm(f => ({ ...f, warehouseId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select warehouse..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Warehouse</SelectItem>
                    {(warehouses || []).map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Required Date</Label>
                <Input type="date" value={form.requiredDate} onChange={(e) => setForm(f => ({ ...f, requiredDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Shipping Address</Label>
                <Input value={form.shippingAddress} onChange={(e) => setForm(f => ({ ...f, shippingAddress: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setLineItems(l => [...l, { itemId: "", quantity: "1", unitPrice: "0" }])}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select value={line.itemId} onValueChange={(v) => {
                        const items = inventoryItems?.items || [];
                        const item = items.find((i: any) => String(i.item.id) === v);
                        const price = item ? String(item.item.sellingPrice || 0) : "0";
                        setLineItems(l => l.map((li, i) => i === idx ? { ...li, itemId: v, unitPrice: price } : li));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                        <SelectContent>
                          {(inventoryItems?.items || []).map(({ item }: any) => (
                            <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" value={line.quantity} onChange={(e) => setLineItems(l => l.map((li, i) => i === idx ? { ...li, quantity: e.target.value } : li))} placeholder="Qty" />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => setLineItems(l => l.map((li, i) => i === idx ? { ...li, unitPrice: e.target.value } : li))} placeholder="Unit price" />
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-medium">${(parseFloat(line.unitPrice || "0") * parseInt(line.quantity || "0")).toFixed(2)}</span>
                    </div>
                    {lineItems.length > 1 && (
                      <button className="col-span-12 text-xs text-destructive hover:underline text-right" onClick={() => setLineItems(l => l.filter((_, i) => i !== idx))}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t">
                <span className="text-sm font-semibold">
                  Total: ${lineItems.reduce((sum, l) => sum + (parseFloat(l.unitPrice || "0") * parseInt(l.quantity || "0")), 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-16 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>Create Sales Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      {viewOrder && (
        <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sales Order: {viewOrder.order.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {viewOrder.customer?.name || "—"}</div>
                <div><span className="text-muted-foreground">Status:</span>
                  <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[viewOrder.order.status] || ""}`}>
                    {viewOrder.order.status}
                  </span>
                </div>
                <div><span className="text-muted-foreground">Total:</span> <strong>${Number(viewOrder.order.totalAmount).toFixed(2)}</strong></div>
              </div>
              {viewOrder.order.notes && <p className="text-sm text-muted-foreground">{viewOrder.order.notes}</p>}
              <div>
                <Label className="text-xs">Update Status</Label>
                <Select
                  value={viewOrder.order.status}
                  onValueChange={(v) => {
                    updateStatusMutation.mutate({ id: viewOrder.order.id, organizationId: orgId!, status: v as any });
                    setViewOrder((prev: any) => ({ ...prev, order: { ...prev.order, status: v } }));
                  }}
                >
                  <SelectTrigger className="mt-1 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"].map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewOrder(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
