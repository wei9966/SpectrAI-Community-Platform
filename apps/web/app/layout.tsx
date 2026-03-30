import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SpectrAI Community - 多 AI CLI 会话编排平台",
  description: "发现、分享和安装 Workflow、Team、Skill、MCP 模板资源，让你的 AI 工作流更智能、更高效",
  keywords: ["SpectrAI", "AI", "CLI", "Workflow", "MCP", "社区", "模板"],
  authors: [{ name: "SpectrAI Community" }],
  openGraph: {
    title: "SpectrAI Community",
    description: "多 AI CLI 会话编排平台",
    type: "website",
    locale: "zh_CN",
    siteName: "SpectrAI Community",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpectrAI Community",
    description: "多 AI CLI 会话编排平台",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
