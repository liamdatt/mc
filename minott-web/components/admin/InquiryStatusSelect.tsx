"use client";

import { useRef } from "react";
import { setInquiryStatus } from "@/lib/actions/admin-inquiries";
import { INQUIRY_STATUS, INQUIRY_STATUS_LABELS } from "@/lib/constants";

export function InquiryStatusSelect({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={setInquiryStatus} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-sm border border-black/15 bg-mec-pure px-2 py-1 text-xs font-semibold"
      >
        {Object.values(INQUIRY_STATUS).map((s) => (
          <option key={s} value={s}>
            {INQUIRY_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
