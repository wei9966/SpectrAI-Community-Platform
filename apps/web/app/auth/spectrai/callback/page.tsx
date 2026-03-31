"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpectrAICallbackPage() {
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");

  React.useEffect(() => {
    // 从 URL 获取授权码
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      return;
    }

    if (code) {
      // TODO: 调用后端 API 交换 access_token
      // 临时实现：显示即将上线
      setStatus("error");
    } else {
      setStatus("error");
    }
  }, []);

  return (
    <div className="container py-16 flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">SpectrAI 授权</CardTitle>
          <CardDescription>
            {status === "loading" && "正在处理授权请求..."}
            {status === "success" && "授权成功！正在跳转..."}
            {status === "error" && "功能即将上线"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {status === "success" && (
            <p className="text-sm text-muted-foreground">
              授权成功，正在跳转到首页...
            </p>
          )}
          {status === "error" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                SpectrAI OAuth 登录功能即将上线
              </p>
              <a
                href="/login"
                className="inline-block px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                返回登录页
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
