/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@{{PROJECT_NAME}}/api-client",
    "@{{PROJECT_NAME}}/module-access",
    "@{{PROJECT_NAME}}/module-ai",
    "@{{PROJECT_NAME}}/module-mgmt",
  ],
  reactStrictMode: true,
  experimental: { typedRoutes: true },
};
export default nextConfig;
