import { db } from "@/lib/db";
import { INQUIRY_TYPE } from "@/lib/constants";

export type AnalyticsRange = "30d" | "90d" | "12m" | "all";

export const ANALYTICS_RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
  { key: "all", label: "All time" },
];

export function isAnalyticsRange(key: string | undefined): key is AnalyticsRange {
  return ANALYTICS_RANGES.some((r) => r.key === key);
}

const RANGE_DAYS: Record<Exclude<AnalyticsRange, "all">, number> = {
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

export interface AnalyticsKpis {
  quotes: number;
  samples: number;
  contacts: number;
  unitsQuoted: number;
  uniqueRequesters: number;
}

export interface ProductStat {
  name: string;
  /** Quote requests containing this product + sample requests for it. */
  requests: number;
  quoteRequests: number;
  sampleRequests: number;
  units: number;
}

export interface CategoryStat {
  name: string;
  requests: number;
  units: number;
}

export interface TrendBucket {
  label: string;
  quotes: number;
  samples: number;
  contacts: number;
}

export interface CompanyStat {
  name: string;
  quotes: number;
  units: number;
  lastAt: Date;
}

export interface AdminAnalytics {
  kpis: AnalyticsKpis;
  /** Same KPIs for the previous equal-length window; null for "all". */
  previous: AnalyticsKpis | null;
  topProducts: ProductStat[];
  topCategories: CategoryStat[];
  trend: TrendBucket[];
  trendUnit: "week" | "month";
  statusCounts: { NEW: number; IN_PROGRESS: number; CLOSED: number };
  topCompanies: CompanyStat[];
}

const TOP_N = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

// All bucketing and date display use business time. America/Jamaica has no
// DST — a fixed UTC−05:00 — so calendar boundaries can be derived with a
// constant shift instead of a timezone library.
const JA_TZ = "America/Jamaica";
const JA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Start of the Jamaica calendar day containing `d`, as a UTC instant. */
function startOfJaDay(d: Date): Date {
  const s = new Date(d.getTime() - JA_OFFSET_MS);
  return new Date(
    Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) + JA_OFFSET_MS,
  );
}

/** Start of the Jamaica week (Monday) containing `d`. */
function startOfJaWeek(d: Date): Date {
  const day = startOfJaDay(d);
  const dow = (new Date(day.getTime() - JA_OFFSET_MS).getUTCDay() + 6) % 7;
  return new Date(day.getTime() - dow * DAY_MS);
}

/** First of the Jamaica month containing `d`, `months` months later. */
function jaMonthStart(d: Date, months = 0): Date {
  const s = new Date(d.getTime() - JA_OFFSET_MS);
  return new Date(
    Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + months, 1) + JA_OFFSET_MS,
  );
}

const WEEK_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: JA_TZ,
});
const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "2-digit",
  timeZone: JA_TZ,
});

type InquiryRow = Awaited<ReturnType<typeof fetchInquiries>>[number];

