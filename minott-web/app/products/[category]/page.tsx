import { redirect } from "next/navigation";

// Category browsing is unified into the /products listing via ?category=.
// This route is kept so existing links / nav entries resolve.
export default async function CategoryRedirect({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  redirect(`/products/all?category=${category}`);
}
