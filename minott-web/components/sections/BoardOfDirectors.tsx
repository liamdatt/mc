"use client";
import Image from "next/image";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { motion } from "framer-motion";

// TODO: replace name/title placeholders with real board member data from client.
// TODO: replace /images/person-placeholder.png with individual headshots
//       once professional photos are received from client.
const BOARD = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  name: "Name Here",
  title: "Board Member",
}));

export function BoardOfDirectors() {
  return (
    <Section tone="light" id="board">
      <Container>
        <div className="flex items-center justify-center gap-6">
          <span aria-hidden className="h-px w-16 bg-mec-red/40" />
          <h2 className="text-center font-display text-[clamp(1.75rem,3vw,2.75rem)] tracking-wide text-mec-ink">
            Board of Directors
          </h2>
          <span aria-hidden className="h-px w-16 bg-mec-red/40" />
        </div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6"
        >
          {BOARD.map((member) => (
            <motion.li
              key={member.id}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-mec-mist">
                <Image
                  src="/images/person-placeholder.png"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover opacity-80"
                />
              </div>
              <p className="mt-4 font-display text-lg tracking-wide text-mec-ink">
                {member.name}
              </p>
              <p className="text-xs uppercase tracking-[0.14em] text-mec-ink/60">
                {member.title}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
