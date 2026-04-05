import type { ReactNode } from "react";

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-1 sm:px-2 lg:px-3 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
