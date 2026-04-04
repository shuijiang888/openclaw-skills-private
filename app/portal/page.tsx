import { cookies } from "next/headers";
import { PageContainer } from "@/components/PageContainer";
import { isSessionAuthMode } from "@/lib/auth-mode";
import { getPortalApps } from "@/lib/portal-apps";
import { verifySessionToken } from "@/lib/session";
import { PROFIT_SESSION_COOKIE } from "@/lib/session-cookie";
import { PortalAppsGrid } from "./PortalAppsGrid";

export const metadata = {
  title: "统一门户",
};

export default async function PortalPage() {
  const apps = getPortalApps();
  const sessionMode = isSessionAuthMode();

  let email = "";
  if (sessionMode) {
    try {
      const jar = await cookies();
      const token = jar.get(PROFIT_SESSION_COOKIE)?.value;
      if (token) {
        const p = await verifySessionToken(token);
        email = p.email;
      }
    } catch {
      /* 会话异常时仍展示门户，由中间件保证正式模式下已登录 */
    }
  }

  return (
    <PageContainer>
      <PortalAppsGrid
        apps={apps}
        userEmail={email}
        showLogout={sessionMode}
      />
    </PageContainer>
  );
}
