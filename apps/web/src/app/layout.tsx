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
  // Fallback verification path for Search Console / Bing Webmaster. Read at
  // render time (metadata is server-only, so no NEXT_PUBLIC_ needed); an unset
  // value omits the tag rather than emitting an empty, invalid one.
  // DNS TXT verification is preferred — it survives rebuilds and covers every
  // subdomain — but this keeps the meta route open.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : {},
  },
  // NB: no `alternates.canonical` here — layout metadata cascades to every
  // child route, which would silently canonicalise /privacy, /ethiek etc. to
  // the homepage and get them dropped. `types` is safe to cascade: a reader
  // finding the site feed from any page is the intended behaviour.
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: "SuperScout — alle aanbiedingen" }],
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
      alternateName: "SuperScout.nl",
      url: SITE_URL,
      // The logo + explicit description are what let Google separate this
      // entity from the unrelated superscout.co that currently owns the
      // "superscout" query. Entity clarity is the lever on a brand term.
      logo: {
        "@type": "ImageObject",
        "@id": `${SITE_URL}/#logo`,
        url: `${SITE_URL}/icon.svg`,
        contentUrl: `${SITE_URL}/icon.svg`,
        caption: "SuperScout",
      },
      image: { "@id": `${SITE_URL}/#logo` },
      description: DESCRIPTION,
      areaServed: { "@type": "Country", name: "Nederland" },
      knowsLanguage: "nl-NL",
      founder: { "@type": "Person", name: "Stijn van de Pol", url: "https://stijnvandepol.nl" },
      sameAs: ["https://stijnvandepol.nl"],
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
