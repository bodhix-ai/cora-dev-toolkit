/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Required for Docker deployment
  transpilePackages: [
    "@{{PROJECT_NAME}}/api-client",
    "@{{PROJECT_NAME}}/shared-types",
    "@{{PROJECT_NAME}}/shared",
    "@{{PROJECT_NAME}}/contracts",
    "@{{PROJECT_NAME}}/module-access",
    "@{{PROJECT_NAME}}/module-ai",
    "@{{PROJECT_NAME}}/module-chat",
    "@{{PROJECT_NAME}}/module-kb",
    "@{{PROJECT_NAME}}/module-mgmt",
    "@{{PROJECT_NAME}}/module-ws",
    "@{{PROJECT_NAME}}/module-eval",
    "@{{PROJECT_NAME}}/module-voice",
  ],
  reactStrictMode: true,
  experimental: { typedRoutes: false },
};
export default nextConfig;