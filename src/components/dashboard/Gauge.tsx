/** Circular gauge showing a 0-100 percentage. */
export function ActivationGauge({ value }: { value: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const frac = Math.min(100, Math.max(0, value)) / 100;

  return (
    <div className="relative flex h-full min-h-[180px] items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${frac * c} ${c}`}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-semibold tracking-tight">{value.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">Tasa global</p>
      </div>
    </div>
  );
}
