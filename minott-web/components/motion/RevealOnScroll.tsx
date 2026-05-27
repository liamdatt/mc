"use client";
import { motion, type Variants } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface Props {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  amount?: number;
  delay?: number;
  as?: "div" | "section" | "header" | "article";
}

export function RevealOnScroll({
  children,
  variants = fadeUp,
  className,
  amount = 0.3,
  delay = 0,
  as = "div",
}: Props) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      transition={{ delay }}
    >
      {children}
    </Tag>
  );
}
