/**
 * 获取 Next.js basePath，用于客户端 fetch 调用。
 * 生产部署在 /profit/ 下时，fetch("/api/...") 会 404，
 * 需要改为 fetch("/profit/api/...")。
 */
export function getClientBasePath(): string {
  if (typeof window === "undefined") return "";
  const nd = (window as unknown as { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__;
  return nd?.basePath ?? "";
}

export function apiUrl(path: string): string {
  const bp = getClientBasePath();
  if (path.startsWith("/")) return `${bp}${path}`;
  return `${bp}/${path}`;
}
