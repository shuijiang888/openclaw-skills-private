/** 管理类 API 返回 403 时的说明：演示模式（x-demo-role）与登录模式（会话角色）双轨 */
export const ADMIN_API_FORBIDDEN =
  "需要 VP 权限：演示模式下请求须携带 x-demo-role: VP；登录模式下须使用 VP 角色账号。";

export const SEED_PILOT_VIEW_FORBIDDEN =
  "需要销售经理或 VP 权限：演示模式下请切换对应试点角色；登录模式下请使用对应角色账号。";

export const SEED_PILOT_EDIT_FORBIDDEN =
  "需要 VP 权限：种子用户 Owner、评分与问题台账仅 VP 可维护。";
