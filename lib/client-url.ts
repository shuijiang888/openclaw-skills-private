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
 * Prefix absolute app paths when running under `/profit`.
 * Keeps local root-mode development paths unchanged.
 */
export function withClientBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  const basePath = detectClientBasePath();
  if (!basePath) return path;
  if (path === basePath || path.startsWith(`${basePath}/`)) return path;
  return `${basePath}${path}`;
}
