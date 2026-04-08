"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";

export default function AdminForumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">论坛管理</h1>
        <p className="text-muted-foreground text-sm mt-1">管理论坛帖子和分类</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-4" />
        <p className="text-sm">论坛管理功能即将上线</p>
      </div>
    </div>
  );
}
