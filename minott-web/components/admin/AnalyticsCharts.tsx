import { cn } from "@/lib/cn";

// Categorical palette for the inquiry-type series. Validated (dataviz six
// checks) against the white card surface — see the 2026-07-31 analytics spec.
export const TYPE_SERIES = [
  { key: "quotes", label: "Quotes", color: "#E10600" },
  { key: "samples", label: "Samples", color: "#2a78d6" },
  { key: "contacts", label: "Contact", color: "#b45309" },
] as const;

// Ordinal ink ramp for the status pipeline (dark = needs attention).
export const STATUS_SERIES = [
  { key: "NEW", label: "New", color: "#0D0D0D" },
  { key: "IN_PROGRESS", label: "In progress", color: "#6b6b6b" },
  { key: "CLOSED", label: "Closed", color: "#a3a3a3" },
] as const;

const NUMBER = new Intl.NumberFormat("en-US");

export function StatTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  /** Signed change vs the previous period; omit to hide. */
  delta?: number | null;
}) {
  return (
    <div className="rounded-md border border-black/10 bg-mec-pure p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/60">
        {label}
      </p>
      <p className="mt-2 font-display-tight text-4xl text-mec-ink">
        {NUMBER.format(value)}
      </p>
      {delta != null && (
        <p
          className={cn(
            "mt-1 text-xs font-semibold",
            delta > 0 && "text-emerald-700",
            delta < 0 && "text-mec-red",
            delta === 0 && "text-mec-ink/50",
          )}
        >
          {delta === 0 ? (
            "— no change"
          ) : (
            <>
              <span aria-hidden>{delta > 0 ? "▲" : "▼"}</span>{" "}
              {delta > 0 ? "+" : ""}
              {NUMBER.format(delta)} vs prev. period
            </>
          )}
        </p>
      )}
    </div>
  );
}

export function HBarList({
  items,
}: {
  items: { label: string; value: number; detail?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold text-mec-ink">
              {item.label}
            </p>
            {item.detail && (
              <p className="shrink-0 text-xs text-mec-ink/55">{item.detail}</p>
            )}
          </div>
          {/* Bar scale reserves 2.5rem for the tip label so the longest bar
              is never flex-shrunk and the scale stays linear. */}
          <div className="relative mt-1 h-5 border-l border-black/20">
            <div
              className="h-5 rounded-r-[4px] bg-mec-red"
              style={{ width: `calc(${item.value / max} * (100% - 2.5rem))` }}
            />
            <span
              className="absolute top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums text-mec-ink"
              style={{ left: `calc(${item.value / max} * (100% - 2.5rem) + 8px)` }}
            >
              {NUMBER.format(item.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SeriesLegend({
  series,
}: {
  series: readonly { label: string; color: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      {series.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5 text-xs text-mec-ink/70">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
          {s.count != null && (
            <span className="font-semibold text-mec-ink">
              {NUMBER.format(s.count)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

const PLOT_HEIGHT = 160;

export function StackedTrend({
  buckets,
}: {
  buckets: { label: string; quotes: number; samples: number; contacts: number }[];
}) {
  const max = Math.max(1, ...buckets.map((b) => b.quotes + b.samples + b.contacts));
  return (
    <div>
      <SeriesLegend series={TYPE_SERIES} />
      <div className="mt-4 flex items-end gap-1 border-b border-black/20 pb-px sm:gap-2">
        {buckets.map((bucket, idx) => {
          const total = bucket.quotes + bucket.samples + bucket.contacts;
          const segments = TYPE_SERIES.map((s) => ({
            ...s,
            value: bucket[s.key],
          })).filter((s) => s.value > 0);
          // Edge columns anchor their tooltip inward so it never escapes the card.
          const anchor =
            idx < 2
              ? "left-0"
              : idx >= buckets.length - 2
                ? "right-0"
                : "left-1/2 -translate-x-1/2";
          return (
            <div
              key={bucket.label}
              className="group relative flex min-w-0 flex-1 flex-col items-center"
            >
              {/* CSS-only tooltip: every series' value at this bucket. */}
              <div
                className={cn(
                  "pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-sm bg-mec-ink px-2.5 py-1.5 text-xs text-mec-pure shadow-lg group-hover:block group-focus-within:block",
                  anchor,
                )}
              >
                <p className="font-semibold">{bucket.label}</p>
                {TYPE_SERIES.map((s) => (
                  <p key={s.key} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="inline-block h-0.5 w-2.5"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="font-semibold">
                      {NUMBER.format(bucket[s.key])}
                    </span>{" "}
                    {s.label}
                  </p>
                ))}
              </div>
              <div
                tabIndex={0}
                className="flex w-full max-w-6 flex-col items-center justify-end"
                style={{ height: PLOT_HEIGHT + 28 }}
                role="img"
                aria-label={`${bucket.label}: ${bucket.quotes} quotes, ${bucket.samples} samples, ${bucket.contacts} contact`}
              >
                {/* Total rides the column cap, not a fixed row. */}
                {total > 0 && (
                  <span className="mb-0.5 shrink-0 text-[10px] font-semibold tabular-nums text-mec-ink/70">
                    {NUMBER.format(total)}
                  </span>
                )}
                {segments.map((s, i) => (
                  <div
                    key={s.key}
                    className={cn(
                      "w-full shrink-0",
                      i === 0 && "rounded-t-[4px]",
                      i > 0 && "mt-0.5",
                    )}
                    style={{
                      backgroundColor: s.color,
                      height: Math.max(2, (s.value / max) * PLOT_HEIGHT),
                    }}
                  />
                ))}
              </div>
              <span className="mt-1.5 w-full truncate text-center text-[10px] text-mec-ink/55">
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatusBar({
  counts,
}: {
  counts: { NEW: number; IN_PROGRESS: number; CLOSED: number };
}) {
  const total = counts.NEW + counts.IN_PROGRESS + counts.CLOSED;
  const segments = STATUS_SERIES.map((s) => ({ ...s, value: counts[s.key] }));
  return (
    <div>
      {total === 0 ? (
        <p className="text-sm text-mec-ink/60">No requests in this period.</p>
      ) : (
        <div className="flex h-5 gap-0.5">
          {segments
            .filter((s) => s.value > 0)
            .map((s, i, arr) => (
              <div
                key={s.key}
                className={cn(
                  "min-w-[2px]",
                  i === 0 && "rounded-l-[4px]",
                  i === arr.length - 1 && "rounded-r-[4px]",
                )}
                style={{
                  backgroundColor: s.color,
                  flexGrow: s.value,
                }}
                role="img"
                aria-label={`${s.label}: ${s.value}`}
              />
            ))}
        </div>
      )}
      <div className="mt-3">
        <SeriesLegend
          series={segments.map((s) => ({ label: s.label, color: s.color, count: s.value }))}
        />
      </div>
    </div>
  );
}
