"use client";

import * as React from "react";
import Link from "next/link";
import { Shield, FileText, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const [hasPermission, setHasPermission] = React.useState(false);

  React.useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setHasPermission(user.role === "admin" || user.role === "moderator");
      } catch {
        setHasPermission(false);
      }
    }
  }, []);

  if (!hasPermission) {
    return (
      <div className="container py-16 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-4">无权限访问</h1>
        <p className="text-muted-foreground mb-8">
          您没有管理员权限，无法访问此页面
        </p>
        <Link href="/">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            返回首页
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">管理后台</h1>
        <p className="text-muted-foreground">管理系统各项功能</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/posts">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>帖子审核</CardTitle>
                  <CardDescription>审核待发布的论坛帖子</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>系统设置</CardTitle>
                <CardDescription>即将上线</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
