import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

type OrgMember = {
  org: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    industry: string | null;
    timezone: string | null;
    currency: string | null;
    logoUrl: string | null;
    website: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  };
  member: {
    id: number;
    organizationId: number;
    userId: number;
    role: "owner" | "admin" | "manager" | "staff" | "viewer";
    isActive: boolean;
    invitedBy: number | null;
    joinedAt: Date;
  };
};

type OrgContextType = {
  currentOrg: OrgMember | null;
  orgs: OrgMember[];
  setCurrentOrg: (org: OrgMember) => void;
  isLoading: boolean;
  refetch: () => void;
};

const OrgContext = createContext<OrgContextType>({
  currentOrg: null,
  orgs: [],
  setCurrentOrg: () => {},
  isLoading: true,
  refetch: () => {},
});

const CURRENT_ORG_KEY = "inventra-current-org-id";

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrgState] = useState<OrgMember | null>(null);

  const { data: orgs = [], isLoading, refetch } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (orgs.length > 0 && !currentOrg) {
      const savedId = localStorage.getItem(CURRENT_ORG_KEY);
      const saved = savedId ? orgs.find((o) => o.org.id === parseInt(savedId)) : null;
      setCurrentOrgState((saved || orgs[0]) as OrgMember);
    }
  }, [orgs, currentOrg]);

  const setCurrentOrg = (org: OrgMember) => {
    setCurrentOrgState(org);
    localStorage.setItem(CURRENT_ORG_KEY, String(org.org.id));
  };

  return (
    <OrgContext.Provider value={{ currentOrg, orgs: orgs as OrgMember[], setCurrentOrg, isLoading, refetch }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrgContext() {
  return useContext(OrgContext);
}
