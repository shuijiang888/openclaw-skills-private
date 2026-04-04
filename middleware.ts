import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PROFIT_SESSION_COOKIE } from "@/lib/session-cookie";

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

function isPublicApi(path: string): boolean {
  return (
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/session") ||
    path.startsWith("/api/auth/logout") ||
    path === "/api/health"
  );
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  /** 生产入口统一为门户：设 PROFIT_ROOT_REDIRECT=portal（仅影响路径「/」） */
  if (
    process.env.PROFIT_ROOT_REDIRECT?.trim().toLowerCase() === "portal" &&
    path === "/"
  ) {
    return NextResponse.redirect(new URL("/portal", req.nextUrl));
  }

  if (!isSessionAuthMode()) {
    return NextResponse.next();
  }
  const secret = process.env.PROFIT_AUTH_SECRET?.trim();

  if (path.startsWith("/api/")) {
    if (isPublicApi(path)) {
      return NextResponse.next();
    }
    if (!secret || secret.length < 16) {
      return NextResponse.json(
        { error: "服务器未配置 PROFIT_AUTH_SECRET（长度至少 16）" },
        { status: 500 },
      );
    }

    const token = req.cookies.get(PROFIT_SESSION_COOKIE)?.value;
    let role: string | null = null;
    if (token) {
      try {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret),
        );
        role = (payload.role as string)?.trim() || null;
      } catch {
        role = null;
      }
    }
    if (!role) {
      return NextResponse.json(
        { error: "未登录或会话已过期，请重新登录" },
        { status: 401 },
      );
    }
    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete("x-demo-role");
    requestHeaders.set("x-profit-session-role", role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isPublicPage(path)) {
    return NextResponse.next();
  }

  if (!secret || secret.length < 16) {
    return new NextResponse("Profit Web：请在环境变量中配置 PROFIT_AUTH_SECRET（≥16 字符）", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const token = req.cookies.get(PROFIT_SESSION_COOKIE)?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );
      role = (payload.role as string)?.trim() || null;
    } catch {
      role = null;
    }
  }

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${path}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-demo-role");
  requestHeaders.set("x-profit-session-role", role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
