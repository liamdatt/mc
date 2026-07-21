"use client";

import { useActionState } from "react";
import {
  updateEmailSettings,
  type SettingsFormState,
} from "@/lib/actions/admin-settings";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type SettingsFormData = {
  fromEmail: string;
  fromName: string;
  generalInboxEmail: string;
};

export function SettingsForm({ settings }: { settings: SettingsFormData }) {
  const [state, formAction, pending] = useActionState<
    SettingsFormState,
    FormData
  >(updateEmailSettings, {});

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <label className={label}>
        Outbound email (From address)
        <input
          name="fromEmail"
          type="email"
          placeholder="no-reply@yourdomain.com"
          defaultValue={settings.fromEmail}
          className={field}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-mec-ink/50">
          Must be on your Resend-verified domain.
        </span>
      </label>
      <label className={label}>
        From name
        <input
          name="fromName"
          placeholder="Minott Equipment & Chemicals"
          defaultValue={settings.fromName}
          className={field}
        />
      </label>
      <label className={label}>
        General requests inbox
        <input
          name="generalInboxEmail"
          type="email"
          placeholder="sales@yourdomain.com"
          defaultValue={settings.generalInboxEmail}
          className={field}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-mec-ink/50">
          Receives contact messages and inquiries from customers without an
          assigned sales rep, and is CC&apos;d on rep-routed inquiries.
        </span>
      </label>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}
      {state.saved && !state.error && (
        <p className="text-sm font-semibold text-green-700">Settings saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
