"use client";

import { withClientBasePath } from "@/lib/client-url";

/**
 * 纷享销客品牌露出：默认读取 public/brands/fxiaoke/logo.svg。
 * 若使用 PNG，将常量改为 "/brands/fxiaoke/logo.png" 并放入对应文件即可。
 */
export const FXIAOKE_LOGO_SRC = "/brands/fxiaoke/logo.svg";

const FXIAOKE_URL = "https://www.fxiaoke.com";

export function FxiaokeBrandBadge({
  variant = "nav",
  className = "",
}: {
  variant?: "nav" | "compact" | "footer";
  className?: string;
}) {
  const hClass =
    variant === "compact"
      ? "h-[22px]"
      : variant === "footer"
        ? "h-5"
        : "h-7 sm:h-8";
  const pad =
    variant === "footer"
      ? "rounded-md px-2 py-1"
      : "rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5";

  return (
    <a
      href={FXIAOKE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="纷享销客 · 了解连接型 CRM"
      className={`inline-flex shrink-0 items-center border border-blue-200/90 bg-blue-50/90 shadow-sm transition hover:border-blue-300 hover:bg-blue-100/90 dark:border-blue-900/60 dark:bg-blue-950/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/80 ${pad} ${className}`}
    >
      <img
        src={withClientBasePath(FXIAOKE_LOGO_SRC)}
        alt="纷享销客"
        className={`${hClass} w-auto max-w-[min(148px,40vw)] object-contain object-left`}
      />
    </a>
  );
}
