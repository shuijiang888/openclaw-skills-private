"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { withClientBasePath } from "@/lib/client-url";

export function PortalHomeButton() {
  const pathname = usePathname();
  const isZtContext =
    pathname.startsWith("/zt007") ||
    pathname.startsWith("/personal") ||
    pathname.startsWith("/console/system") ||
    pathname.startsWith("/console/users") ||
    pathname.startsWith("/console/zt-system") ||
    pathname.startsWith("/console/zt-users");
  return (
    <Link
      href={withClientBasePath("/")}
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-900/25 transition hover:bg-cyan-400 sm:bottom-6 sm:right-6"
      title={isZtContext ? "返回智探007门户" : "返回盈利系统门户"}
    >
      <span aria-hidden>🏠</span>
      {isZtContext ? "返回智探007门户" : "返回盈利系统门户"}
    </Link>
  );
}
