"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PROFIT_DATA_CHANGED } from "@/lib/profit-data-events";

/** 挂载在根布局：收到变更事件后刷新当前路由的 Server Components，与 SQLite 对齐 */
export function DataSyncListener() {
  const router = useRouter();
  useEffect(() => {
    const handler = () => {
      router.refresh();
    };
    window.addEventListener(PROFIT_DATA_CHANGED, handler);
    return () => window.removeEventListener(PROFIT_DATA_CHANGED, handler);
  }, [router]);
  return null;
}
