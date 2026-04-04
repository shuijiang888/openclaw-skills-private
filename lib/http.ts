import type { DemoRole } from "./approval";
import { parseDemoRole } from "./approval";
import { isSessionAuthMode } from "./auth-mode";
import { parseZtUserRole, type ZtUserRole } from "./zt-ranks";

/** 请求对应的执行角色：session 模式仅信任中间件注入的会话头，忽略 x-demo-role */
export function demoRoleFromRequest(req: Request): DemoRole {
  if (isSessionAuthMode()) {
    return parseDemoRole(req.headers.get("x-profit-session-role"));
  }
  return parseDemoRole(req.headers.get("x-demo-role"));
}

/** 智探007 使用角色：session 模式优先取会话注入，其次回退 demo role 映射 */
export function ztRoleFromRequest(req: Request): ZtUserRole {
  if (isSessionAuthMode()) {
    return parseZtUserRole(req.headers.get("x-profit-session-zt-role"));
  }
  // 演示模式下，沿用 demo role
  return parseZtUserRole(req.headers.get("x-demo-role"));
}
