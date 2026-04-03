import { Suspense } from "react";
import { PageContainer } from "@/components/PageContainer";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "登录",
};

export default function LoginPage() {
  return (
    <PageContainer className="space-y-8">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
          正式环境
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          登录后继续
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          使用管理员创建的账号登录；角色由账号绑定，不再使用右上角的「试点角色」切换（演示模式专用）。
        </p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-slate-500">加载表单…</p>}>
        <LoginForm />
      </Suspense>
    </PageContainer>
  );
}
