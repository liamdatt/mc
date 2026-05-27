import type { Metadata } from "next";
import { Bebas_Neue, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${montserrat.variable} ${jetbrains.variable}`}
    >
      <body>
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
