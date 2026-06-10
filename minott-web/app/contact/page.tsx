import type { Metadata } from "next";
import { LocationContact } from "@/components/sections/LocationContact";
import { ContactForm } from "@/components/sections/ContactForm";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { MessageCircle } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact — Minott Chemicals | Kingston 5, Jamaica",
  description:
    "Reach Minott Equipment & Chemicals in Kingston 5. Call (876) 929-5284, message us on WhatsApp, or send a message and we'll respond within one business day.",
};

export default function ContactPage() {
  return (
    <>
      <Section tone="light" className="pt-40" pad={false}>
        <Container>
          <Eyebrow tone="red">Contact</Eyebrow>
          <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
            Let&apos;s talk supply.
          </h1>
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            Send us a message and a sales consultant will follow up within one
            business day — or connect with us on{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-4 hover:text-mec-red"
            >
              WhatsApp
            </a>{" "}
            as your preferred method of communication.
          </p>

          <div className="mt-10">
            <a
              href="https://wa.me/18769295284"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-pill bg-[#25D366] px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90"
              data-cursor="Chat"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Chat on WhatsApp
            </a>
          </div>

          <div className="mt-12 max-w-3xl">
            <ContactForm />
          </div>
        </Container>
      </Section>
      <LocationContact />
    </>
  );
}
