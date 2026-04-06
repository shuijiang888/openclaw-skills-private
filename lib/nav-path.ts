const PROFIT_BASE_PATH = "/profit";

function hasZtConsoleMarker(path: string): boolean {
  return (
    path.includes("/console/system") ||
    path.includes("/console/users") ||
    path.includes("/console/zt-system") ||
    path.includes("/console/zt-users")
  );
}

export function normalizeNavPath(pathname: string | null | undefined): string {
  const p = pathname ?? "/";
  if (p === PROFIT_BASE_PATH) return "/";
  if (p.startsWith(`${PROFIT_BASE_PATH}/`)) {
    return p.slice(PROFIT_BASE_PATH.length);
  }
  return p;
}

/**
 * 在客户端优先使用真实 location.pathname，避免在代理/basePath 场景下
 * usePathname() 短暂返回不完整路径导致上下文判定漂移。
 */
export function resolveClientPathname(pathname: string | null | undefined): string {
  const normalizedHook = normalizeNavPath(pathname);
  if (typeof window === "undefined") return normalizedHook;
  const normalizedWindow = normalizeNavPath(window.location.pathname);
  // 浏览器路径可用时优先它；仅在其为根路径时保留 hook 的更具体值。
  return normalizedWindow === "/" ? normalizedHook : normalizedWindow;
}

export function isZtConsolePath(pathname: string | null | undefined): boolean {
  const raw = pathname ?? "/";
  const normalized = normalizeNavPath(pathname);
  return hasZtConsoleMarker(raw) || hasZtConsoleMarker(normalized);
}

export function isZtPath(pathname: string | null | undefined): boolean {
  const p = normalizeNavPath(pathname);
  return p.startsWith("/zt007") || p.startsWith("/personal") || isZtConsolePath(p);
}

export function isZtConsoleSegment(
  segment: string | null | undefined,
): boolean {
  return (
    segment === "system" ||
    segment === "users" ||
    segment === "zt-system" ||
    segment === "zt-users"
  );
}
