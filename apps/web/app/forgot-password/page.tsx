"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="container flex items-center justify-center min-h-[80vh] py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gradient">重置密码</CardTitle>
          <CardDescription>输入你的邮箱地址，我们将发送重置链接</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              disabled
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            该功能正在开发中，暂时无法使用。如需重置密码，请联系管理员。
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回登录
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
