"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PortalLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.replace("/portal");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onLogout}
      className="text-xs font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
    >
      {pending ? "退出中…" : "退出登录"}
    </button>
  );
}
