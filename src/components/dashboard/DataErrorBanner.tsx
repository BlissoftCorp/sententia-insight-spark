import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export function DataErrorBanner({ message }: { message: string }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Could not load live data</p>
          <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    </Card>
  );
}

export function NaBadge() {
  return (
    <span
      className="text-xs font-medium text-muted-foreground"
      title="Data source not available yet"
    >
      N/A
    </span>
  );
}
