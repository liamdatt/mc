// Pure promotion rules — no Prisma/server imports (imported by client forms).

export const PROMO_LIMITS = {
  eyebrow: 40,
  title: 60,
  body: 160,
  badgeText: 14,
  ctaLabel: 30,
} as const;

export const DEFAULT_PROMO_CTA = "Shop the Promotion";

export type PromotionInput = {
  categoryId: number;
  eyebrow: string;
  title: string;
  body: string;
  badgeText: string | null;
  ctaLabel: string;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

const LABELS = {
  eyebrow: "Eyebrow",
  title: "Title",
  body: "Body",
  badgeText: "Badge",
  ctaLabel: "Button label",
} as const;

function parseDay(raw: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T${time}-05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parsePromotionForm(
  get: (key: string) => string | null,
): { error: string } | { data: PromotionInput } {
  const val = (k: string) => (get(k) ?? "").trim();

  const categoryRaw = val("categoryId");
  const categoryId = Number(categoryRaw);
  if (!/^\d+$/.test(categoryRaw) || !Number.isInteger(categoryId) || categoryId <= 0) {
    return { error: "Choose a category." };
  }

  const text = {} as Record<keyof typeof PROMO_LIMITS, string>;
  for (const key of ["eyebrow", "title", "body", "badgeText", "ctaLabel"] as const) {
    text[key] = val(key);
    if (text[key].length > PROMO_LIMITS[key]) {
      return { error: `${LABELS[key]} must be ${PROMO_LIMITS[key]} characters or fewer.` };
    }
  }
  for (const key of ["eyebrow", "title", "body"] as const) {
    if (!text[key]) return { error: `${LABELS[key]} is required.` };
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  const startRaw = val("startsAt");
  const endRaw = val("endsAt");
  if (startRaw) {
    startsAt = parseDay(startRaw, "00:00:00");
    if (!startsAt) return { error: "Start date is not a valid date." };
  }
  if (endRaw) {
    endsAt = parseDay(endRaw, "23:59:59");
    if (!endsAt) return { error: "End date is not a valid date." };
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    return { error: "End date must be on or after the start date." };
  }

  const activeRaw = get("active");
  return {
    data: {
      categoryId,
      eyebrow: text.eyebrow,
      title: text.title,
      body: text.body,
      badgeText: text.badgeText || null,
      ctaLabel: text.ctaLabel || DEFAULT_PROMO_CTA,
      startsAt,
      endsAt,
      active: activeRaw === "on" || activeRaw === "true",
    },
  };
}

export type PromotionStatus = "Live" | "Scheduled" | "Expired" | "Inactive";

export function promotionStatus(
  p: { active: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date(),
): PromotionStatus {
  if (p.endsAt && p.endsAt <= now) return "Expired";
  if (!p.active) return "Inactive";
  if (p.startsAt && p.startsAt > now) return "Scheduled";
  return "Live";
}

/** Jamaica yyyy-mm-dd for a date input, or "". */
export function toDateInput(d: Date | null): string {
  return d ? d.toLocaleDateString("en-CA", { timeZone: "America/Jamaica" }) : "";
}
