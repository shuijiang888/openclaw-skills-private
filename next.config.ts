import type { NextConfig } from "next";

/**
 * Next.js 16+ 在 dev 下会拦截跨源对 /_next/* 等资源的请求；列表项为 **主机名**（可含 `*.` 子域通配），
 * 不是 CIDR。见 https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
const defaultAllowedDevOrigins: string[] = [
  "127.0.0.1",
  // 常见 RFC1918 / 链路本地（子域通配，避免误写成无效的 x.x.x.x/y 字符串）
  "*.local",
  "10.*.*.*",
  "172.*.*.*",
  "192.168.*.*",
  // Cursor / 云 IDE / 隧道 预览域名（按需继续用环境变量追加）
  "*.cursor.sh",
  "*.cursor.com",
  "*.cursor.dev",
  "*.gitpod.io",
  "*.github.dev",
  "*.codespaces.dev",
  "*.vercel.app",
  "*.ngrok.io",
  "*.ngrok-free.app",
  "*.trycloudflare.com",
  "*.loca.lt",
];

function extraOriginsFromEnv(): string[] {
  const raw = process.env.NEXT_EXTRA_ALLOWED_DEV_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const nextConfig: NextConfig = {
  output: "standalone",
  /** Prisma 的 model delegate 在 Turbopack 打包进 RSC 时可能变为 undefined（findMany 报错），须从 Node 原样加载 */
  serverExternalPackages: ["@prisma/client", "prisma"],
  allowedDevOrigins: [...defaultAllowedDevOrigins, ...extraOriginsFromEnv()],
};

export default nextConfig;
