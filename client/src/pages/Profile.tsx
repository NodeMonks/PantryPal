import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  User,
  Mail,
  Phone,
  ShieldCheck,
  RefreshCcw,
  Store,
  Building2,
  Calendar,
  Crown,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";

interface OrganizationData {
  organization: {
    id: string;
    name: string;
    createdAt: string;
    totalStores: number;
  };
  currentStore: {
    id: string;
    name: string;
    createdAt: string;
  } | null;
  allStores: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  role: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh session");
      setSessionId(data.sessionId || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgData = async () => {
    try {
      setOrgLoading(true);
      const res = await fetch("/api/profile/organization", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setOrgData(data);
      }
    } catch (e: any) {
      console.error("Failed to fetch organization data:", e);
    } finally {
      setOrgLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    fetchOrgData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {" "}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg">
          <User className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Your account details & session info
          </p>
        </div>
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}
      <Card className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Account</h2>
          <Badge className="bg-orange-600 hover:bg-orange-700">
            {user.role.replace(/_/g, " ")}
          </Badge>
        </div>
        <Separator />
        <div className="grid md:grid-cols-2 gap-6">
          <Field
            label="Full Name"
            icon={<User className="h-4 w-4" />}
            value={user.full_name || "—"}
          />
          <Field
            label="Username"
            icon={<User className="h-4 w-4" />}
            value={user.username}
            copyable
          />
          <Field
            label="Email"
            icon={<Mail className="h-4 w-4" />}
            value={user.email}
            copyable
          />
          <Field
            label="Phone"
            icon={<Phone className="h-4 w-4" />}
            value={user.phone || "—"}
          />
          <Field
            label="Role"
            icon={<ShieldCheck className="h-4 w-4" />}
            value={user.role}
          />
          <Field
            label="Active"
            icon={<ShieldCheck className="h-4 w-4" />}
            value={user.is_active ? "Yes" : "No"}
          />
        </div>
      </Card>
      {/* Organization & Store Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Organization</h2>
              <p className="text-xs text-muted-foreground">
                Your business chain
              </p>
            </div>
          </div>
          <Separator />
          {orgLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : orgData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Organization Name
                </label>
                <div className="px-3 py-2 rounded-md border bg-background text-sm font-medium">
                  {orgData.organization.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Store className="h-3 w-3" />
                    Total Stores
                  </label>
                  <div className="px-3 py-2 rounded-md border bg-background text-sm font-semibold text-orange-600">
                    {orgData.organization.totalStores}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Since
                  </label>
                  <div className="px-3 py-2 rounded-md border bg-background text-xs">
                    {new Date(
                      orgData.organization.createdAt
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No organization data available
            </p>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Current Store</h2>
              <p className="text-xs text-muted-foreground">
                Your assigned location
              </p>
            </div>
          </div>
          <Separator />
          {orgLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : orgData?.currentStore ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  Store Name
                </label>
                <div className="px-3 py-2 rounded-md border bg-background text-sm font-medium">
                  {orgData.currentStore.name}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created On
                </label>
                <div className="px-3 py-2 rounded-md border bg-background text-xs">
                  {new Date(
                    orgData.currentStore.createdAt
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No store assigned</p>
          )}
        </Card>
      </div>
      {/* All Stores in Chain */}
      {orgData && orgData.allStores.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Store Chain</h2>
                <p className="text-xs text-muted-foreground">
                  All locations in your organization
                </p>
              </div>
            </div>
            <Badge className="bg-purple-600 hover:bg-purple-700">
              {orgData.allStores.length}{" "}
              {orgData.allStores.length === 1 ? "Store" : "Stores"}
            </Badge>
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orgData.allStores.map((store) => (
              <div
                key={store.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  orgData.currentStore?.id === store.id
                    ? "border-orange-500 bg-orange-50/50"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{store.name}</span>
                  </div>
                  {orgData.currentStore?.id === store.id && (
                    <Badge
                      variant="outline"
                      className="text-xs border-orange-500 text-orange-600"
                    >
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(store.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {/* Subscription Details */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Subscription</h2>
            <p className="text-xs text-muted-foreground">
              Your plan & features
            </p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Current Plan
              </label>
              <div className="px-4 py-3 rounded-lg border-2 border-emerald-500 bg-emerald-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-700">Free Trial</span>
                  <Crown className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <div className="px-4 py-3 rounded-lg border bg-background">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Active</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Expires On
              </label>
              <div className="px-4 py-3 rounded-lg border bg-background">
                <span className="text-sm font-medium">Never</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">
              Features Included
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Unlimited Products</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Inventory Management</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">QR Code Generation</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Expiry Alerts</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Multi-Store Support</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                <Users className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="text-sm">Team Management</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        </div>
      </Card>
      <Card className="p-6 space-y-4">
        {" "}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Session</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />{" "}
            {loading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
        <Separator />
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Session ID
          </label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={sessionId || "(not loaded)"}
              className="font-mono text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(sessionId)}
              disabled={!sessionId}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Used for session identification & debugging.
          </p>
        </div>
      </Card>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  copyable?: boolean;
}

function Field({ label, value, icon, copyable }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </label>
      <div className="flex gap-2 items-center">
        <div
          className="px-3 py-2 rounded-md border bg-background text-sm flex-1 truncate"
          title={value}
        >
          {value}
        </div>
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigator.clipboard.writeText(value)}
            className="h-8 w-8"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
