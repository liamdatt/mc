"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  signSession,
  PREVIEW_COOKIE,
  PREVIEW_TTL_MS,
} from "@/lib/auth/session";
import { safeRelativePath } from "@/lib/safe-path";

export type UnlockState = { error?: string };

export async function unlock(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) redirect("/");
  const password = String(formData.get("password") ?? "");
  if (password !== sitePassword) {
    return { error: "Incorrect password." };
  }
  const token = await signSession(
    process.env.SESSION_SECRET ?? "",
    PREVIEW_TTL_MS,
    "preview",
  );
  const store = await cookies();
  store.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // No maxAge: session cookie by design — cleared when the browser closes.
  });
  // `replace` keeps the lock screen out of browser history — Back after
  // unlocking should not return to the password form.
  redirect(
    safeRelativePath(String(formData.get("next") ?? "")) ?? "/",
    RedirectType.replace,
  );
}
