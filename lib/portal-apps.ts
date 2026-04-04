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

function resolveIntelligenceEntry(): { href: string; external: boolean } {
  const raw = process.env.NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL?.trim();
  /** 默认同域子路径：与 Nginx `location /intel/` 一致，免混合内容、不依赖写死 IP */
  const href = raw || "/intel/";
  const external = /^https?:\/\//i.test(href);
  return { href, external };
}

export function getPortalApps(): PortalAppDef[] {
  const { href: intelligenceHref, external: intelligenceExternal } =
    resolveIntelligenceEntry();

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
      subtitle: "情报汇聚、检索与研判（由 Nginx 在 /intel/ 提供静态或反代）。",
      href: intelligenceHref,
      external: intelligenceExternal,
      accent: "cyan",
    },
  ];
}
