import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataSyncListener } from "@/components/DataSyncListener";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";

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
    default: "纷享销客 CRM 增利插件",
    template: "%s · CRM 增利插件",
  },
  description:
    "面向纷享销客 CRM 的第三方插件：SaaS 订阅报价、Deal Desk 分层协同与客户价值罗盘，让定价可度量、赢单可追踪、决策可留痕。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-slate-900 dark:text-slate-50">
        <DataSyncListener />
        <Nav />
        <main className="w-full flex-1 px-4 py-8 sm:py-10">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
