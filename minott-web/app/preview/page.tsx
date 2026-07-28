import { redirect } from "next/navigation";
import { PreviewUnlockForm } from "@/components/preview/PreviewUnlockForm";

export const metadata = { title: "Private preview" };

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!process.env.SITE_PASSWORD) redirect("/");
  const { next } = await searchParams;
  return <PreviewUnlockForm next={next ?? "/"} />;
}
