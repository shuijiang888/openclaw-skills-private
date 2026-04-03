import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Prisma 的 model delegate 在 Turbopack 打包进 RSC 时可能变为 undefined（findMany 报错），须从 Node 原样加载 */
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
