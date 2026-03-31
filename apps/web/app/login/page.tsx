"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Github, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "请输入邮箱地址";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "请输入有效的邮箱地址";
    }

    if (!formData.password) {
      newErrors.password = "请输入密码";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.login(formData.email, formData.password);

      if (result.success && result.data) {
        // 保存 token
        localStorage.setItem('auth_token', result.data.token);
        // 跳转到首页或上一页
        router.push('/');
      } else {
        setErrors({ submit: result.error || "登录失败" });
      }
    } catch (error) {
      setErrors({ submit: "登录失败，请稍后重试" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGithubLogin = () => {
    // GitHub OAuth 登录 - 实际应用中需要重定向到 OAuth 授权页面
    const githubAuthUrl = process.env.NEXT_PUBLIC_GITHUB_AUTH_URL;
    if (githubAuthUrl) {
      window.location.href = githubAuthUrl;
    } else {
      setErrors({ submit: "GitHub 登录配置未完成" });
    }
  };

  const handleSpectrAILogin = () => {
    // SpectrAI OAuth 登录 - 占位实现
    setToastMessage("SpectrAI OAuth 登录功能即将上线");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="container py-16 flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md relative">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">登录</CardTitle>
          <CardDescription className="text-center">
            登录你的账户以继续
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GitHub 登录按钮 */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGithubLogin}
          >
            <Github className="w-4 h-4 mr-2" />
            使用 GitHub 账户登录
          </Button>

          {/* SpectrAI 登录按钮 */}
          <Button
            type="button"
            variant="gradient"
            className="w-full"
            onClick={handleSpectrAILogin}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            使用 SpectrAI 账号登录
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                或者使用邮箱
              </span>
            </div>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  忘记密码？
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {errors.submit && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {errors.submit}
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
          </form>

          {/* 注册链接 */}
          <p className="text-center text-sm text-muted-foreground">
            还没有账户？{" "}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </p>

          {/* Toast 提示 */}
          {toastMessage && (
            <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 pointer-events-none">
              <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm shadow-lg">
                {toastMessage}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
