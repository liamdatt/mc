"use client";
import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

// TODO: replace name/bio/role placeholders with real executive data from client.
// TODO: replace /images/person-placeholder.png with individual headshots
//       once professional photos are received from client.
const TEAM = [
  { role: "CEO", name: "Name Here", bio: "Leads the company with vision, passion, and a commitment to excellence." },
  { role: "CFO", name: "Name Here", bio: "Drives financial strategy and ensures long-term sustainability and growth." },
  { role: "COO", name: "Name Here", bio: "Oversees daily operations and ensures we deliver on our promises." },
  { role: "GM", name: "Name Here", bio: "Manages performance and builds strong customer and supplier partnerships." },
  { role: "Director", name: "Name Here", bio: "Supports strategic initiatives and drives business development." },
];

export function LeadershipTeam() {
  return (
    <Section tone="dark" id="leadership">
      <Container>
        <div className="flex items-center justify-center gap-6">
          <span aria-hidden className="h-px w-16 bg-mec-red/50" />
          <h2 className="text-center font-display text-[clamp(1.75rem,3vw,2.75rem)] tracking-wide text-mec-pure">
            Executive Leadership Team
          </h2>
          <span aria-hidden className="h-px w-16 bg-mec-red/50" />
        </div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5"
        >
          {TEAM.map(({ role, name, bio }) => (
            <motion.li
              key={role}
              variants={{
                hidden: { opacity: 0, y: 32 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="group flex flex-col overflow-hidden rounded-md border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:border-white/30 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.25)]"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-mec-graphite">
                <Image
                  src="/images/person-placeholder.png"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 18vw, (min-width: 640px) 45vw, 90vw"
                  className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mec-ink to-transparent p-4 pt-10">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-mec-red">
                    {role}
                  </p>
                  <p className="mt-1 font-display text-xl text-mec-pure">{name}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <p className="text-sm leading-relaxed text-mec-pure/70">{bio}</p>
                <Link
                  href="/about#leadership"
                  data-cursor="View"
                  className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-mec-red transition-colors hover:text-mec-pure"
                >
                  View Profile
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
