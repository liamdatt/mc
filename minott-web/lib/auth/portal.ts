import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";

/**
 * BetterAuth server instance for the customer/B2B portal.
 *
 * - Email + password sign-in only. PUBLIC SIGN-UP IS DISABLED: portal
 *   accounts are provisioned by MEC staff (see "Provisioning users" below).
 * - 30-day persistent ("remember me") sessions.
 * - The `admin` plugin is enabled solely so we can provision accounts
 *   server-side with `auth.api.createUser` even though `disableSignUp` is on.
 *
 * Provisioning users (server-side, e.g. from a Server Action in the MEC
 * admin area): call `auth.api.createUser({ body: { email, password, name,
 * role, data: { companyName, phone, whatsapp } } })` WITHOUT passing
 * `headers`. With no request headers the admin-plugin endpoint skips its
 * session/permission check, so our existing password-gated admin can create
 * portal users without itself being a BetterAuth admin. `auth.api.signUpEmail`
 * will NOT work here — it throws EMAIL_PASSWORD_SIGN_UP_DISABLED.
 */
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "sqlite",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // Accounts are provisioned by MEC admins, not self-service.
    disableSignUp: true,
  },
  session: {
    // 30-day persistent sessions ("remember me").
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      companyName: { type: "string", required: false, input: true },
      phone: { type: "string", required: false, input: true },
      whatsapp: { type: "string", required: false, input: true },
    },
  },
  plugins: [
    // Enables auth.api.createUser for staff-side account provisioning.
    admin({ defaultRole: "customer" }),
    // Must be last: lets Server Actions persist auth cookies in Next.js.
    nextCookies(),
  ],
});

export type PortalAuth = typeof auth;
