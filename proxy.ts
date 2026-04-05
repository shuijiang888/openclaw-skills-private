import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  PROFIT_SESSION_COOKIE,
  PLATFORM_AUTH_COOKIE,
} from "@/lib/session-cookie";
import { verifyGateToken } from "@/lib/gate-auth";

function isSessionAuthMode(): boolean {
  const v =
    process.env.PROFIT_AUTH_MODE ?? process.env.NEXT_PUBLIC_PROFIT_AUTH_MODE;
  return v?.trim().toLowerCase() === "session";
}

function isPublicPage(path: string): boolean {
  return (
    path === "/" ||
    path === "/login" ||
    path.startsWith("/about") ||
    path.startsWith("/strategy") ||
    path.startsWith("/roadmap")
  );
}

function isGateProtectedPath(path: string): boolean {
  return (
    path.startsWith("/profit") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/projects") ||
    path.startsWith("/zt007") ||
    path.startsWith("/personal") ||
    path.startsWith("/console") ||
    path.startsWith("/compass") ||
    path.startsWith("/health-check") ||
    path.startsWith("/strategy") ||
    path.startsWith("/roadmap") ||
    path.startsWith("/about") ||
    path.startsWith("/api/")
  );
}

function isPublicApi(path: string): boolean {
  return (
    path.startsWith("/api/auth/verify") ||
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/session") ||
    path.startsWith("/api/auth/change-password") ||
    path.startsWith("/api/auth/logout") ||
    path === "/api/health"
  );
}

type SessionPayload = {
  sub: string | null;
  role: string | null;
  ztRole: string | null;
  email: string | null;
  name: string | null;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
};

async function readSession(
  req: NextRequest,
  secret: string,
): Promise<SessionPayload | null> {
  const token = req.cookies.get(PROFIT_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = (payload.role as string)?.trim() || null;
    if (!role) return null;
    return {
      sub: (payload.sub as string) ?? null,
      role,
      ztRole: ((payload.ztRole as string) ?? role).trim() || role,
      email: (payload.email as string) ?? null,
      name: (payload.name as string) ?? null,
      isSuperAdmin: Boolean(payload.isSuperAdmin),
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

function appendSessionHeaders(req: NextRequest, payload: SessionPayload) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-demo-role");
  requestHeaders.set("x-profit-session-role", payload.role ?? "");
  requestHeaders.set(
    "x-profit-session-zt-role",
    payload.ztRole ?? payload.role ?? "",
  );
  if (payload.sub) requestHeaders.set("x-profit-session-user-id", payload.sub);
  if (payload.email) requestHeaders.set("x-profit-session-email", payload.email);
  if (payload.name) requestHeaders.set("x-profit-session-name", payload.name);
  requestHeaders.set(
    "x-profit-session-superadmin",
    payload.isSuperAdmin ? "1" : "0",
  );
  requestHeaders.set(
    "x-profit-session-must-change-password",
    payload.mustChangePassword ? "1" : "0",
  );
  return requestHeaders;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isGateProtectedPath(path)) {
    const gateToken = req.cookies.get(PLATFORM_AUTH_COOKIE)?.value;
    const gateOk = gateToken ? await verifyGateToken(gateToken).then(() => true).catch(() => false) : false;
    if (!gateOk) {
      if (path.startsWith("/api/auth/verify")) {
        return NextResponse.next();
      }
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { error: "请先通过封面密码验证" },
          { status: 401 },
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("gate", "1");
      return NextResponse.redirect(url);
    }
  }

  if (!isSessionAuthMode()) {
    return NextResponse.next();
  }

  const secret = process.env.PROFIT_AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "服务器未配置 PROFIT_AUTH_SECRET（长度至少 16）" },
        { status: 500 },
      );
    }
    return new NextResponse(
      "Profit Web：请在环境变量中配置 PROFIT_AUTH_SECRET（≥16 字符）",
      {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }

  if (path.startsWith("/api/") && isPublicApi(path)) {
    return NextResponse.next();
  }
  if (isPublicPage(path)) {
    return NextResponse.next();
  }

  const payload = await readSession(req, secret);
  if (!payload?.role) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "未登录或会话已过期，请重新登录" },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${path}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  // 首次登录改密策略：除登录页与改密接口外，其余路径强制回到登录页完成改密。
  if (payload.mustChangePassword) {
    if (path.startsWith("/api/") && !isPublicApi(path)) {
      return NextResponse.json(
        { error: "首次登录需先修改密码" },
        { status: 428 },
      );
    }
    if (path !== "/login" && !path.startsWith("/api/")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("forceChange", "1");
      url.searchParams.set("next", `${path}${req.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({
    request: { headers: appendSessionHeaders(req, payload) },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

