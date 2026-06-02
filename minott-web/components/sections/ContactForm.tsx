"use client";

import { useActionState } from "react";
import { submitContact, type InquiryResult } from "@/lib/actions/inquiries";

const initial: InquiryResult = { ok: false };

const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initial);

  if (state.ok) {
    return (
      <div className="rounded-md border border-mec-red/30 bg-mec-red/5 p-8">
        <h3 className="font-display-tight text-h3 text-mec-ink">
          Thanks — we&apos;ve got your message.
        </h3>
        <p className="mt-3 text-mec-ink/75">
          A sales consultant will be in touch within one business day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Name *
        <input name="name" required className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Company
        <input name="company" className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Email *
        <input name="email" type="email" required className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Phone
        <input name="phone" className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 sm:col-span-2">
        Message
        <textarea name="message" rows={4} className={`${inputCls} resize-none`} />
      </label>
      {state.error && (
        <p className="text-sm text-mec-red sm:col-span-2">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-8 py-4 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send Message"}
        </button>
      </div>
    </form>
  );
}
