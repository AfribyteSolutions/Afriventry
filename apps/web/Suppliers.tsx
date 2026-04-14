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
import { Edit, Plus, Search, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SupplierForm = { name: string; code: string; email: string; phone: string; address: string; city: string; country: string; contactName: string; notes: string; };
const defaultForm: SupplierForm = { name: "", code: "", email: "", phone: "", address: "", city: "", country: "", contactName: "", notes: "" };

export default function SuppliersPage() {
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierForm>(defaultForm);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.suppliers.list.useQuery(
    { organizationId: orgId!, search, page, limit: 20 },
    { enabled: !!orgId }
  );

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => { toast.success("Supplier created"); utils.suppliers.list.invalidate(); setShowForm(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => { toast.success("Supplier updated"); utils.suppliers.list.invalidate(); setShowForm(false); setEditId(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => { toast.success("Supplier deleted"); utils.suppliers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!orgId) return;
    const payload = { organizationId: orgId, name: form.name, code: form.code, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, city: form.city || undefined, country: form.country || undefined, contactName: form.contactName || undefined, notes: form.notes || undefined };
    if (editId) { updateMutation.mutate({ ...payload, id: editId }); }
    else { createMutation.mutate(payload); }
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, code: s.code, email: s.email || "", phone: s.phone || "", address: s.address || "", city: s.city || "", country: s.country || "", contactName: s.contactName || "", notes: s.notes || "" });
    setShowForm(true);
  };

  const suppliers = data?.suppliers || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} total suppliers</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No suppliers yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((s: any) => (
                  <TableRow key={s.id} className="group">
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="text-sm">{s.contactName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.phone || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{[s.city, s.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate({ id: s.id, organizationId: orgId! }); }}>
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

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditId(null); setForm(defaultForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SUP-001" className="mt-1" /></div>
            <div><Label>Contact Name</Label><Input value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} className="mt-1" /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className="mt-1" /></div>
            <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} className="mt-1" /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-16 resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.code || createMutation.isPending || updateMutation.isPending}>{editId ? "Save Changes" : "Create Supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
