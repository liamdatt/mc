import Link from "next/link";
import { db } from "@/lib/db";
import { dealLabel } from "@/lib/deals";
import { moveDeal } from "@/lib/actions/admin-deals";
import { DeleteDealButton } from "@/components/admin/DeleteDealButton";
import { requireAdminSession } from "@/lib/portal";

type Row = {
  id: number;
  type: string;
  percentOff: number | null;
  badgeText: string | null;
  active: boolean;
  endsAt: Date | null;
  product: { name: string };
  variant: { sku: string; label: string | null } | null;
};

function statusLabel(d: Row): string {
  if (d.endsAt && d.endsAt <= new Date()) return "Expired";
  return d.active ? "Active" : "Inactive";
}

function DealRow({ d, isFirst, isLast }: { d: Row; isFirst: boolean; isLast: boolean }) {
  return (
    <tr className="border-b border-black/5">
      <td className="px-4 py-3">
        <span className="inline-block rounded-pill bg-mec-red px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
          {dealLabel(d)}
        </span>
      </td>
      <td className="px-4 py-3 text-mec-ink/70">
        {d.product.name}
        {d.variant ? ` — ${d.variant.label ?? d.variant.sku}` : " (all SKUs)"}
      </td>
      <td className="px-4 py-3 text-xs text-mec-ink/60">
        {statusLabel(d)}
        {d.endsAt
          ? ` · ends ${d.endsAt.toLocaleDateString("en-JM", { timeZone: "America/Jamaica" })}`
          : ""}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <form action={moveDeal}>
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              className="text-mec-ink/50 hover:text-mec-red disabled:opacity-30"
            >
              ↑
            </button>
          </form>
          <form action={moveDeal}>
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              className="text-mec-ink/50 hover:text-mec-red disabled:opacity-30"
            >
              ↓
            </button>
          </form>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/portal/deals/${d.id}`}
          className="font-semibold text-mec-red hover:underline"
        >
          Edit
        </Link>
        <DeleteDealButton id={d.id} />
      </td>
    </tr>
  );
}

export default async function AdminDealsPage() {
  await requireAdminSession();
  const deals = (await db.deal.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { product: true, variant: true },
  })) as Row[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Deals</h1>
        <Link
          href="/portal/deals/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Deal
        </Link>
      </div>

      {deals.length === 0 ? (
        <p className="mt-6 text-sm text-mec-ink/60">No deals yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
              <tr>
                <th className="px-4 py-3">Badge</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {deals.map((d, i) => (
                <DealRow
                  key={d.id}
                  d={d}
                  isFirst={i === 0}
                  isLast={i === deals.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
