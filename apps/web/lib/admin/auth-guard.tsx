"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AdminAuthGuardProps {
  children: React.ReactNode;
  requireRole?: "admin" | "moderator"; // defaults to admin+moderator
}

export function AdminAuthGuard({ children, requireRole }: AdminAuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "denied" | "ok">("loading");
  const [user, setUser] = React.useState<{ username: string; role: string } | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setStatus("denied");
      return;
    }

    // Decode JWT payload (no verification, server validates)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = payload.role as string;
      const username = payload.username as string;

      if (requireRole === "admin" && role !== "admin") {
        setStatus("denied");
        return;
      }

      if (!requireRole && role !== "admin" && role !== "moderator") {
        setStatus("denied");
        return;
      }

      setUser({ username, role });
      setStatus("ok");
    } catch {
      setStatus("denied");
    }
  }, [requireRole]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">无权限访问</h1>
        <p className="text-muted-foreground">
          {user ? "您的账号没有管理后台访问权限" : "请先登录管理员账号"}
        </p>
        <div className="flex gap-3">
          <Link href="/">
            <Button variant="outline">返回首页</Button>
          </Link>
          {!user && (
            <Link href="/login">
              <Button>登录</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Hook to get current admin user info from JWT */
export function useAdminUser() {
  const [user, setUser] = React.useState<{
    userId: string;
    username: string;
    role: string;
  } | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      });
    } catch {
      // invalid token
    }
  }, []);

  return user;
}
