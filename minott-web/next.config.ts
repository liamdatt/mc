import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it (and the Prisma adapter that
  // wraps it) out of the bundler so the .node binary loads at runtime.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],

  // The New Customer Form posts its Business Registration Certificate (≤ 6 MB)
  // through a Server Action; the default 1 MB body limit would reject it.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },

  async redirects() {
    // The old three-portal URLs. Specific rules first — Next matches in order.
    return [
      { source: "/admin/login", destination: "/portal/sign-in", permanent: true },
      { source: "/sales/sign-in", destination: "/portal/sign-in", permanent: true },
      { source: "/admin", destination: "/portal", permanent: true },
      { source: "/sales", destination: "/portal", permanent: true },
      { source: "/admin/:path*", destination: "/portal/:path*", permanent: true },
      { source: "/sales/:path*", destination: "/portal/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
