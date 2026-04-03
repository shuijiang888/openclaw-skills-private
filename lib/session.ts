import { SignJWT, jwtVerify } from "jose";
import { PROFIT_SESSION_COOKIE } from "@/lib/session-cookie";

export { PROFIT_SESSION_COOKIE };

export function getSessionSecretBytes(): Uint8Array {
  const s = process.env.PROFIT_AUTH_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error("PROFIT_AUTH_SECRET 未配置或长度不足 16（请使用随机长字符串）");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(user: {
  id: string;
  role: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ role: user.role, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecretBytes());
}

export async function verifySessionToken(token: string): Promise<{
  sub: string;
  role: string;
  email: string;
}> {
  const { payload } = await jwtVerify(token, getSessionSecretBytes());
  return {
    sub: payload.sub as string,
    role: (payload.role as string) ?? "",
    email: (payload.email as string) ?? "",
  };
}
