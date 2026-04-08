"use client";

import * as React from "react";
import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground text-sm mt-1">管理系统配置</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Settings className="h-12 w-12 mb-4" />
        <p className="text-sm">系统设置功能即将上线</p>
      </div>
    </div>
  );
}
