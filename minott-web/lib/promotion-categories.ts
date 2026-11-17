import { db } from "@/lib/db";

/** All categories for the promotion picker; subcategories read "Parent › Child". */
export async function getPromotionCategoryOptions(): Promise<
  { id: number; name: string }[]
> {
  const cats = await db.category.findMany({
    select: { id: true, name: true, parent: { select: { name: true } } },
  });
  return cats
    .map((c) => ({
      id: c.id,
      name: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
