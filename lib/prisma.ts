import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * 与当前 schema 是否一致（新增 model 后若未 generate，旧 Client 上无该 delegate，会出现 undefined.findMany）
 */
function clientHasCurrentSchema(p: PrismaClient): boolean {
  return typeof (p as unknown as { compassAlertRule?: unknown }).compassAlertRule
    !== "undefined";
}

function createPrismaClient(): PrismaClient {
  const c = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  if (!clientHasCurrentSchema(c)) {
    throw new Error(
      "Prisma Client 与 prisma/schema.prisma 不一致（缺少 CompassAlertRule 等）。请在 profit-web 目录执行 npx prisma generate，然后务必重启 npm run dev。",
    );
  }

  return c;
}

function getPrismaSingleton(): PrismaClient {
  let existing = globalForPrisma.prisma;

  if (existing && !clientHasCurrentSchema(existing)) {
    void existing.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
    existing = undefined;
  }

  if (!existing) {
    existing = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = existing;
    }
  }

  return existing;
}

/** 代理：方法调用始终落到最新的单例，避免热更新/Dev 全局上挂着旧 PrismaClient */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaSingleton();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
