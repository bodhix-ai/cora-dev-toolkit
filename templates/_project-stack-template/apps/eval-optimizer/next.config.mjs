/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@{project}/api-client",
    "@{project}/shared-types",
  ],
  reactStrictMode: true,
  experimental: { typedRoutes: false },
};
export default nextConfig;