import type { DemoRole } from "./approval";
import { parseDemoRole } from "./approval";
import { isSessionAuthMode } from "./auth-mode";

/** 请求对应的执行角色：session 模式仅信任中间件注入的会话头，忽略 x-demo-role */
export function demoRoleFromRequest(req: Request): DemoRole {
  if (isSessionAuthMode()) {
    return parseDemoRole(req.headers.get("x-profit-session-role"));
  }
  return parseDemoRole(req.headers.get("x-demo-role"));
}

/** 从请求头提取 userId（session 模式由 middleware 注入，演示模式返回 null） */
export function sessionUserIdFromRequest(req: Request): string | null {
  const id = req.headers.get("x-profit-session-user-id")?.trim();
  return id || null;
}
