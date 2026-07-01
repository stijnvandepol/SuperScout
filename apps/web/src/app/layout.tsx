import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--f-display",
});
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--f-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: "SuperScout — alle supermarktaanbiedingen op één plek",
  description:
    "Vind de beste aanbieding van Albert Heijn, Jumbo, Dirk en Plus in één zoekopdracht. Nooit meer folders doorbladeren.",
  applicationName: "SuperScout",
  openGraph: {
    title: "SuperScout — alle supermarktaanbiedingen op één plek",
    description: "Vind de beste aanbieding in één zoekopdracht.",
    type: "website",
    locale: "nl_NL",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e110c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
