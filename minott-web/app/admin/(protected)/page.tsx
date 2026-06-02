import Link from "next/link";
import { db } from "@/lib/db";
import { INQUIRY_STATUS } from "@/lib/constants";

export default async function AdminDashboardPage() {
  const [products, categories, newInquiries] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.inquiry.count({ where: { status: INQUIRY_STATUS.NEW } }),
  ]);

  const cards = [
    { label: "Products", value: products, href: "/admin/products" },
    { label: "Categories", value: categories, href: "/admin/categories" },
    { label: "New requests", value: newInquiries, href: "/admin/requests" },
  ];

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
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
