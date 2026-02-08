/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@{{PROJECT_NAME}}/api-client",
    "@{{PROJECT_NAME}}/shared-types",
  ],
  reactStrictMode: true,
  experimental: { typedRoutes: false },
};
export default nextConfig;