import Link from "next/link";
import { CompanyForm, type CompanyPrefill } from "@/components/admin/CompanyForm";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/portal";
import { getApplicationById } from "@/lib/applications";
import { APPLICATION_STATUS } from "@/lib/constants";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string | string[] }>;
}) {
  await requireAdminSession();
  const { application } = await searchParams;
  const applicationId = typeof application === "string" ? Number(application) : NaN;
  const app = Number.isInteger(applicationId) ? await getApplicationById(applicationId) : null;

  const salesReps = await db.salesRep.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const back = (
    <Link href="/portal/customers" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">
      ← Back to companies
    </Link>
  );

  if (Number.isInteger(applicationId)) {
    if (!app || app.status !== APPLICATION_STATUS.APPROVED || app.companyId !== null) {
      return (
        <div>
          {back}
          <h1 className="mt-4 font-display-tight text-3xl">Not awaiting account setup</h1>
          <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
            This application is not approved, or its account has already been created.
          </p>
          <Link href={app ? `/portal/applications/${app.id}` : "/portal/applications"} className="mt-6 inline-block font-semibold text-mec-red hover:underline">
            {app ? "Open the application" : "Go to applications"}
          </Link>
        </div>
      );
    }

    const hasShipping = Boolean(app.shippingStreet || app.shippingCity || app.shippingParish || app.shippingZip);
    const prefill: CompanyPrefill = {
      name: app.companyName,
      industry: app.industry,
      location: app.location,
      businessType: app.businessType,
      inBusinessSince: app.inBusinessSince,
      trn: app.trn,
      taxExemptionNumber: app.taxExemptionNumber,
      billing: { street: app.billingStreet ?? "", city: app.billingCity ?? "", parish: app.billingParish ?? "", zip: app.billingZip ?? "" },
      shipping: hasShipping
        ? { street: app.shippingStreet ?? "", city: app.shippingCity ?? "", parish: app.shippingParish ?? "", zip: app.shippingZip ?? "" }
        : null,
      accountingName: app.accountingName,
      accountingPhone: app.accountingPhone,
      accountingEmail: app.accountingEmail,
      contactName: app.contactName,
      contactEmail: app.email,
      contactPhone: app.phone,
    };

    return (
      <div>
        <Link href={`/portal/applications/${app.id}`} className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">
          ← Back to application
        </Link>
        <h1 className="mt-4 font-display-tight text-3xl">Create account for {app.companyName}</h1>
        <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
          Creating the account for application #{app.id}. Everything below is prefilled from the New Customer Form —
          fill in the MEC account number, credit terms, credit limit, GCT status and sales rep. The principal will be
          invited to set their password when you save, and quote #{app.inquiry.id} will be attached to the company.
        </p>
        <div className="mt-8">
          <CompanyForm prefill={prefill} applicationId={app.id} salesReps={salesReps} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {back}
      <h1 className="mt-4 font-display-tight text-3xl">New customer company</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Create the company account, assign a sales rep, and optionally invite
        the first portal user — they&apos;ll set their own password by email.
      </p>
      <div className="mt-8">
        <CompanyForm salesReps={salesReps} />
      </div>
    </div>
  );
}
