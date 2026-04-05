import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataSyncListener } from "@/components/DataSyncListener";
import { Nav } from "@/components/Nav";
import { PortalHomeButton } from "@/components/PortalHomeButton";
import { SiteFooter } from "@/components/SiteFooter";
import { cookies } from "next/headers";
import { PLATFORM_AUTH_COOKIE } from "@/lib/session-cookie";
import { verifyGateAuthToken } from "@/lib/gate-auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "智能盈利管理系统",
    template: "%s · 智能盈利管理",
  },
  description:
    "企业级报价、分层审批与盈利罗盘：让定价可度量、毛利可追踪、决策可留痕。适用于制造与科技型企业的产品试点与立项评估。联合呈现：纷享销客。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = (await cookies()).get(PLATFORM_AUTH_COOKIE)?.value;
  const gatePassed = await verifyGateAuthToken(token);
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-slate-900 dark:text-slate-50">
        <DataSyncListener />
        {gatePassed ? <Nav /> : null}
        <main className={gatePassed ? "w-full flex-1 px-4 py-8 sm:py-10" : "w-full flex-1"}>
          {children}
        </main>
        {gatePassed ? <PortalHomeButton /> : null}
        {gatePassed ? <SiteFooter /> : null}
      </body>
    </html>
  );
}
