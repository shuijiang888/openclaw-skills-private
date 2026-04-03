/** 与 .env 中 PROFIT_AUTH_MODE / NEXT_PUBLIC_PROFIT_AUTH_MODE 对齐（须一致） */
export function isSessionAuthMode(): boolean {
  const v =
    process.env.PROFIT_AUTH_MODE ?? process.env.NEXT_PUBLIC_PROFIT_AUTH_MODE;
  return v?.trim().toLowerCase() === "session";
}
