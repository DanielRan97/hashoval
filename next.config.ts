import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Admin-only product form uploads images (validated to 5MB in lib/uploads.ts);
    // the extra headroom covers the other form fields.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
