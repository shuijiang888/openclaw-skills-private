import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Prisma 的 model delegate 在 Turbopack 打包进 RSC 时可能变为 undefined（findMany 报错），须从 Node 原样加载 */
  serverExternalPackages: ["@prisma/client", "prisma"],
  /** Next.js 16 默认阻止非 localhost 的 dev 资源请求；允许 127.0.0.1 和局域网访问 */
  allowedDevOrigins: ["127.0.0.1", "10.0.0.0/8", "192.168.0.0/16", "172.16.0.0/12"],
};

export default nextConfig;
