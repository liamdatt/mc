import Link from "next/link";
import {
  getAdminAnalytics,
  isAnalyticsRange,
  ANALYTICS_RANGES,
  type AnalyticsRange,
} from "@/lib/analytics";
import {
  StatTile,
  HBarList,
  StackedTrend,
  StatusBar,
} from "@/components/admin/AnalyticsCharts";

const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Jamaica",
});
const NUMBER = new Intl.NumberFormat("en-US");

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-black/10 bg-mec-pure p-5 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold text-mec-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-mec-ink/55">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: AnalyticsRange = isAnalyticsRange(rangeParam) ? rangeParam : "90d";

  const data = await getAdminAnalytics(range);
  const { kpis, previous } = data;
  const delta = (key: keyof typeof kpis) =>
    previous ? kpis[key] - previous[key] : null;

  const tiles = [
    { label: "Quote requests", value: kpis.quotes, delta: delta("quotes") },
    { label: "Sample requests", value: kpis.samples, delta: delta("samples") },
    { label: "Contact messages", value: kpis.contacts, delta: delta("contacts") },
    { label: "Units quoted", value: kpis.unitsQuoted, delta: delta("unitsQuoted") },
    {
      label: "Unique requesters",
      value: kpis.uniqueRequesters,
      delta: delta("uniqueRequesters"),
    },
  ];

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Analytics</h1>
      <p className="mt-1 text-sm text-mec-ink/60">
        Demand signals from quote, sample, and contact requests.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {ANALYTICS_RANGES.map((r) => (
          <Link
            key={r.key}
            href={r.key === "90d" ? "/admin/analytics" : `/admin/analytics?range=${r.key}`}
            aria-current={range === r.key ? "page" : undefined}
            className={`rounded-pill px-4 py-1.5 text-sm font-semibold ${
              range === r.key
                ? "bg-mec-red text-mec-pure"
                : "border border-black/15 text-mec-ink/70 hover:border-mec-red"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((t) => (
          <StatTile key={t.label} {...t} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Most requested products"
          subtitle="Quote + sample requests naming the product"
        >
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-mec-ink/60">No product requests in this period.</p>
          ) : (
            <HBarList
              items={data.topProducts.map((p) => ({
                label: p.name,
                value: p.requests,
                detail: `${NUMBER.format(p.units)} units · ${p.sampleRequests} sample${
                  p.sampleRequests === 1 ? "" : "s"
                }`,
              }))}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Most popular categories"
          subtitle="Quote + sample requests touching the category"
        >
          {data.topCategories.length === 0 ? (
            <p className="text-sm text-mec-ink/60">No category activity in this period.</p>
          ) : (
            <HBarList
              items={data.topCategories.map((c) => ({
                label: c.name,
                value: c.requests,
                detail: c.units > 0 ? `${NUMBER.format(c.units)} units` : undefined,
              }))}
            />
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Requests over time"
          subtitle={`Per ${data.trendUnit}, by request type`}
          className="xl:col-span-2"
        >
          {data.trend.every((b) => b.quotes + b.samples + b.contacts === 0) ? (
            <p className="text-sm text-mec-ink/60">No requests in this period.</p>
          ) : (
            <StackedTrend buckets={data.trend} />
          )}
        </ChartCard>

        <ChartCard title="Pipeline" subtitle="Request status in this period">
          <StatusBar counts={data.statusCounts} />
        </ChartCard>
      </div>

      <ChartCard
        title="Top companies"
        subtitle="By quote requests — who to call first"
        className="mt-4"
      >
        {data.topCompanies.length === 0 ? (
          <p className="text-sm text-mec-ink/60">No quote requests in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/55">
                <th scope="col" className="pb-2 font-semibold">Company</th>
                <th scope="col" className="pb-2 text-right font-semibold">Quotes</th>
                <th scope="col" className="pb-2 text-right font-semibold">Units</th>
                <th scope="col" className="pb-2 text-right font-semibold">Last request</th>
              </tr>
            </thead>
            <tbody>
              {data.topCompanies.map((c) => (
                <tr key={c.name} className="border-b border-black/5 last:border-0">
                  <td className="py-2 font-semibold text-mec-ink">{c.name}</td>
                  <td className="py-2 text-right tabular-nums">{NUMBER.format(c.quotes)}</td>
                  <td className="py-2 text-right tabular-nums">{NUMBER.format(c.units)}</td>
                  <td className="py-2 text-right text-mec-ink/70">{DATE.format(c.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartCard>
    </div>
  );
}
