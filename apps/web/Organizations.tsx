import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Building2, Plus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-indigo-100 text-indigo-700 border-indigo-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  staff: "bg-slate-100 text-slate-600 border-slate-200",
  viewer: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function OrganizationsPage() {
  const { currentOrg, orgs, setCurrentOrg, refetch } = useOrgContext();
  const orgId = currentOrg?.org.id;

  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "", slug: "", description: "" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "staff" as const });

  const utils = trpc.useUtils();

  const { data: members, isLoading: membersLoading } = trpc.organizations.getMembers.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  const createOrgMutation = trpc.organizations.create.useMutation({
    onSuccess: () => {
      toast.success("Organization created");
      refetch();
      setShowCreateOrg(false);
      setOrgForm({ name: "", slug: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Note: inviteMember, updateMemberRole, removeMember are not yet in the backend router
  // Using addMember for now; invite/remove/update-role are placeholders
  const inviteMutation = trpc.organizations.addMember.useMutation({
    onSuccess: () => {
      toast.success("Member added");
      utils.organizations.getMembers.invalidate();
      setShowInvite(false);
      setInviteForm({ email: "", role: "staff" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCreateOrg = () => {
    createOrgMutation.mutate({
      name: orgForm.name,
      slug: orgForm.slug,
      description: orgForm.description || undefined,
    });
  };

  const handleInvite = () => {
    if (!orgId) return;
    // Note: In production, this would look up user by email; using placeholder userId
    toast.info("Invite by email requires email lookup - feature coming soon");
    setShowInvite(false);
  };

  const currentMemberRole = currentOrg?.member.role;
  const canManageMembers = currentMemberRole === "owner" || currentMemberRole === "admin";

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Organizations
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your organizations and team members</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateOrg(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Organization Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map(({ org, member }) => (
          <Card
            key={org.id}
            className={`cursor-pointer transition-all hover:shadow-md ${currentOrg?.org.id === org.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setCurrentOrg({ org, member })}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[member.role] || ""}`}>
                  {member.role}
                </span>
              </div>
              {org.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{org.description}</p>
              )}
              {currentOrg?.org.id === org.id && (
                <Badge variant="default" className="mt-2 text-[10px] h-4 px-1.5">Current</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Members */}
      {currentOrg && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members — {currentOrg.org.name}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">{members?.length || 0} members</CardDescription>
              </div>
              {canManageMembers && (
                <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManageMembers && <TableHead className="w-28">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : (members || []).map(({ member, user }) => (
                  <TableRow key={member.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">{user?.name?.charAt(0).toUpperCase() || "?"}</span>
                        </div>
                        <span className="text-sm font-medium">{user?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user?.email || "—"}</TableCell>
                    <TableCell>
                      {canManageMembers && member.role !== "owner" ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => toast.info("Role update coming soon")}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["admin", "manager", "staff", "viewer"].map(r => (
                              <SelectItem key={r} value={r} className="text-xs">{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[member.role] || ""}`}>
                          {member.role}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        {member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => toast.info("Member removal coming soon")}
                          >
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Organization Dialog */}
      <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Organization Name *</Label>
              <Input value={orgForm.name} onChange={(e) => {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                setOrgForm(f => ({ ...f, name: e.target.value, slug }));
              }} className="mt-1" />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={orgForm.slug} onChange={(e) => setOrgForm(f => ({ ...f, slug: e.target.value }))} className="mt-1 font-mono text-sm" placeholder="my-organization" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={orgForm.description} onChange={(e) => setOrgForm(f => ({ ...f, description: e.target.value }))} className="mt-1 h-16 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateOrg(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={!orgForm.name || !orgForm.slug || createOrgMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Email Address *</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm(f => ({ ...f, role: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["admin", "manager", "staff", "viewer"].map(r => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteForm.email || inviteMutation.isPending}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
