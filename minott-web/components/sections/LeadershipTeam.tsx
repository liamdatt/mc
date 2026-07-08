"use client";
import Image from "next/image";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { motion } from "framer-motion";

// Headshots are the client-supplied professional photos.
const TEAM = [
  {
    role: "CEO",
    name: "Mileydi Minott",
    bio: "Leads the company with vision, passion, and a commitment to excellence.",
    img: "/images/team/ceo.jpg",
  },
  {
    role: "COO",
    name: "Tamara Taylor Gordon",
    bio: "Oversees daily operations and ensures we deliver on our promises.",
    img: "/images/team/coo.jpg",
  },
  {
    role: "General Manager",
    name: "Jacqueline Ebanks",
    bio: "Manages performance and builds strong customer and supplier partnerships.",
    img: "/images/team/general-manager.jpg",
  },
  {
    role: "Operations Manager",
    name: "Mia Minott",
    bio: "Keeps our operations running smoothly so we deliver reliably, every time.",
    img: "/images/team/business-development-manager.png",
  },
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
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TEAM.map(({ role, name, bio, img }) => (
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
                  src={img}
                  alt={`${role}, Minott Equipment & Chemicals`}
                  fill
                  sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 90vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mec-ink to-transparent p-4 pt-10">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-mec-red">
                    {role}
                  </p>
                  <p className="mt-1 font-display text-xl text-mec-pure">{name}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm leading-relaxed text-mec-pure/70">{bio}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
