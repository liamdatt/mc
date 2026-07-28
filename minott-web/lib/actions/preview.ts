"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  signSession,
  PREVIEW_COOKIE,
  PREVIEW_TTL_MS,
} from "@/lib/auth/session";

export type UnlockState = { error?: string };

// Only allow same-origin path redirects ("/" but not "//host") — prevents
// open-redirect abuse via the ?next= param.
function safeNext(raw: FormDataEntryValue | null): string {
  const next = String(raw ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

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
  redirect(safeNext(formData.get("next")));
}
