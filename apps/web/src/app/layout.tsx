import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BottomNav } from "@/components/BottomNav";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--f-display",
});
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--f-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--f-mono" });

const TITLE = "SuperScout — alle supermarktaanbiedingen van deze week op één plek";
const DESCRIPTION =
  "Vergelijk de aanbiedingen van deze week van Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk, Hoogvliet, DekaMarkt, Poiesz en Sligro in één zoekopdracht. Dagelijks ververst, zonder account en zonder tracking.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — SuperScout" },
  description: DESCRIPTION,
  applicationName: "SuperScout",
  keywords: [
    "aanbiedingen",
    "supermarkt aanbiedingen",
    "aanbiedingen deze week",
    "folder",
    "korting",
    "AH bonus",
    "Jumbo aanbiedingen",
    "Lidl aanbiedingen",
    "ALDI aanbiedingen",
    "PLUS aanbiedingen",
    "Dirk aanbiedingen",
    "boodschappen besparen",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "nl_NL",
    url: SITE_URL,
    siteName: "SuperScout",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e110c" },
  ],
};

// Sitelinks searchbox + publisher info for search engines.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "SuperScout",
      description: DESCRIPTION,
      inLanguage: "nl-NL",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "SuperScout",
      url: SITE_URL,
      founder: { "@type": "Person", name: "Stijn van de Pol", url: "https://stijnvandepol.nl" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <JsonLd data={JSON_LD} />
        <SiteHeader />
        <main className="pb-24 md:pb-16">{children}</main>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
