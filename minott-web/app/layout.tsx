import type { Metadata } from "next";
import { Bebas_Neue, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { CustomCursor } from "@/components/motion/CustomCursor";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { PageLoadCurtain } from "@/components/layout/PageTransition";
import { QuoteCartProvider } from "@/components/quote/QuoteCartProvider";
import { getCategories } from "@/lib/products";

// The site is DB-backed and edited live via /admin, so render on demand
// (rather than prerendering at build time) — this keeps the nav category
// dropdown and all catalog pages in sync with admin changes. Applies to every
// route as a root-layout segment config.
export const dynamic = "force-dynamic";

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://minottchem.com"),
  title:
    "Minott Chemicals — Jamaica's Most Trusted Partner in Clean | Industrial & Janitorial Supplies",
  description:
    "Jamaica's largest supplier of chemicals, janitorial equipment, and PPE. Elite Distributor for 3M, NSS, San Jamar, Rubbermaid Commercial, and Purell. 35+ years serving Jamaican businesses. Request a quote in one business day.",
  openGraph: {
    title: "Minott Chemicals — Cleaner Spaces. Stronger Business.",
    description:
      "Jamaica's largest chemical & janitorial supplier. Elite Distributor for 3M, NSS, San Jamar, Rubbermaid, Purell.",
    type: "website",
    locale: "en_JM",
    siteName: "Minott Chemicals",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const categories = await getCategories();
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${montserrat.variable} ${jetbrains.variable}`}
    >
      <body className="bg-mec-pure text-mec-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "Minott Equipment & Chemicals Limited",
              image: "https://minottchem.com/og.jpg",
              url: "https://minottchem.com",
              telephone: "+1-876-929-5284",
              email: "sales@minottchem.com",
              priceRange: "$$",
              address: {
                "@type": "PostalAddress",
                streetAddress: "14 1/2 Retirement Road",
                addressLocality: "Kingston 5",
                addressCountry: "JM",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 18.0179,
                longitude: -76.7972,
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                  ],
                  opens: "08:00",
                  closes: "16:30",
                },
              ],
              sameAs: ["https://facebook.com/minottchemicalsja"],
            }),
          }}
        />
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        <PageLoadCurtain />
        <CustomCursor />
        <ScrollProgress />
        <QuoteCartProvider>
          <MotionRoot>
            <LenisProvider>
              <PublicChrome
                categories={categories.map((c) => ({
                  slug: c.slug,
                  name: c.name,
                }))}
              >
                {children}
              </PublicChrome>
            </LenisProvider>
          </MotionRoot>
        </QuoteCartProvider>
      </body>
    </html>
  );
}
