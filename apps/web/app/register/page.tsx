"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const INVITE_CODE_STORAGE_KEY = "spectrai.inviteCode";

type RegisterStep = "form" | "verify";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = React.useState<RegisterStep>("form");
  const [formData, setFormData] = React.useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [inviteCode, setInviteCode] = React.useState("");
  const [verificationCode, setVerificationCode] = React.useState("");
  const [verificationTtl, setVerificationTtl] = React.useState<number | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const codeFromUrl =
      searchParams.get("inviteCode") ??
      searchParams.get("invite_code") ??
      searchParams.get("code") ??
      "";
    const normalizedCode = codeFromUrl.trim();

    if (normalizedCode) {
      setInviteCode(normalizedCode);
      localStorage.setItem(INVITE_CODE_STORAGE_KEY, normalizedCode);
      return;
    }

    const storedCode = localStorage.getItem(INVITE_CODE_STORAGE_KEY)?.trim() ?? "";
    if (storedCode) {
      setInviteCode(storedCode);
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "请输入用户名";
    } else if (formData.username.length < 3) {
      newErrors.username = "用户名至少需要 3 个字符";
    } else if (formData.username.length > 20) {
      newErrors.username = "用户名不能超过 20 个字符";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = "用户名只能包含字母、数字、下划线和中划线";
    }

    if (!formData.email.trim()) {
      newErrors.email = "请输入邮箱地址";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "请输入有效的邮箱地址";
    }

    if (!formData.password) {
      newErrors.password = "请输入密码";
    } else if (formData.password.length < 8) {
      newErrors.password = "密码至少需要 8 个字符";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "两次输入的密码不一致";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateVerificationCode = () => {
    const trimmedCode = verificationCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setErrors((prev) => ({
        ...prev,
        verificationCode: "请输入 6 位验证码",
      }));
      return false;
    }

    setErrors((prev) => ({
      ...prev,
      verificationCode: "",
    }));
    return true;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const normalizedInviteCode = inviteCode.trim();
      const result = await api.register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password,
        normalizedInviteCode || undefined
      );

      if (result.success && result.data) {
        setVerificationCode("");
        setVerificationTtl(result.data.verificationTtl);
        setStep("verify");
        return;
      }

      setErrors({ submit: result.error || "注册失败" });
    } catch (error: any) {
      setErrors({ submit: error?.message || "注册失败，请稍后重试" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateVerificationCode()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const normalizedInviteCode = inviteCode.trim();
      const result = await api.verifyCode(
        formData.email.trim(),
        verificationCode.trim(),
        formData.username.trim(),
        normalizedInviteCode || undefined
      );

      if (result.success && result.data) {
        localStorage.setItem("auth_token", result.data.token);
        router.push("/");
        return;
      }

      setErrors({ submit: result.error || "验证码验证失败" });
    } catch (error: any) {
      setErrors({ submit: error?.message || "验证码验证失败，请稍后重试" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGithubRegister = () => {
    const githubAuthUrl = process.env.NEXT_PUBLIC_GITHUB_AUTH_URL;
    if (githubAuthUrl) {
      window.location.href = githubAuthUrl;
    } else {
      setErrors({ submit: "GitHub 注册配置未完成" });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.submit) {
      setErrors((prev) => ({ ...prev, [name]: "", submit: "" }));
    }
  };

  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextInviteCode = e.target.value;
    setInviteCode(nextInviteCode);
    localStorage.setItem(INVITE_CODE_STORAGE_KEY, nextInviteCode);
    if (errors.inviteCode || errors.submit) {
      setErrors((prev) => ({ ...prev, inviteCode: "", submit: "" }));
    }
  };

  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextCode = e.target.value.replace(/\D/g, "").slice(0, 6);
    setVerificationCode(nextCode);
    if (errors.verificationCode || errors.submit) {
      setErrors((prev) => ({ ...prev, verificationCode: "", submit: "" }));
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setVerificationCode("");
    setErrors({});
  };

  return (
    <div className="container flex min-h-[80vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">注册账户</CardTitle>
          <CardDescription className="text-center">
            {step === "form" ? "创建你的账户以开始使用" : "请输入邮箱验证码完成注册"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "form" ? (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={handleGithubRegister}>
                <Github className="mr-2 h-4 w-4" />
                使用 GitHub 账户注册
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">或者使用邮箱注册</span>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                  {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                </div>

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
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteCode">邀请码（选填）</Label>
                  <Input
                    id="inviteCode"
                    name="inviteCode"
                    placeholder="请输入邀请码"
                    value={inviteCode}
                    onChange={handleInviteCodeChange}
                    disabled={isSubmitting}
                  />
                  {errors.inviteCode && <p className="text-sm text-destructive">{errors.inviteCode}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="至少 8 位密码"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="再次输入密码"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                {errors.submit && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {errors.submit}
                  </div>
                )}

                <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "发送验证码中..." : "下一步"}
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p>验证码已发送到 {formData.email.trim()}</p>
                {verificationTtl ? <p className="mt-1">验证码有效期约 {verificationTtl} 秒。</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationCode">邮箱验证码</Label>
                <Input
                  id="verificationCode"
                  name="verificationCode"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="请输入 6 位验证码"
                  value={verificationCode}
                  onChange={handleVerificationCodeChange}
                  disabled={isSubmitting}
                />
                {errors.verificationCode && (
                  <p className="text-sm text-destructive">{errors.verificationCode}</p>
                )}
              </div>

              {errors.submit && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.submit}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={handleBackToForm} disabled={isSubmitting}>
                  返回上一步
                </Button>
                <Button type="submit" variant="gradient" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "确认注册中..." : "确认注册"}
                </Button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            已有账户？{" "}
            <Link href="/login" className="text-primary hover:underline">
              立即登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="container flex min-h-[80vh] items-center justify-center py-16">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-center text-2xl font-bold">注册账户</CardTitle>
              <CardDescription className="text-center">加载中...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <RegisterPageContent />
    </React.Suspense>
  );
}
