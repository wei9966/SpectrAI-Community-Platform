"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, PlusCircle, LayoutGrid, Shield } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  // 检查登录状态和管理员权限
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);

    if (token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setIsAdmin(user.role === 'admin' || user.role === 'moderator');
        } catch {
          setIsAdmin(false);
        }
      }
    } else {
      setIsAdmin(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserMenuOpen(false);
    window.location.reload();
  };

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/marketplace', label: '市场' },
    { href: '/forum', label: '论坛' },
    { href: '/showcase', label: '展示' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-xl font-bold text-gradient">SpectrAI</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/publish">
            <Button variant="gradient" size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              发布
            </Button>
          </Link>

          {isLoggedIn ? (
            <>
              <NotificationBell />

              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <User className="h-5 w-5" />
                </Button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-popover p-1 shadow-lg">
                    {isAdmin && (
                      <Link
                        href="/admin/posts"
                        className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        后台管理
                      </Link>
                    )}
                    <Link
                      href="/user/me"
                      className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      个人主页
                    </Link>
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                登录
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border p-4 space-y-4">
          <nav className="flex flex-col space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/publish"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              发布
            </Link>
          </nav>
          <div className="flex flex-col space-y-2 pt-4 border-t border-border">
            {isLoggedIn ? (
              <>
                <NotificationBell />
                {isAdmin && (
                  <Link
                    href="/admin/posts"
                    className="flex items-center gap-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    后台管理
                  </Link>
                )}
                <Link
                  href="/user/me"
                  className="flex items-center gap-2 text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  个人主页
                </Link>
                <Link
                  href="/notifications"
                  className="flex items-center gap-2 text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  通知中心
                </Link>
                <button
                  className="flex items-center gap-2 text-sm font-medium text-destructive"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="outline" size="sm" className="w-full">
                  登录
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
