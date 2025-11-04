import { useEffect, useState } from "react";
import { Copy, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useJWTAuth } from "@/contexts/JWTAuthContext";

interface OrgIdDisplayProps {
  orgId?: string | null;
  variant?: "inline" | "card" | "badge";
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

/**
 * Reusable component to display organization ID with copy functionality
 *
 * @param orgId - Organization ID to display (if not provided, will fetch from context)
 * @param variant - Display style: "inline", "card", or "badge"
 * @param showLabel - Whether to show "Organization ID" label
 * @param showIcon - Whether to show building icon
 * @param className - Additional CSS classes
 */
export function OrgIdDisplay({
  orgId: propOrgId,
  variant = "inline",
  showLabel = true,
  showIcon = true,
  className = "",
}: OrgIdDisplayProps) {
  const [orgId, setOrgId] = useState<string | null>(propOrgId || null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to get orgId from JWT context (if wrapped in JWTAuthProvider)
  let jwtOrgId: string | null = null;

  try {
    const jwtAuth = useJWTAuth();
    jwtOrgId = jwtAuth?.orgId ?? null;
  } catch {
    // Not wrapped in JWTAuthProvider, that's ok
  }

  useEffect(() => {
    console.log("[OrgIdDisplay] Effect triggered", { propOrgId, jwtOrgId });

    // Priority: 1. Prop orgId, 2. JWT orgId from context, 3. Fetch from API
    if (propOrgId) {
      console.log("[OrgIdDisplay] Using prop orgId:", propOrgId);
      setOrgId(propOrgId);
      setLoading(false);
      return;
    }

    if (jwtOrgId) {
      console.log("[OrgIdDisplay] Using JWT orgId:", jwtOrgId);
      setOrgId(jwtOrgId);
      setLoading(false);
      return;
    }

    // Try fetching from session-based endpoint
    console.log("[OrgIdDisplay] Fetching from /api/org/current");
    setLoading(true);
    setError(null);
    fetch("/api/org/current", { credentials: "include" })
      .then((r) => {
        console.log("[OrgIdDisplay] Response status:", r.status);
        return r.ok ? r.json() : Promise.resolve({ orgId: null });
      })
      .then((d) => {
        console.log("[OrgIdDisplay] Response data:", d);
        setOrgId(d?.orgId ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[OrgIdDisplay] Fetch error:", err);
        setError(err.message);
        setOrgId(null);
        setLoading(false);
      });
  }, [propOrgId, jwtOrgId]);

  const copyToClipboard = async () => {
    if (!orgId) return;

    try {
      await navigator.clipboard.writeText(orgId);
      setCopied(true);
      toast.success("Organization ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (loading) {
    console.log("[OrgIdDisplay] Rendering loading state");
    return (
      <div
        className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Loading Org ID...</span>
      </div>
    );
  }

  if (error) {
    console.log("[OrgIdDisplay] Rendering error state:", error);
    return (
      <div className={`text-xs text-red-500 ${className}`}>
        Error loading org ID
      </div>
    );
  }

  if (!orgId) {
    console.log("[OrgIdDisplay] No orgId, showing placeholder");
    // Show a placeholder instead of returning null for debugging
    return (
      <div className={`text-xs text-orange-500 italic ${className}`}>
        No Org ID found
      </div>
    );
  }

  console.log("[OrgIdDisplay] Rendering with orgId:", orgId);

  // Shorten long UUIDs for display
  const shortId =
    orgId.length > 16 ? `${orgId.slice(0, 8)}...${orgId.slice(-8)}` : orgId;

  // Inline variant (compact, for headers/toolbars)
  if (variant === "inline") {
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        {showIcon && <Building2 className="h-4 w-4 text-muted-foreground" />}
        {showLabel && (
          <span className="text-muted-foreground font-medium">Org ID:</span>
        )}
        <code className="px-2 py-1 rounded bg-muted text-foreground font-mono text-xs">
          {shortId}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="h-7 px-2"
          title={copied ? "Copied!" : "Copy Organization ID"}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  }

  // Badge variant (minimal, just the ID)
  if (variant === "badge") {
    return (
      <Badge
        variant="secondary"
        className={`gap-2 cursor-pointer hover:bg-secondary/80 ${className}`}
        onClick={copyToClipboard}
      >
        {showIcon && <Building2 className="h-3 w-3" />}
        <span className="font-mono text-xs">{shortId}</span>
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Badge>
    );
  }

  // Card variant (full display with details)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {showIcon && <Building2 className="h-5 w-5" />}
          Organization ID
        </CardTitle>
        <CardDescription>
          Use this ID when sending invitations or for API integrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-3 py-2 rounded-md bg-muted text-foreground font-mono text-sm border">
            {orgId}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
