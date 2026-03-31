'use client';

import * as React from 'react';
import Link from "next/link";
import { ArrowRight, Zap, Users, Wrench, Plug, Trophy, MessageSquare, Lightbulb, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCard } from "@/components/ResourceCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ShowcaseProject {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export default function HomePage() {
  const [featuredResources, setFeaturedResources] = React.useState<any[]>([]);
  const [showcaseProjects, setShowcaseProjects] = React.useState<ShowcaseProject[]>([]);
  const [resourcesLoading, setResourcesLoading] = React.useState(true);
  const [projectsLoading, setProjectsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/api/rankings/resources?period=all&sort=rating&limit=4`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.items) {
          setFeaturedResources(data.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setResourcesLoading(false));

    fetch(`${API_BASE}/api/projects?limit=3&sort=latest`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.items) {
          setShowcaseProjects(data.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setProjectsLoading(false));
  }, []);

  const categories = [
    {
      type: "workflow",
      label: "工作流",
      description: "自动化任务编排",
      icon: Zap,
      href: "/marketplace?type=workflow",
      gradient: "from-purple-500 to-indigo-500",
    },
    {
      type: "team",
      label: "团队配置",
      description: "多角色协作配置",
      icon: Users,
      href: "/marketplace?type=team",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      type: "skill",
      label: "技能",
      description: "AI 能力扩展",
      icon: Wrench,
      href: "/marketplace?type=skill",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      type: "mcp",
      label: "MCP 服务",
      description: "外部工具集成",
      icon: Plug,
      href: "/marketplace?type=mcp",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  const forumEntries = [
    {
      label: '综合讨论',
      description: '关于 SpectrAI 的任何话题都可以在这里讨论',
      icon: MessageSquare,
      href: '/forum/general',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: '功能建议',
      description: '对 SpectrAI 的功能建议和需求反馈',
      icon: Lightbulb,
      href: '/forum/feature-requests',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: '问题求助',
      description: '遇到问题？在这里寻求社区帮助',
      icon: HelpCircle,
      href: '/forum/help',
      gradient: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-gradient">SpectrAI 社区平台</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            发现、分享和安装 Workflow、Team、Skill、MCP 模板资源
            <br />
            让你的 AI 工作流更智能、更高效
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace">
              <Button variant="gradient" size="lg" className="gap-2">
                探索资源市场
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/publish">
              <Button variant="outline" size="lg">
                发布资源
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 分类入口 */}
      <section className="py-16 border-t border-border/40">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            浏览分类
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.type}
                href={category.href}
                className="group relative overflow-hidden rounded-xl border bg-card p-6 hover:border-primary/50 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {category.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 热门资源 */}
      <section className="py-16 border-t border-border/40">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold">
                热门资源
              </h2>
              <Link href="/rankings">
                <Button variant="outline" size="sm" className="gap-1">
                  <Trophy className="w-4 h-4" />
                  排行榜
                </Button>
              </Link>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" className="gap-2">
                查看更多
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          {resourcesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : featuredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无热门资源
            </div>
          )}
        </div>
      </section>

      {/* 社区论坛 */}
      <section className="py-16 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">社区论坛</h2>
            <p className="text-muted-foreground">
              讨论交流、分享经验、寻求帮助
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {forumEntries.map((entry) => (
              <Link key={entry.label} href={entry.href}>
                <Card className="group relative overflow-hidden hover:border-primary/50 transition-all duration-300 h-full">
                  <div className={`absolute inset-0 bg-gradient-to-br ${entry.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <CardContent className="p-6 relative">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${entry.gradient} flex items-center justify-center mb-3`}>
                      <entry.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">{entry.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link href="/forum">
              <Button variant="outline" className="gap-2">
                进入论坛
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 精选项目 */}
      <section className="py-16 border-t border-border/40">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">精选项目</h2>
            <Link href="/showcase">
              <Button variant="ghost" className="gap-2">
                查看更多
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <div className="p-4">
                    <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : showcaseProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {showcaseProjects.map((project) => (
                <Link key={project.id} href={`/showcase/${project.id}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                    {project.coverImageUrl ? (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={project.coverImageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-4xl font-bold text-muted-foreground/30">
                          {project.title.charAt(0)}
                        </span>
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        {project.author.avatarUrl ? (
                          <img
                            src={project.author.avatarUrl}
                            alt={project.author.username}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">
                              {project.author.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {project.author.username}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无精选项目
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border/40">
        <div className="container">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-primary/30 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              准备好分享你的创意了吗？
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              将你的 Workflow、Team、Skill 或 MCP 配置分享给社区，
              帮助更多人提升工作效率
            </p>
            <Link href="/publish">
              <Button variant="gradient" size="lg">
                立即发布
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
