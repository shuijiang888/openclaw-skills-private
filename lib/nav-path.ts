const PROFIT_BASE_PATH = "/profit";

export function normalizeNavPath(pathname: string | null | undefined): string {
  const p = pathname ?? "/";
  if (p === PROFIT_BASE_PATH) return "/";
  if (p.startsWith(`${PROFIT_BASE_PATH}/`)) {
    return p.slice(PROFIT_BASE_PATH.length);
  }
  return p;
}

export function isZtConsolePath(pathname: string | null | undefined): boolean {
  const p = normalizeNavPath(pathname);
  return (
    p.startsWith("/console/system") ||
    p.startsWith("/console/users") ||
    p.startsWith("/console/zt-system") ||
    p.startsWith("/console/zt-users")
  );
}

export function isZtPath(pathname: string | null | undefined): boolean {
  const p = normalizeNavPath(pathname);
  return p.startsWith("/zt007") || p.startsWith("/personal") || isZtConsolePath(p);
}
