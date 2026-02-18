import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/hooks/useRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  className?: string;
  /** Show label text next to the icon (hidden on mobile by default) */
  showLabel?: boolean;
}

export function RefreshButton({
  className,
  showLabel = false,
}: RefreshButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refresh, isRefreshing } = useRefresh(user?.org_id);

  const handleRefresh = async () => {
    const hasNewData = await refresh();
    if (hasNewData) {
      toast({
        title: t("common.refreshSuccess"),
        duration: 2000,
      });
    } else {
      toast({
        title: t("common.refreshNoChange"),
        duration: 2000,
      });
    }
  };

  return (
    <Button
      variant={showLabel ? "outline" : "ghost"}
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn(
        "h-8 rounded-lg",
        showLabel
          ? "px-3 gap-1.5 border-border/60 text-foreground hover:bg-accent font-medium"
          : "w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent",
        className,
      )}
      title={t("common.refresh")}
    >
      <RefreshCw
        className={cn("h-3.5 w-3.5 shrink-0", isRefreshing && "animate-spin")}
      />
      {showLabel && <span className="text-sm">{t("common.refresh")}</span>}
    </Button>
  );
}
