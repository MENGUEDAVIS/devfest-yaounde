import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
    allowedDevOrigins: ["http://localhost:3000", "192.168.100.15"],
};

export default withNextIntl(nextConfig);
