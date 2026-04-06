const PROFIT_SUBPATH = "/profit";

function detectClientBasePath(): string {
  if (typeof window === "undefined") return "";
  const pathname = window.location.pathname;
  if (pathname === PROFIT_SUBPATH || pathname.startsWith(`${PROFIT_SUBPATH}/`)) {
    return PROFIT_SUBPATH;
  }
  return "";
}

/**
 * 为客户端 fetch 添加 basePath 前缀。
 * 线上部署在 /profit/ 下时自动加前缀，本地开发时不加。
 * 逻辑与 Agent1 线上 lib/client-url.ts 的 withClientBasePath 一致。
 */
export function apiUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  const basePath = detectClientBasePath();
  if (!basePath) return path;
  if (path === basePath || path.startsWith(`${basePath}/`)) return path;
  return `${basePath}${path}`;
}
