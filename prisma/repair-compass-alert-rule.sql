-- 旧库若缺少 CompassAlertRule 表，客户价值罗盘会 500。执行后请再：npm run db:seed
-- 用法：npm run db:repair
CREATE TABLE IF NOT EXISTS "CompassAlertRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conditionLabel" TEXT NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "CompassQuadrantThreshold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marginHighPct" REAL NOT NULL,
    "growthHighPct" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "AgentAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL DEFAULT '',
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AgentAuditLog_createdAt_idx" ON "AgentAuditLog"("createdAt");
