import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server output for a small Docker image. Gated behind an env
  // var so local `next build` on Windows isn't broken by symlink tracing (EPERM).
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Monorepo root, so dependency tracing includes the workspace packages.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  transpilePackages: ["@superscout/core"],
  // No "X-Powered-By: Next.js" — it tells a scanner which CVE list to try.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Geolocation stays available to our own pages for a future
          // "dichtbij" filter; everything else a deals site never needs.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        // Store favicons change about once a rebrand; the default max-age=0
        // re-validated them on every card render.
        source: "/store-icons/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