function fetchInquiries(where: { createdAt?: { gte: Date; lt?: Date } }) {
  return db.inquiry.findMany({
    where,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      name: true,
      company: true,
      companyRef: { select: { name: true } },
      email: true,
      product: {
        select: { name: true, category: { select: { name: true } } },
      },
      items: {
        select: {
          productName: true,
          quantity: true,
          product: {
            select: { name: true, category: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

function computeKpis(inquiries: InquiryRow[]): AnalyticsKpis {
  const emails = new Set<string>();
  let quotes = 0;
  let samples = 0;
  let contacts = 0;
  let unitsQuoted = 0;
  for (const inq of inquiries) {
    emails.add(inq.email.trim().toLowerCase());
    if (inq.type === INQUIRY_TYPE.QUOTE) {
      quotes += 1;
      for (const item of inq.items) unitsQuoted += item.quantity;
    } else if (inq.type === INQUIRY_TYPE.SAMPLE) {
      samples += 1;
    } else {
      contacts += 1;
    }
  }
  return { quotes, samples, contacts, unitsQuoted, uniqueRequesters: emails.size };
}

function computeTrend(
  inquiries: InquiryRow[],
  since: Date | null,
  unit: "week" | "month",
): TrendBucket[] {
  const now = new Date();
  const first = since ?? inquiries[0]?.createdAt ?? now;
  const buckets: { start: Date; bucket: TrendBucket }[] = [];

  let cursor = unit === "week" ? startOfJaWeek(first) : jaMonthStart(first);
  while (cursor <= now) {
    buckets.push({
      start: cursor,
      bucket: {
        label:
          unit === "week" ? WEEK_LABEL.format(cursor) : MONTH_LABEL.format(cursor),
        quotes: 0,
        samples: 0,
        contacts: 0,
      },
    });
    cursor =
      unit === "week"
        ? new Date(cursor.getTime() + 7 * DAY_MS)
        : jaMonthStart(cursor, 1);
  }

  for (const inq of inquiries) {
    // Buckets are ascending; find the last one starting at or before createdAt.
    let target = buckets[0];
    for (const b of buckets) {
      if (b.start <= inq.createdAt) target = b;
      else break;
    }
    if (!target) continue;
    if (inq.type === INQUIRY_TYPE.QUOTE) target.bucket.quotes += 1;
    else if (inq.type === INQUIRY_TYPE.SAMPLE) target.bucket.samples += 1;
    else target.bucket.contacts += 1;
  }

  return buckets.map((b) => b.bucket);
}

export async function getAdminAnalytics(
  range: AnalyticsRange,
): Promise<AdminAnalytics> {
  const now = new Date();
  const trendUnit: "week" | "month" =
    range === "30d" || range === "90d" ? "week" : "month";

  // Align the window start to a bucket boundary so the trend never opens on a
  // partial week/month masquerading as a full one. "Last 12 months" = the
  // current (partial) month plus the 11 before it.
  let since: Date | null = null;
  let prevSince: Date | null = null;
  if (range !== "all") {
    since =
      trendUnit === "week"
        ? startOfJaWeek(new Date(now.getTime() - RANGE_DAYS[range] * DAY_MS))
        : jaMonthStart(now, -11);
    prevSince = new Date(since.getTime() - (now.getTime() - since.getTime()));
  }

  const [inquiries, prevInquiries] = await Promise.all([
    fetchInquiries(since ? { createdAt: { gte: since } } : {}),
    since && prevSince
      ? fetchInquiries({ createdAt: { gte: prevSince, lt: since } })
      : Promise.resolve([] as InquiryRow[]),
  ]);

  // --- Products & categories ------------------------------------------------
  const products = new Map<string, ProductStat>();
  const categories = new Map<string, CategoryStat>();
  const REMOVED = "Removed products";

  const productStat = (name: string) => {
    let stat = products.get(name);
    if (!stat) {
      stat = { name, requests: 0, quoteRequests: 0, sampleRequests: 0, units: 0 };
      products.set(name, stat);
    }
    return stat;
  };
  const categoryStat = (name: string) => {
    let stat = categories.get(name);
    if (!stat) {
      stat = { name, requests: 0, units: 0 };
      categories.set(name, stat);
    }
    return stat;
  };

  for (const inq of inquiries) {
    if (inq.type === INQUIRY_TYPE.QUOTE) {
      // Count each product/category once per quote, even across variants.
      // Prefer the live product name so renamed products merge with their
      // sample counts; fall back to the snapshot for deleted products.
      const seenProducts = new Set<string>();
      const seenCategories = new Set<string>();
      for (const item of inq.items) {
        const productName = item.product?.name ?? item.productName;
        const stat = productStat(productName);
        stat.units += item.quantity;
        if (!seenProducts.has(productName)) {
          seenProducts.add(productName);
          stat.quoteRequests += 1;
          stat.requests += 1;
        }
        const categoryName = item.product?.category.name ?? REMOVED;
        const cat = categoryStat(categoryName);
        cat.units += item.quantity;
        if (!seenCategories.has(categoryName)) {
          seenCategories.add(categoryName);
          cat.requests += 1;
        }
      }
    } else if (inq.type === INQUIRY_TYPE.SAMPLE && inq.product) {
      const stat = productStat(inq.product.name);
      stat.sampleRequests += 1;
      stat.requests += 1;
      categoryStat(inq.product.category.name).requests += 1;
    }
  }

  // --- Companies ------------------------------------------------------------
  const companies = new Map<string, CompanyStat>();
  for (const inq of inquiries) {
    if (inq.type !== INQUIRY_TYPE.QUOTE) continue;
    const name =
      inq.companyRef?.name?.trim() ||
      inq.company?.trim() ||
      inq.name.trim() ||
      inq.email;
    let stat = companies.get(name.toLowerCase());
    if (!stat) {
      stat = { name, quotes: 0, units: 0, lastAt: inq.createdAt };
      companies.set(name.toLowerCase(), stat);
    }
    stat.quotes += 1;
    for (const item of inq.items) stat.units += item.quantity;
    if (inq.createdAt > stat.lastAt) stat.lastAt = inq.createdAt;
  }

  // --- Status ---------------------------------------------------------------
  const statusCounts = { NEW: 0, IN_PROGRESS: 0, CLOSED: 0 };
  for (const inq of inquiries) {
    if (Object.hasOwn(statusCounts, inq.status))
      statusCounts[inq.status as keyof typeof statusCounts] += 1;
  }

  return {
    kpis: computeKpis(inquiries),
    previous: since ? computeKpis(prevInquiries) : null,
    topProducts: [...products.values()]
      .sort((a, b) => b.requests - a.requests || b.units - a.units)
      .slice(0, TOP_N),
    topCategories: [...categories.values()]
      .sort((a, b) => b.requests - a.requests || b.units - a.units)
      .slice(0, TOP_N),
    trend: computeTrend(inquiries, since, trendUnit),
    trendUnit,
    statusCounts,
    topCompanies: [...companies.values()]
      .sort((a, b) => b.quotes - a.quotes || b.units - a.units)
      .slice(0, TOP_N),
  };
}
