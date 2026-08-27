/**
 * Approved Industry dropdown (spec §3). Single source for the guest quote
 * form, the New Customer Form and the admin/rep CompanyForm. Swap the entries
 * for MEC's official list when supplied — nothing else needs to change.
 */
export const INDUSTRIES = [
  "Hospitality & Tourism",
  "Healthcare & Medical",
  "Manufacturing & Industrial",
  "Food & Beverage",
  "Financial Services",
  "Telecoms",
  "Entertainment & Events",
  "Retail",
  "Education",
  "Government & Public Sector",
  "Property & Facilities Management",
  "Janitorial & Cleaning Services",
  "Distribution & Wholesale",
  "Personal / Individual",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export function isIndustry(v: unknown): v is Industry {
  return typeof v === "string" && (INDUSTRIES as readonly string[]).includes(v);
}
