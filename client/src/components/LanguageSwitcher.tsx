import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLangCode } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  /** compact — just a globe icon button (for the navbar) */
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  compact = false,
  className,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES[0];

  const changeLanguage = (code: SupportedLangCode) => {
    i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg",
              className,
            )}
            aria-label="Switch language"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-xs font-medium">
              {current.nativeLabel}
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn("flex items-center gap-2", className)}
          >
            <Globe className="h-4 w-4" />
            <span>
              {current.flag} {current.nativeLabel}
            </span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 pb-1">
          Language / भाषा / மொழி
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
              i18n.language === lang.code &&
                "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium",
            )}
          >
            <span className="text-base">{lang.flag}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-sm leading-tight">{lang.nativeLabel}</span>
              {lang.code !== "en" && (
                <span className="text-[10px] text-muted-foreground">
                  {lang.label}
                </span>
              )}
            </div>
            {i18n.language === lang.code && (
              <span className="ml-auto text-orange-500 text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
