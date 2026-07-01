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
};

export default nextConfig;
