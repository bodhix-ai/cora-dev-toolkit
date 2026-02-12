/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@{{PROJECT_NAME}}/api-client",
    "@{{PROJECT_NAME}}/shared-types",
    "@{{PROJECT_NAME}}/module-access",
    "@{{PROJECT_NAME}}/module-ai",
    "@{{PROJECT_NAME}}/module-ws",
    "@{{PROJECT_NAME}}/module-mgmt",
    "@{{PROJECT_NAME}}/module-kb",
    "@{{PROJECT_NAME}}/module-chat",
  ],
  reactStrictMode: true,
  experimental: { typedRoutes: false },
};
export default nextConfig;
