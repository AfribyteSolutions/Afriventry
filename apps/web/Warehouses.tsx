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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useOrgContext } from "@/contexts/OrgContext";
import { trpc } from "@/lib/trpc";
import { Edit, MapPin, Plus, Trash2, Warehouse } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type WarehouseForm = {
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

const defaultForm: WarehouseForm = {
  name: "",
  code: "",
  address: "",
  city: "",
  country: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

export default function WarehousesPage() {
  const { currentOrg } = useOrgContext();
  const orgId = currentOrg?.org.id;
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<WarehouseForm>(defaultForm);

  const utils = trpc.useUtils();

  const { data: warehouses, isLoading } = trpc.warehouses.list.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const createMutation = trpc.warehouses.create.useMutation({
    onSuccess: () => {
      toast.success("Warehouse created");
      utils.warehouses.list.invalidate();
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.warehouses.update.useMutation({
    onSuccess: () => {
      toast.success("Warehouse updated");
      utils.warehouses.list.invalidate();
      setShowForm(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.warehouses.delete.useMutation({
    onSuccess: () => {
      toast.success("Warehouse deleted");
      utils.warehouses.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!orgId) return;
    const payload = {
      organizationId: orgId,
      name: form.name,
      code: form.code,
      address: form.address || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      notes: form.notes || undefined,
    };
    if (editId) {
      updateMutation.mutate({ ...payload, id: editId });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (w: any) => {
    setEditId(w.id);
    setForm({
      name: w.name,
      code: w.code,
      address: w.address || "",
      city: w.city || "",
      country: w.country || "",
      contactName: w.contactName || "",
      contactEmail: w.contactEmail || "",
      contactPhone: w.contactPhone || "",
      notes: w.notes || "",
    });
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage storage locations</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !warehouses || warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Warehouse className="h-12 w-12 opacity-20" />
          <p className="text-sm">No warehouses configured yet.</p>
          <Button variant="outline" size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}>
            Add your first warehouse
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w: any) => (
            <Card key={w.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Warehouse className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{w.name}</CardTitle>
                      <p className="text-xs font-mono text-muted-foreground">{w.code}</p>
                    </div>
                  </div>
                  <Badge variant={w.isActive ? "outline" : "secondary"} className="text-xs">
                    {w.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(w.address || w.city || w.country) && (
                  <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="text-xs">
                      {[w.address, w.city, w.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {w.contactName && (
                  <p className="text-xs text-muted-foreground">Contact: {w.contactName}</p>
                )}
                {w.contactEmail && (
                  <p className="text-xs text-muted-foreground">{w.contactEmail}</p>
                )}
                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEdit(w)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete warehouse "${w.name}"?`)) {
                        deleteMutation.mutate({ id: w.id, organizationId: orgId! });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditId(null); setForm(defaultForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Main Warehouse" className="mt-1" />
            </div>
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="WH-001" className="mt-1" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-16 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.code || createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save Changes" : "Create Warehouse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
