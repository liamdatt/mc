"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Printer } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const DIRECTIONS_HREF =
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    "14½ Retirement Road, Kingston 5, Jamaica",
  )}`;

const PHONES = [
  { tel: "+18769295284", label: "(876) 929-5284" },
  { tel: "+18769293132", label: "929-3132" },
  { tel: "+18769295147", label: "929-5147" },
];

export function LocationContact() {
  return (
    <Section tone="light" pad>
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <BrandedMap />

          <div className="flex flex-col justify-center">
            <p>
              <Eyebrow tone="red">Find Us</Eyebrow>
            </p>
            <h2 className="mt-6 font-display-tight text-h2">
              14½ Retirement Road. <br />
              <span className="text-mec-red">Kingston 5.</span>
            </h2>

            <ul className="mt-10 space-y-5 text-mec-ink/85">
              <InfoRow icon={MapPin}>
                14½ Retirement Road, Kingston 5, Jamaica
              </InfoRow>
              <InfoRow icon={Clock}>Mon–Fri, 8:00 AM – 4:30 PM</InfoRow>
              <InfoRow icon={Phone}>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {PHONES.map((p) => (
                    <a
                      key={p.tel}
                      href={`tel:${p.tel}`}
                      className="font-semibold underline-offset-4 hover:text-mec-red hover:underline"
                      data-cursor="Call"
                    >
                      {p.label}
                    </a>
                  ))}
                </div>
              </InfoRow>
              <InfoRow icon={Printer}>Fax: (876) 929-5228</InfoRow>
              <InfoRow icon={Mail}>
                <a
                  href="mailto:sales@minottchem.com"
                  className="font-semibold underline-offset-4 hover:text-mec-red hover:underline"
                  data-cursor="Email"
                >
                  sales@minottchem.com
                </a>
              </InfoRow>
            </ul>

            <div className="mt-10">
              <Button
                href={DIRECTIONS_HREF}
                variant="primary"
                arrow
                external
              >
                Get Directions
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="mt-1 inline-grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mec-red/10 text-mec-red">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="leading-relaxed">{children}</div>
    </li>
  );
}

function BrandedMap() {
  const reduced = useReducedMotion();
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-mec-ink text-mec-pure">
      <svg
        viewBox="0 0 600 600"
        className="absolute inset-0 h-full w-full"
        aria-label="Stylized map showing the Minott Chemicals location at 14 1/2 Retirement Road, Kingston 5, Jamaica"
        role="img"
      >
        <defs>
          <pattern
            id="map-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="600" height="600" fill="url(#map-grid)" />

        <g stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none">
          <path d="M 0 180 L 600 220" />
          <path d="M 0 320 L 600 360" />
          <path d="M 0 460 L 600 500" />
          <path d="M 150 0 L 200 600" />
          <path d="M 360 0 L 410 600" />
        </g>

        <path
          d="M 0 340 L 600 380"
          stroke="rgba(225,6,0,0.4)"
          strokeWidth="3"
          fill="none"
        />
        <text
          x="40"
          y="332"
          fill="rgba(225,6,0,0.7)"
          fontSize="11"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="2"
        >
          RETIREMENT ROAD
        </text>

        <rect
          x="280"
          y="350"
          width="40"
          height="32"
          fill="rgba(225,6,0,0.18)"
          stroke="rgba(225,6,0,0.5)"
          strokeWidth="1"
        />

        <g>
          <circle cx="300" cy="360" r="22" fill="none" stroke="#E10600" strokeWidth="3">
            {!reduced && (
              <>
                <animate
                  attributeName="r"
                  from="22"
                  to="44"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="1"
                  to="0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </>
            )}
          </circle>
          <circle cx="300" cy="360" r="10" fill="#E10600" />
          <circle cx="300" cy="360" r="3.5" fill="#FFFFFF" />
        </g>

        <text
          x="540"
          y="40"
          fill="rgba(255,255,255,0.5)"
          fontSize="10"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="2"
          textAnchor="end"
        >
          18.0179° N · 76.7972° W
        </text>
      </svg>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-6 left-6 right-6 rounded-md border border-white/15 bg-white/10 p-5 backdrop-blur-md"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mec-pure/80">
          Minott Equipment & Chemicals
        </p>
        <p className="mt-1 font-display text-2xl">Kingston 5, Jamaica</p>
      </motion.div>
    </div>
  );
}
