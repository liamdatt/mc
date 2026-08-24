"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import {
  updatePortalProfile,
  type ProfileFormState,
} from "@/lib/actions/portal";

type ProfileValues = {
  name?: string;
  email?: string;
  phone?: string | null;
  whatsapp?: string | null;
};

const field =
  "mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red disabled:bg-mec-mist disabled:text-mec-ink/50";
const label =
  "block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60";

/**
 * Edit form for the portal user's B2B profile. Email is shown read-only
 * (managed by MEC staff). Submits the `updatePortalProfile` Server Action,
 * which resolves the owning user from the session — the form never sends an id.
 */
export function ProfileForm({ user }: { user: ProfileValues }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updatePortalProfile,
    {},
  );

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <label className={label}>
        Contact name
        <input
          name="name"
          defaultValue={user.name ?? ""}
          required
          className={field}
        />
      </label>

      <label className={label}>
        Email (managed by MEC)
        <input
          value={user.email ?? ""}
          disabled
          className={field}
        />
      </label>

      <label className={label}>
        Phone
        <input
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ""}
          className={field}
        />
      </label>

      <label className={label}>
        WhatsApp
        <input
          name="whatsapp"
          type="tel"
          defaultValue={user.whatsapp ?? ""}
          className={field}
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="inline-flex items-center gap-2 rounded-sm border border-mec-red/20 bg-mec-red/5 px-4 py-3 text-sm font-semibold text-mec-red">
          <Check aria-hidden className="h-4 w-4" />
          Your details were saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-mec-red px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
