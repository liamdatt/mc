"use client";

import { useId, useRef } from "react";
import { Check, CloudUpload, FileImage, Info, Loader2, X } from "lucide-react";
import { uploadQuoteLogo } from "@/lib/actions/quote-logo";
import { LOGO_ACCEPT, LOGO_MAX_BYTES } from "@/lib/quote-logos-shared";
import type { QuoteLogo } from "@/components/quote/QuoteCartProvider";

export type CustomLogoState = {
  enabled: boolean;
  uploading: boolean;
  logo: QuoteLogo | null;
  error: string | null;
};

export const EMPTY_LOGO_STATE: CustomLogoState = {
  enabled: false,
  uploading: false,
  logo: null,
  error: null,
};

/** True when Add to Quote must wait: an upload is in flight, or the box is
 *  ticked but no logo has been uploaded yet. */
export function logoBlocksAdd(s: CustomLogoState): boolean {
  return s.uploading || (s.enabled && !s.logo);
}

/**
 * "Add Custom Logo" option on mat detail pages. Uploads immediately on file
 * choice (Server Action → private data volume) and hands the opaque token up
 * via `onChange`; the parent passes it to the cart with the line.
 */
export function CustomLogoField({
  value,
  onChange,
}: {
  value: CustomLogoState;
  onChange: (next: CustomLogoState) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Bumped on every new upload/remove so a stale in-flight result is ignored.
  const reqRef = useRef(0);

  async function handleFile(file: File) {
    const req = ++reqRef.current;
    if (file.size > LOGO_MAX_BYTES) {
      onChange({ ...value, uploading: false, logo: null, error: "The logo must be 10 MB or smaller." });
      return;
    }
    onChange({ ...value, uploading: true, logo: null, error: null });
    const fd = new FormData();
    fd.append("logo", file);
    let next: CustomLogoState;
    try {
      const res = await uploadQuoteLogo(fd);
      next = res.ok
        ? { enabled: true, uploading: false, logo: { token: res.token, fileName: res.fileName }, error: null }
        : { enabled: true, uploading: false, logo: null, error: res.error };
    } catch {
      next = { enabled: true, uploading: false, logo: null, error: "Upload failed. Please try again." };
    }
    if (req === reqRef.current) onChange(next);
  }

  function clearFile() {
    reqRef.current++;
    onChange({ ...value, uploading: false, logo: null, error: null });
  }

  return (
    <div className="border-t border-black/10 pt-5">
      <label htmlFor={`${id}-toggle`} className="flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 inline-flex h-6 w-6 shrink-0">
          <input
            id={`${id}-toggle`}
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => {
              if (e.target.checked) onChange({ ...value, enabled: true });
              else {
                reqRef.current++;
                onChange(EMPTY_LOGO_STATE);
              }
            }}
            className="peer absolute inset-0 h-6 w-6 cursor-pointer appearance-none rounded-sm border-2 border-black/30 bg-mec-pure transition checked:border-mec-red checked:bg-mec-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mec-red"
          />
          <Check
            aria-hidden
            className="pointer-events-none relative m-auto h-4 w-4 text-mec-pure opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
          />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-mec-ink">Add Custom Logo</span>
            <span className="rounded-pill bg-mec-red/10 px-2.5 py-0.5 text-xs font-medium text-mec-red">
              Optional
            </span>
          </span>
          <span className="mt-0.5 block text-sm text-mec-ink/70">
            Personalize this mat with your company logo, colours, or design.
          </span>
        </span>
      </label>

      {value.enabled && (
        <div className="mt-4">
          <div
            className={`flex flex-col gap-4 rounded-md border-2 border-dashed px-5 py-4 sm:flex-row sm:items-center ${
              value.error ? "border-mec-red/60 bg-mec-red/5" : "border-black/20"
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center text-mec-ink sm:border-r sm:border-black/15 sm:pr-4 sm:w-16">
                {value.uploading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-mec-red" aria-hidden />
                ) : value.logo ? (
                  <FileImage className="h-7 w-7 text-mec-red" aria-hidden />
                ) : (
                  <CloudUpload className="h-7 w-7" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-mec-ink">Upload Logo Image</p>
                {value.uploading ? (
                  <p className="text-sm text-mec-ink/70" role="status">Uploading…</p>
                ) : value.logo ? (
                  <p className="flex min-w-0 items-center gap-1.5 text-sm text-mec-ink">
                    <span className="truncate" title={value.logo.fileName}>
                      {value.logo.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label={`Remove ${value.logo.fileName}`}
                      className="shrink-0 rounded-sm p-0.5 text-mec-ink/50 transition hover:text-mec-red"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-mec-ink/70">PNG, JPG, or PDF (max 10 MB)</p>
                )}
              </div>
            </div>
            <input
              ref={inputRef}
              id={`${id}-file`}
              type="file"
              accept={LOGO_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ""; // allow re-choosing the same file
                if (file) void handleFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={value.uploading}
              className="shrink-0 border border-mec-red px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-red transition hover:bg-mec-red hover:text-mec-pure disabled:cursor-not-allowed disabled:opacity-50"
            >
              {value.logo ? "Replace File" : "Choose File"}
            </button>
          </div>
          {value.error && (
            <p className="mt-2 text-sm text-mec-red" role="alert">
              {value.error}
            </p>
          )}
          {!value.uploading && !value.logo && !value.error && (
            <p className="mt-2 text-xs text-mec-ink/60">
              Upload your logo to add this mat to your quote, or untick the box.
            </p>
          )}
          <p className="mt-4 flex items-start gap-2 text-sm text-mec-ink/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Our team will review your logo and confirm artwork, pricing, and lead time in your quote.
          </p>
        </div>
      )}
    </div>
  );
}
