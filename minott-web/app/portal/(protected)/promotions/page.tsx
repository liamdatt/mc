import Link from "next/link";
import { db } from "@/lib/db";
import { movePromotion } from "@/lib/actions/admin-promotions";
import { DeletePromotionButton } from "@/components/admin/DeletePromotionButton";
import { promotionStatus } from "@/lib/promotion-rules";
import { requireAdminSession } from "@/lib/portal";

type Row = {
  id: number;
  eyebrow: string;
  title: string;
  badgeText: string | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  category: { name: string };
};

const fmt = (d: Date) =>
  d.toLocaleDateString("en-JM", { timeZone: "America/Jamaica" });

function PromotionRow({ p, isFirst, isLast }: { p: Row; isFirst: boolean; isLast: boolean }) {
  return (
    <tr className="border-b border-black/5">
      <td className="px-4 py-3">
        {p.badgeText ? (
          <span className="inline-block rounded-pill bg-mec-red px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
            {p.badgeText}
          </span>
        ) : (
          <span className="text-mec-ink/40">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.1em] text-mec-ink/50">
          {p.eyebrow}
        </div>
        <div className="font-semibold text-mec-ink">{p.title}</div>
      </td>
      <td className="px-4 py-3 text-mec-ink/70">{p.category.name}</td>
      <td className="px-4 py-3 text-xs text-mec-ink/60">
        {promotionStatus(p)}
        {p.startsAt ? ` · starts ${fmt(p.startsAt)}` : ""}
        {p.endsAt ? ` · ends ${fmt(p.endsAt)}` : ""}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <form action={movePromotion}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              className="text-mec-ink/50 hover:text-mec-red disabled:opacity-30"
            >
              ↑
            </button>
          </form>
          <form action={movePromotion}>
            <input type="hidden" name="id" value={p.id} />
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
          href={`/portal/promotions/${p.id}`}
          className="font-semibold text-mec-red hover:underline"
        >
          Edit
        </Link>
        <DeletePromotionButton id={p.id} />
      </td>
    </tr>
  );
}

export default async function AdminPromotionsPage() {
  await requireAdminSession();
  const promotions = (await db.promotion.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { category: { select: { name: true } } },
  })) as Row[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Promotions</h1>
        <Link
          href="/portal/promotions/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          New Promotion
        </Link>
      </div>

      {promotions.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-mec-ink/60">No promotions yet.</p>
          <Link
            href="/portal/promotions/new"
            className="mt-4 inline-block bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
          >
            New Promotion
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
              <tr>
                <th className="px-4 py-3">Badge</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {promotions.map((p, i) => (
                <PromotionRow
                  key={p.id}
                  p={p}
                  isFirst={i === 0}
                  isLast={i === promotions.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
