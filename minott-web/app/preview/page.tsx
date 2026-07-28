import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PreviewUnlockForm } from "@/components/preview/PreviewUnlockForm";
import { verifySession, PREVIEW_COOKIE } from "@/lib/auth/session";
import { safeRelativePath } from "@/lib/safe-path";

export const metadata = { title: "Private preview" };

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!process.env.SITE_PASSWORD) redirect("/");
  const { next } = await searchParams;
  // Sanitize at render too (the action re-checks) so a hostile ?next= never
  // even round-trips through the form.
  const safeNext = safeRelativePath(next) ?? "/";
  // Already unlocked (e.g. a bookmarked lock screen) — skip the dead form.
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (await verifySession(process.env.SESSION_SECRET ?? "", token, "preview")) {
    redirect(safeNext);
  }
  return <PreviewUnlockForm next={safeNext} />;
}
