"use client";
import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useInView,
  animate,
} from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function AnimatedNumber({
  to,
  suffix = "",
  duration = 1.2,
  className,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const v = useMotionValue(0);
  const rounded = useTransform(v, (latest) => Math.round(latest));

  // framer's imperative animate() is not covered by MotionRoot's
  // reducedMotion="user", so gate it here: jump straight to the final value.
  useEffect(() => {
    if (reduced) {
      v.set(to);
      return;
    }
    if (inView) {
      const controls = animate(v, to, {
        duration,
        ease: [0.16, 1, 0.3, 1],
      });
      return controls.stop;
    }
  }, [reduced, inView, to, duration, v]);

  return (
    <span ref={ref} className={className}>
      {reduced ? <span>{to}</span> : <motion.span>{rounded}</motion.span>}
      {suffix}
    </span>
  );
}
