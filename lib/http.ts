import type { DemoRole } from "./approval";
import { parseDemoRole } from "./approval";

export function demoRoleFromRequest(req: Request): DemoRole {
  return parseDemoRole(req.headers.get("x-demo-role"));
}
