import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export type SendInviteProps = {
  orgId: string | null | undefined;
  className?: string;
  onSuccess?: (link: string) => void;
};

type Role = { id: number; name: string };
type PendingInvite = {
  id: string;
  email: string;
  full_name?: string;
  role_name: string;
  created_at: string;
  expires_at: string;
};

type Status = "idle" | "validating" | "sending" | "success";

export default function SendInvite({
  orgId,
  className,
  onSuccess,
}: SendInviteProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [sending, setSending] = useState(false);
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);

  const orgReady = useMemo(
    () => Boolean(resolvedOrgId && resolvedOrgId.trim().length > 0),
    [resolvedOrgId]
  );

  // Derive assignable roles purely from the logged-in user's role (fallback when fetch fails)
  const deriveRolesFromUser = () => {
    console.log("[SendInvite] deriveRolesFromUser - user role:", user?.role);
    if (!user?.role) return [] as Role[];
    if (
      user.role === "admin" ||
      user.role === "store_manager" ||
      user.role === "owner"
    ) {
      // Matches backend policy: admin/owner -> store_manager, inventory_manager, cashier
      // store_manager -> inventory_manager, cashier
      const allowed =
        user.role === "store_manager"
          ? ["inventory_manager", "cashier"]
          : ["store_manager", "inventory_manager", "cashier"];
      const roles = allowed.map((name, idx) => ({ id: idx + 1, name }));
      console.log("[SendInvite] Derived roles from user:", roles);
      return roles;
    }
    // Other roles: no delegation
    console.log("[SendInvite] User role not eligible for delegation");
    return [] as Role[];
  };

  // Resolve orgId: prefer prop; otherwise fetch /api/org/current using session auth
  useEffect(() => {
    let cancelled = false;

    if (orgId && orgId.trim().length > 0) {
      setResolvedOrgId(orgId.trim());
      return;
    }

    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/org/current", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setResolvedOrgId(data?.orgId ?? null);
      } catch (err) {
        console.error("Failed to resolve orgId", err);
        if (!cancelled) setResolvedOrgId(null);
      }
    };

    fetchOrg();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    if (!orgReady) return;
    let cancelled = false;

    const loadRoles = async () => {
      setLoadingRoles(true);
      // Optimistic: seed roles from current user's role so UI isn't blank while we fetch
      const optimistic = deriveRolesFromUser();
      setRoles(optimistic);
      setError(null);
      try {
        const res = await fetch("/api/rbac/roles", { credentials: "include" });
        if (res.status === 401) {
          throw new Error(
            "Session expired. Your login may have timed out. Please refresh the page and log in again."
          );
        }
        if (res.status === 403) {
          throw new Error("You do not have permission to invite users.");
        }
        if (!res.ok) throw new Error("Failed to load roles");
        const data = await res.json();
        if (!cancelled) setRoles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load roles", err);
        if (!cancelled) {
          // Keep derived roles; surface that server validation failed
          const msg =
            err instanceof Error ? err.message : "Could not load roles.";
          const derived = deriveRolesFromUser();
          setRoles(derived);
          setError(
            derived.length === 0
              ? msg
              : `⚠️ ${msg} Using locally derived roles; invitations may still fail if server permission check disagrees.`
          );
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    const loadPendingInvites = async () => {
      if (!resolvedOrgId) return;
      setLoadingInvites(true);
      try {
        const res = await fetch(
          `/api/org/invites/pending?org_id=${resolvedOrgId}`,
          {
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error("Failed to load pending invites");
        const data = await res.json();
        if (!cancelled) setPendingInvites(data.invites || []);
      } catch (err) {
        console.error("Failed to load pending invites", err);
        if (!cancelled) setError("Could not load pending invites.");
      } finally {
        if (!cancelled) setLoadingInvites(false);
      }
    };

    loadRoles();
    loadPendingInvites();

    return () => {
      cancelled = true;
    };
  }, [resolvedOrgId, orgReady]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgReady) return setError("Organization not ready");
    if (!roleId) return setError("Please select a role");
    if (!fullName.trim()) return setError("Full name is required");
    if (!inviteEmail.trim()) return setError("Email is required");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      return setError("Please enter a valid email address");
    }

    setStatus("validating");
    setSending(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setStatus("sending");

      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role_id: Number(roleId),
          full_name: fullName.trim(),
          // org_id is derived server-side from session; not sent here
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send invite");
      }

      setStatus("success");
      if (onSuccess && data?.link) onSuccess(data.link);

      await refreshPendingInvites();

      setTimeout(() => {
        setSending(false);
        setStatus("idle");
        setInviteEmail("");
        setFullName("");
        setRoleId("");
      }, 400);
    } catch (err: any) {
      console.error("Invite error", err);
      setStatus("idle");
      setSending(false);
      setError(err?.message || "Failed to send invite. Please try again.");
    }
  };

  const refreshPendingInvites = async () => {
    if (!orgReady || !resolvedOrgId) return;
    setLoadingInvites(true);
    try {
      const res = await fetch(
        `/api/org/invites/pending?org_id=${resolvedOrgId}`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to load pending invites");
      const data = await res.json();
      setPendingInvites(data.invites || []);
    } catch (err) {
      console.error("Pending invite reload error", err);
      setError("Could not reload pending invites.");
    } finally {
      setLoadingInvites(false);
    }
  };

  const withdrawInvite = async (inviteId: string) => {
    if (!inviteId) return;
    if (!confirm("Withdraw this invite?")) return;

    try {
      const res = await fetch(`/api/org/invites/${inviteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to withdraw invite");
      await refreshPendingInvites();
    } catch (err: any) {
      console.error("Withdraw error", err);
      setError(err?.message || "Failed to withdraw invite.");
    }
  };

  return (
    <Card className={cn("border", className)}>
      <CardHeader>
        <CardTitle>Invite Employee</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onInvite} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Invitee Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="employee@company.com"
                required
                disabled={sending || !orgReady}
              />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={sending || !orgReady}
              />
            </div>
          </div>
          <div>
            <Label>Role</Label>
            <Select
              value={roleId}
              onValueChange={setRoleId}
              disabled={sending || roles.length === 0 || !orgReady}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingRoles ? "Loading roles..." : "Select role"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roles.length === 0 && !loadingRoles && (
              <div className="text-xs text-muted-foreground mt-1">
                No assignable roles available. You may lack permission.
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={sending || roles.length === 0 || !orgReady}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {status === "validating" && (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Validating...
              </>
            )}
            {status === "sending" && (
              <>
                <span className="inline-block animate-spin mr-2">📧</span>
                Sending invite...
              </>
            )}
            {status === "success" && (
              <>
                <span className="mr-2">✅</span>
                Invite sent!
              </>
            )}
            {status === "idle" && "Send Invite"}
          </Button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Pending invites</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPendingInvites}
              disabled={loadingInvites}
            >
              Refresh
            </Button>
          </div>
          <ScrollArea className="h-40 border rounded-md p-2">
            {loadingInvites ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : pendingInvites.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No pending invites
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-2 border rounded px-2 py-1"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium">{invite.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {invite.role_name} • expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => withdrawInvite(invite.id)}
                    >
                      Withdraw
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
