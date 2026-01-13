import React, { useEffect, useState } from "react";
import { JWTAuthProvider, useJWTAuth } from "../contexts/JWTAuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { OrgIdDisplay } from "../components/OrgIdDisplay";

type Role = { id: number; name: string };

function InviteInner() {
  const { accessToken, login, user, orgId: authOrgId, refresh } = useJWTAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "validating" | "sending" | "success"
  >("idle");

  useEffect(() => {
    if (!accessToken) return;
    let ignore = false;
    (async () => {
      async function loadRoles(token: string) {
        const res = await fetch("/rbac/roles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) return null; // signal refresh
        if (!res.ok) {
          // Degrade gracefully on 403/5xx
          return [] as Role[];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
      let data = await loadRoles(accessToken);
      if (data === null) {
        try {
          await refresh();
          const newToken = localStorage.getItem("jwt_access");
          if (newToken) data = await loadRoles(newToken);
        } catch {
          data = [];
        }
      }
      if (!ignore) {
        if (Array.isArray(data)) setRoles(data);
        else setRoles([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [accessToken, refresh]);

  // Auto-fill Org ID from auth context after login
  useEffect(() => {
    if (authOrgId && !orgId) {
      setOrgId(authOrgId);
    }
  }, [authOrgId, orgId]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.message || "Login failed");
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return setError("Please login first");
    if (!orgId) return setError("Org ID is required");
    if (!roleId) return setError("Pick a role");
    if (!fullName.trim()) return setError("Full name required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return setError("Enter a valid email");

    const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(
      /\/$/,
      ""
    );
    const inviteEndpoint = `${apiBase}/api/org/invite`;
    setError(null);
    setStatus("validating");
    setSending(true);

    // Simulate validation delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));
    setStatus("sending");

    const res = await fetch(apiBase ? inviteEndpoint : "/api/org/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        org_id: orgId,
        email,
        role_id: Number(roleId),
        full_name: fullName,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("idle");
      setSending(false);
      return setError(data?.error || "Invite failed");
    }

    setStatus("success");
    setLink(data.link);

    // Reset form after 2 seconds
    setTimeout(() => {
      setSending(false);
      setStatus("idle");
      setEmail("");
      setFullName("");
      setRoleId("");
    }, 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Admin • Send Invite</CardTitle>
            {accessToken && authOrgId && (
              <OrgIdDisplay
                variant="badge"
                showLabel={false}
                orgId={authOrgId}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!accessToken ? (
            <form onSubmit={onLogin} className="space-y-3">
              <div>
                <label className="text-sm">Admin Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          ) : (
            <form onSubmit={onInvite} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Org ID</label>
                  <Input
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="UUID"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm">Invitee Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm">Role</label>
                <Select value={roleId} onValueChange={setRoleId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {roles.length === 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    No assignable roles available. You may lack permission to
                    assign roles.
                  </div>
                )}
              </div>
              <Button type="submit" disabled={sending || roles.length === 0}>
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
            </form>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {link && (
            <div className="text-sm break-all">
              Invitation link:
              <div className="mt-1 p-2 bg-gray-100 rounded">{link}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrgInvite() {
  return (
    <JWTAuthProvider>
      <InviteInner />
    </JWTAuthProvider>
  );
}
