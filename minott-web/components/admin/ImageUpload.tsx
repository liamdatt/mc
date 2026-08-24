"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const PLACEHOLDER = "/images/product-placeholder.png";

/**
 * Shows the current image and an "Upload / replace" control. Posts the file to
 * /api/admin/upload with the target (productId OR variantId); the route stores
 * the image and updates the DB, then we refresh to reflect it. With no target
 * (create-product form) the file is only stored — the caller receives the path
 * via onUploaded and is responsible for saving it.
 */
export function ImageUpload({
  current,
  productId,
  variantId,
  size = 96,
  onUploaded,
}: {
  current: string | null;
  productId?: number;
  variantId?: number;
  size?: number;
  onUploaded?: (path: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (variantId != null) fd.append("variantId", String(variantId));
      else if (productId != null) fd.append("productId", String(productId));
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !data.path) {
        setError(data.error ?? "Upload failed.");
      } else {
        setPreview(data.path);
        onUploaded?.(data.path);
        router.refresh();
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-sm border border-black/10 bg-mec-mist"
        style={{ width: size, height: size }}
      >
        <Image
          key={preview ?? PLACEHOLDER}
          src={preview || PLACEHOLDER}
          alt="Current image"
          fill
          sizes={`${size}px`}
          className="object-contain p-1"
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-fit rounded-sm border border-mec-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink transition hover:border-mec-red hover:text-mec-red disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload / replace"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onChange}
          className="hidden"
        />
        {error && <span className="text-xs text-mec-red">{error}</span>}
      </div>
    </div>
  );
}
