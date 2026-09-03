import type { Company } from "@prisma/client";
import type { CompanyFormData } from "@/components/admin/CompanyForm";

/** Serialise a Company row for the client-side CompanyForm (Decimal → string). */
export function toCompanyFormData(c: Company): CompanyFormData {
  const hasShipping = Boolean(c.shippingStreet || c.shippingCity || c.shippingParish || c.shippingZip);
  return {
    id: c.id,
    name: c.name,
    mecAccountNumber: c.mecAccountNumber,
    industry: c.industry,
    location: c.location,
    salesRepId: c.salesRepId,
    businessType: c.businessType,
    inBusinessSince: c.inBusinessSince,
    trn: c.trn,
    taxExemptionNumber: c.taxExemptionNumber,
    billing: { street: c.billingStreet ?? "", city: c.billingCity ?? "", parish: c.billingParish ?? "", zip: c.billingZip ?? "" },
    shipping: hasShipping
      ? { street: c.shippingStreet ?? "", city: c.shippingCity ?? "", parish: c.shippingParish ?? "", zip: c.shippingZip ?? "" }
      : null,
    accountingName: c.accountingName,
    accountingPhone: c.accountingPhone,
    accountingEmail: c.accountingEmail,
    sector: c.sector,
    creditTerms: c.creditTerms,
    creditLimit: c.creditLimit === null ? null : c.creditLimit.toString(),
    gctStatus: c.gctStatus,
  };
}
