import { canAccessConsole } from "@/lib/demo-role-modules";
import type { DemoRole } from "@/lib/approval";

export function getZtShellLinks(role: DemoRole) {
  return [
    { href: "/", label: "门户" },
    { href: "/profit/zt007", label: "智探007总览" },
    { href: "/profit/zt007/strategist", label: "AI大军师" },
    { href: "/profit/zt007/linkage", label: "情报联动看板" },
    { href: "/profit/zt007/war-room", label: "作战指挥大屏" },
    { href: "/profit/zt007/action", label: "行动中心" },
    { href: "/profit/zt007/bounty", label: "悬赏任务" },
    { href: "/profit/zt007/honor", label: "荣誉积分" },
    { href: "/profit/personal", label: "我的战情台" },
    ...(canAccessConsole(role)
      ? [
          { href: "/profit/console/system", label: "系统维护" },
          { href: "/profit/console/users", label: "用户组织" },
        ]
      : []),
  ] as const;
}
