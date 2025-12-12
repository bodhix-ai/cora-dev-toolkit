/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pm-app/ai-config-module-frontend"],
  reactStrictMode: true,
  experimental: { typedRoutes: true },
};
export default nextConfig;
