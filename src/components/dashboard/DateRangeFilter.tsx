import { useState } from "react";
import { format, isValid, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";

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

/** Parse "YYYY-MM-DD" as a *local* calendar date (avoids the UTC off-by-one shift). */
export function parseLocalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(value);
  return isValid(d) ? d : undefined;
}

/** Human label for the active range, e.g. "Today" or "Oct 1 – Oct 12, 2026". */
export function formatRangeLabel(range: RangeKey, from?: string, to?: string): string {
  if (range !== "custom") return RANGE_LABELS[range];
  const f = parseLocalDate(from);
  const t = parseLocalDate(to);
  if (!f || !t) return RANGE_LABELS.custom;
  return `${format(f, "MMM d")} – ${format(t, "MMM d, yyyy")}`;
}

type FieldProps = {
  label: string;
  value?: Date;
  selected?: Date;
  disabled?: Matcher | Matcher[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (day: Date) => void;
};

function DateField({ label, value, selected, disabled, open, onOpenChange, onSelect }: FieldProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1.5 px-2 font-normal hover:bg-background",
            !value && "text-muted-foreground",
          )}
        >
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="tabular-nums font-medium">
            {value ? format(value, "MMM d") : "Pick"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {selected ? format(selected, "MMM d, yyyy") : "—"}
          </span>
        </div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          disabled={disabled}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangeFilter({ range, from, to, onChange }: Props) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const fromDate = parseLocalDate(from);
  const toDate = parseLocalDate(to);
  const today = startOfDay(new Date());

  const apply = (nextFrom: Date, nextTo: Date) => {
    onChange({
      range: "custom",
      from: format(nextFrom, "yyyy-MM-dd"),
      to: format(nextTo, "yyyy-MM-dd"),
    });
  };

  const handleFrom = (day: Date) => {
    setFromOpen(false);
    // A start after the end pulls the end along; with no end yet, the range is that single day.
    const nextTo = toDate && +toDate < +day ? day : (toDate ?? day);
    apply(day, nextTo);
  };

  const handleTo = (day: Date) => {
    setToOpen(false);
    const nextFrom = fromDate && +fromDate > +day ? day : (fromDate ?? day);
    apply(nextFrom, day);
  };

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

      <div
        className={cn(
          "flex items-center rounded-md border p-1",
          range === "custom" ? "border-primary/50 bg-primary/5" : "border-input",
        )}
      >
        <DateField
          label="Desde"
          value={fromDate}
          selected={fromDate}
          disabled={{ after: today }}
          open={fromOpen}
          onOpenChange={setFromOpen}
          onSelect={handleFrom}
        />
        <span className="px-0.5 text-xs text-muted-foreground">–</span>
        <DateField
          label="Hasta"
          value={toDate}
          selected={toDate}
          disabled={[{ before: fromDate ?? today }, { after: today }]}
          open={toOpen}
          onOpenChange={setToOpen}
          onSelect={handleTo}
        />
      </div>
    </div>
  );
}
