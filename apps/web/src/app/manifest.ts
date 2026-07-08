import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SuperScout — supermarktaanbiedingen",
    short_name: "SuperScout",
    description: "Alle aanbiedingen van Nederlandse supermarkten op één plek. Gratis, zonder account.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfcf9",
    theme_color: "#f5a800",
    lang: "nl-NL",
    categories: ["shopping", "food"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
