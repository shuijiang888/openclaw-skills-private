import type { ReactNode } from "react";

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl ${className}`.trim()}>
      {children}
    </div>
  );
}
