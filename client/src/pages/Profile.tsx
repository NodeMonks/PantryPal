import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, User, Mail, Phone, ShieldCheck, RefreshCcw } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

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

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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

      <Card className="p-6 space-y-4">
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
