import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

// ─── Stat Grid Skeleton ───────────────────────────────────────────────────────
export function StatGridSkeleton({
  cols = 4,
  className,
}: {
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "md:grid-cols-2",
        cols === 3 && "md:grid-cols-3",
        cols === 4 && "md:grid-cols-4",
        cols === 5 && "md:grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton
            className="h-4 w-full"
            style={{ maxWidth: `${60 + Math.random() * 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────
export function TableSkeleton({
  rows = 5,
  cols = 4,
  headers,
}: {
  rows?: number;
  cols?: number;
  headers?: string[];
}) {
  const colCount = headers ? headers.length : cols;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {(headers ?? Array.from({ length: colCount })).map((header, i) => (
              <th key={i} className="h-11 px-4 text-left">
                {header ? (
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {header as string}
                  </span>
                ) : (
                  <Skeleton className="h-3 w-20" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b">
              {Array.from({ length: colCount }).map((__, colIdx) => (
                <td key={colIdx} className="p-4">
                  <Skeleton
                    className="h-4"
                    style={{
                      width: `${50 + ((rowIdx * 7 + colIdx * 13) % 40)}%`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Card Table Skeleton ──────────────────────────────────────────────────────
// A Card wrapping a TableSkeleton — the most common pattern in the app.
export function CardTableSkeleton({
  title,
  rows = 5,
  cols = 4,
  headers,
}: {
  title?: string;
  rows?: number;
  cols?: number;
  headers?: string[];
}) {
  return (
    <Card>
      <CardHeader>
        {title ? (
          <p className="font-semibold text-foreground">{title}</p>
        ) : (
          <Skeleton className="h-5 w-32" />
        )}
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={rows} cols={cols} headers={headers} />
      </CardContent>
    </Card>
  );
}

// ─── Page Header Skeleton ─────────────────────────────────────────────────────
export function PageHeaderSkeleton({
  showAction = false,
}: {
  showAction?: boolean;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      {showAction && <Skeleton className="h-10 w-32" />}
    </div>
  );
}

// ─── Chart Skeleton ───────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36 mb-1" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// ─── Full Page Loading Skeleton ───────────────────────────────────────────────
// A convenient composed skeleton for the most common page layout.
export function PageLoadingSkeleton({
  statCols = 4,
  tableRows = 6,
  tableCols = 4,
  showAction = true,
  showCharts = false,
}: {
  statCols?: number;
  tableRows?: number;
  tableCols?: number;
  showAction?: boolean;
  showCharts?: boolean;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeaderSkeleton showAction={showAction} />
      <StatGridSkeleton cols={statCols} />
      {showCharts && (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      )}
      <CardTableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}
