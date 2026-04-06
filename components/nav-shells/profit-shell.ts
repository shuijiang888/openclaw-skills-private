export type NavLink = { href: string; label: string };

export const PROFIT_NAV_SHELL: ReadonlyArray<NavLink> = [
  { href: "/", label: "门户" },
  { href: "/about", label: "价值主张" },
  { href: "/dashboard", label: "工作台" },
  { href: "/projects", label: "项目" },
  { href: "/projects/new", label: "新建报价" },
  { href: "/compass", label: "盈利罗盘" },
  { href: "/roadmap", label: "AI交付与价值服务" },
  { href: "/data-screen", label: "数据大屏" },
  { href: "/console", label: "管理后台" },
  { href: "/console/user-admin", label: "用户管理" },
] as const;
