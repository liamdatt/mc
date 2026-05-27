"use client";
import { useEffect, useState } from "react";

export function PageLoadCurtain() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`page-loader ${done ? "is-done" : ""}`} aria-hidden>
      <div className="page-loader__bar" />
    </div>
  );
}
