/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export: `next build` emits a self-contained `out/` directory that
  // FastAPI serves in production (the quantiom pattern). Trailing slashes make
  // deep links like /assays/<slug>/ resolve to index.html under StaticFiles.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    // Base URL for runtime API calls (clone). Empty = same origin (production,
    // where FastAPI serves both). In dev the API runs on :8000 — see README.
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "",
  },
};

export default nextConfig;
