/**
 * 统一门户可调度的子系统列表。新增系统时在此追加一项即可。
 * 外部系统 URL 通过环境变量配置，便于按环境切换域名、路径与端口。
 */
export type PortalAppAccent = "amber" | "cyan" | "violet";

export type PortalAppDef = {
  id: string;
  title: string;
  subtitle: string;
  /** 站内相对路径或站外绝对 URL */
  href: string;
  external?: boolean;
  accent: PortalAppAccent;
};

export function getPortalApps(): PortalAppDef[] {
  const intelligenceUrl =
    process.env.NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL?.trim() ||
    "http://119.45.205.137/";

  return [
    {
      id: "profit",
      title: "制造业盈利管理系统",
      subtitle: "报价、分层审批与盈利罗盘，统一利润决策入口。",
      href: "/dashboard",
      accent: "amber",
    },
    {
      id: "intelligence",
      title: "智能情报系统",
      subtitle: "情报汇聚、检索与研判（部署于独立服务）。",
      href: intelligenceUrl,
      external: true,
      accent: "cyan",
    },
  ];
}
