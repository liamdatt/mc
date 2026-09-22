"use client";

import { useEffect, useState } from "react";

type Phase = "idle" | "working" | "done" | "error";

const btn =
  "inline-flex items-center gap-2 rounded-sm border border-mec-ink/20 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:cursor-wait disabled:opacity-70 disabled:hover:border-mec-ink/20 disabled:hover:text-mec-ink/80";

/**
 * Downloads the catalog workbook from /api/admin/products/export. The export
 * is one request that takes ~20 s for several hundred SKUs, so the button
 * shows a busy state with elapsed time instead of leaving the page silent.
 */
export function ExportCatalogButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (phase !== "working") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(() => setPhase("idle"), 4000);
    return () => window.clearTimeout(id);
  }, [phase]);

  async function run() {
    setSeconds(0);
    setPhase("working");
    setError(null);
    try {
      const res = await fetch("/api/admin/products/export", { credentials: "same-origin" });
      if (!res.ok) throw new Error(res.status === 401 ? "Your session has expired. Sign in again." : `Export failed (${res.status}).`);
      const blob = await res.blob();
      const match = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = match?.[1] ?? "mec-catalog.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
      setPhase("error");
    }
  }

  const working = phase === "working";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={working}
        aria-busy={working}
        className={btn}
        title="Download the full catalog as an Excel workbook with product images"
      >
        {working && (
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mec-ink/20 border-t-mec-red motion-reduce:animate-none"
          />
        )}
        {working ? `Preparing export… ${seconds}s` : phase === "done" ? "Downloaded ✓" : "Export to Excel"}
      </button>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-mec-ink/60">
        {working && "Building the workbook and product thumbnails — usually 15–30 seconds."}
        {phase === "error" && <span className="text-mec-red">{error}</span>}
      </p>
    </div>
  );
}
