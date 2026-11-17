import { Clock, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import {
  OPENING_HOURS,
  PHONES,
  SHOWROOM_FULL_ADDRESS,
} from "@/lib/constants";

const ADDRESS_Q = encodeURIComponent(SHOWROOM_FULL_ADDRESS);
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${ADDRESS_Q}`;
const EMBED_URL = `https://www.google.com/maps?q=${ADDRESS_Q}&output=embed`;

// Closing homepage block: showroom address, hours and phones beside an
// embedded Google map.
export function VisitShowroom() {
  return (
    <section className="relative bg-mec-mist py-16 text-mec-ink md:py-24">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:items-stretch lg:gap-16">
          <div>
            <h2 className="font-display-tight text-[clamp(2.25rem,3.6vw,3.5rem)] uppercase leading-[0.95] text-mec-ink">
              Visit Our Showroom
            </h2>

            <dl className="mt-8 divide-y divide-mec-ink/10 border-y border-mec-ink/10">
              <Row icon={MapPin} caption="Address">
                {SHOWROOM_FULL_ADDRESS}
              </Row>
              <Row icon={Clock} caption="Opening hours">
                {OPENING_HOURS}
              </Row>
              <Row icon={Phone} caption="Phone">
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  {PHONES.map((p) => (
                    <a
                      key={p.tel}
                      href={`tel:${p.tel}`}
                      data-cursor="Call"
                      className="underline-offset-4 hover:text-mec-red hover:underline"
                    >
                      {p.label}
                    </a>
                  ))}
                </span>
              </Row>
            </dl>

            <Button
              href={DIRECTIONS_URL}
              external
              variant="primary"
              arrow
              className="mt-8"
            >
              Get Directions
            </Button>
          </div>

          <div className="h-[320px] overflow-hidden rounded-lg border border-mec-ink/10 shadow-card lg:h-full lg:min-h-[420px]">
            <iframe
              src={EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map to Minott Equipment & Chemicals showroom"
              className="h-full w-full border-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  caption,
  children,
}: {
  icon: typeof MapPin;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 py-5">
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-mec-red" />
      <div>
        <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-mec-ink/55">
          {caption}
        </dt>
        <dd className="mt-1 text-base font-medium text-mec-ink">{children}</dd>
      </div>
    </div>
  );
}
