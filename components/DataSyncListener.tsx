"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PROFIT_DATA_CHANGED } from "@/lib/profit-data-events";
import { DEMO_ROLE_CHANGE_EVENT } from "@/components/RoleSwitcher";

/** 挂载在根布局：收到数据变更或角色切换事件后刷新 Server Components */
export function DataSyncListener() {
  const router = useRouter();
  useEffect(() => {
    const handler = () => {
      router.refresh();
    };
    window.addEventListener(PROFIT_DATA_CHANGED, handler);
    window.addEventListener(DEMO_ROLE_CHANGE_EVENT, handler);
    return () => {
      window.removeEventListener(PROFIT_DATA_CHANGED, handler);
      window.removeEventListener(DEMO_ROLE_CHANGE_EVENT, handler);
    };
  }, [router]);
  return null;
}
