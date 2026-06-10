import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RANGE_LABELS, type RangeKey } from "@/lib/mock-analytics";

type Props = {
  range: RangeKey;
  from?: string;
  to?: string;
  onChange: (next: { range: RangeKey; from?: string; to?: string }) => void;
};

const PRESETS: RangeKey[] = ["today", "yesterday", "last7", "thisMonth", "lastMonth", "allTime"];

export function DateRangeFilter({ range, from, to, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected: DateRange | undefined =
    from && to ? { from: new Date(from), to: new Date(to) } : undefined;

  const customLabel =
    from && to ? `${format(new Date(from), "MMM d")} – ${format(new Date(to), "MMM d")}` : "Custom";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((key) => (
        <Button
          key={key}
          variant={range === key ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ range: key })}
        >
          {RANGE_LABELS[key]}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={range === "custom" ? "default" : "outline"}
            size="sm"
            className={cn("gap-2", range !== "custom" && "text-muted-foreground")}
          >
            <CalendarIcon className="h-4 w-4" />
            {range === "custom" ? customLabel : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={selected}
            onSelect={(r) => {
              if (r?.from && r.to) {
                onChange({
                  range: "custom",
                  from: format(r.from, "yyyy-MM-dd"),
                  to: format(r.to, "yyyy-MM-dd"),
                });
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
