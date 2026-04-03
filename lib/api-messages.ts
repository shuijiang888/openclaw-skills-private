/** 管理类 API 返回 403 时的说明：演示模式（x-demo-role）与登录模式（会话角色）双轨 */
export const ADMIN_API_FORBIDDEN =
  "需要管理员权限：演示模式下请求须携带 x-demo-role: ADMIN；登录模式下须使用管理员账号。";
