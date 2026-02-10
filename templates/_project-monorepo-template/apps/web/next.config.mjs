/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@{{PROJECT_NAME}}/api-client",
    "@{{PROJECT_NAME}}/module-access",
    "@{{PROJECT_NAME}}/module-ai",
    "@{{PROJECT_NAME}}/module-mgmt",
    "@{{PROJECT_NAME}}/module-ws",
  ],
  reactStrictMode: true,
  experimental: { typedRoutes: false },
};
export default nextConfig;
