import Link from "next/link";
import { db } from "@/lib/db";
import { APPLICATION_STATUS, INQUIRY_STATUS } from "@/lib/constants";

/**
 * Admin dashboard for the unified Accounts Portal. No props — reads its own
 * counts directly (async Server Component). Rendered by
 * `app/portal/(protected)/page.tsx` when `session.user.role === "admin"`.
 */
export async function AdminDashboard() {
  const [products, categories, newInquiries, accountsToSetUp] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.inquiry.count({ where: { status: INQUIRY_STATUS.NEW } }),
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.APPROVED } }),
  ]);

  const cards = [
    { label: "Products", value: products, href: "/portal/products" },
    { label: "Categories", value: categories, href: "/portal/categories" },
    { label: "New requests", value: newInquiries, href: "/portal/requests" },
    { label: "Accounts to set up", value: accountsToSetUp, href: "/portal/applications" },
  ];

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-md border border-black/10 bg-mec-pure p-6 transition hover:border-mec-red"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/60">
              {c.label}
            </p>
            <p className="mt-2 font-display-tight text-5xl text-mec-ink">
              {c.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
