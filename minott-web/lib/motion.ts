import type { Variants } from "framer-motion";
import { easing, durations } from "./tokens";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.md, ease: easing.outExpo },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.md, ease: easing.outExpo },
  },
};

export const stagger = (delayChildren = 0, stagger = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

export const clipReveal: Variants = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  visible: {
    clipPath: "inset(0 0 0% 0)",
    transition: { duration: durations.xl, ease: easing.outExpo },
  },
};
