import { prisma } from "@/lib/prisma";
import { ZtUsersManager } from "@/components/ZtUsersManager";

export const dynamic = "force-dynamic";

export default async function ConsoleUsersPage() {
  try {
    const [users, orgUnits] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "desc" }],
        include: {
          orgUnit: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.ztOrgUnit.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, code: true },
      }),
    ]);

    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          组织与用户管理：可维护账号状态、军衔角色、组织归属，以及用户侧大模型交互权限。
        </p>
        <ZtUsersManager initialUsers={users} orgUnits={orgUnits} />
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          用户组织模块暂不可用。请先完成数据库迁移后刷新页面。
        </div>
        <ZtUsersManager initialUsers={[]} orgUnits={[]} />
      </div>
    );
  }
}
