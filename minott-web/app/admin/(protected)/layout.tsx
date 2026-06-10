import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/customers", label: "Customers" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const authed = await verifySession(process.env.SESSION_SECRET ?? "", token);
  if (!authed) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-mec-mist text-mec-ink">
      <aside className="flex w-56 flex-col border-r border-black/10 bg-mec-pure p-6">
        <Link href="/admin" className="font-display text-2xl tracking-wider">
          <span className="text-mec-red">MEC</span> Admin
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-sm px-3 py-2 text-sm font-semibold hover:bg-mec-mist"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-sm border border-black/15 px-3 py-2 text-sm font-semibold hover:border-mec-red hover:text-mec-red"
          >
            Log out
          </button>
        </form>
        <Link
          href="/"
          className="mt-3 text-xs text-mec-ink/60 hover:text-mec-red"
        >
          ← View site
        </Link>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
