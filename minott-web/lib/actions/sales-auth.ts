"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/portal";

/** Sign the current rep out and return to the sales sign-in page. */
export async function salesSignOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sales/sign-in");
}
