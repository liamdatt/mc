import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { PortalAuth } from "@/lib/auth/portal";

/**
 * BetterAuth client for the customer/B2B portal, used from Client Components.
 *
 * `inferAdditionalFields` pulls the custom User fields (companyName, phone,
 * whatsapp) onto the typed session/user so client code is type-safe.
 *
 * Usage (client component):
 *   import { portalAuthClient } from "@/lib/auth/portal-client";
 *   await portalAuthClient.signIn.email({ email, password, rememberMe: true });
 *   const { data: session } = portalAuthClient.useSession();
 */
export const portalAuthClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [inferAdditionalFields<PortalAuth>(), adminClient()],
});

export const { signIn, signOut, useSession, getSession } = portalAuthClient;
