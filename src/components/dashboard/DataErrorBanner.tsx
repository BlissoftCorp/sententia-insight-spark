import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function DataErrorBanner({ message }: { message: string }) {
  const queryClient = useQueryClient();
  return (
    <Card className="border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">No se pudieron cargar los datos de Sententia</p>
          <p className="mt-1 text-xs text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => queryClient.invalidateQueries()}>Reintentar</Button>
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
