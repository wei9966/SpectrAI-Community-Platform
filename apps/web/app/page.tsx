'use client';

import * as React from 'react';
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Zap,
  Users,
  Wrench,
  Plug,
  Trophy,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceCard } from "@/components/ResourceCard";

import { API_BASE } from '@/lib/api-base';

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
      index: "01",
      code: "WORKFLOW",
      type: "workflow",
      label: "工作流",
      description: "自动化任务编排与多阶段执行流水线",
      icon: Zap,
      href: "/marketplace?type=workflow",
    },
    {
      index: "02",
      code: "TEAM",
      type: "team",
      label: "团队配置",
      description: "多角色 Agent 协同分工与上下文路由",
      icon: Users,
      href: "/marketplace?type=team",
    },
    {
      index: "03",
      code: "SKILL",
      type: "skill",
      label: "技能",
      description: "可复用的领域指令集与专业能力扩展",
      icon: Wrench,
      href: "/marketplace?type=skill",
    },
    {
      index: "04",
      code: "MCP",
      type: "mcp",
      label: "MCP 服务",
      description: "标准化外部工具、数据库与本地环境连接",
      icon: Plug,
      href: "/marketplace?type=mcp",
    },
  ];

  const forumEntries = [
    {
      code: 'CH-01',
      label: '技术讨论',
      description: '分享和讨论 AI Agent、工作流架构与工程实践方案',
      icon: MessageSquare,
      href: '/forum/tech-discussion',
    },
    {
      code: 'CH-02',
      label: '功能建议',
      description: '提出新功能建议、协议扩展提案和体验改进想法',
      icon: Lightbulb,
      href: '/forum/feature-requests',
    },
    {
      code: 'CH-03',
      label: 'Bug 报告',
      description: '反馈平台问题、CLI 兼容性异常与资源使用阻碍',
      icon: HelpCircle,
      href: '/forum/bug-reports',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/60 pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Architectural grid backdrop with radial mask fade — replaces blurred neon blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-architectural [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,#000_45%,transparent_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent"
        />

        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow status pill: outer rounded-full with p-1 concentric inner badge */}
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 pr-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wider text-primary tabular-nums">
                REGISTRY v2.4
              </span>
              <span className="text-xs font-medium tracking-wide text-muted-foreground">
                多 AI CLI 会话编排与配置注册中心
              </span>
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.08]">
              SpectrAI 社区平台
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              发现、分享和安装经过实战验证的 Workflow、Team、Skill 与 MCP 模板资源，让你的多 AI 工作流具备确定性的工程品质。
            </p>

            {/* Primary & Secondary CTAs with explicit transitions, optical alignment, and press feedback */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/marketplace" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-11 w-full gap-2 rounded-lg bg-foreground px-6 text-background shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[background-color,transform,opacity] duration-150 ease-out hover:bg-foreground/90 active:scale-[0.98] sm:w-auto"
                >
                  <span>探索资源市场</span>
                  <ArrowRight className="h-4 w-4 translate-x-0 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={1.75} />
                </Button>
              </Link>
              <Link href="/publish" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 w-full rounded-lg border-white/[0.1] bg-white/[0.02] px-6 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/[0.2] hover:bg-white/[0.05] active:scale-[0.98] sm:w-auto"
                >
                  发布资源
                </Button>
              </Link>
            </div>

            {/* Concentric CLI inspection bar: outer rounded-2xl (16px) - p-2 (8px) = inner rounded-lg (8px) */}
            <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-white/[0.08] bg-white/[0.015] p-2 surface-elevated">
              <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-white/[0.06] bg-background/90 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 text-left font-mono text-xs text-muted-foreground">
                  <Terminal className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                  <span className="select-all text-foreground/90">
                    spectrai install <span className="text-primary">@community/workflow-pack</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-2 text-xs text-muted-foreground sm:border-t-0 sm:pt-0">
                  <span className="font-mono tabular-nums">4 类核心原语</span>
                  <span className="h-3 w-px bg-border/80" aria-hidden="true" />
                  <span className="font-mono tabular-nums text-foreground/80">CLI 即装即用</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 分类入口 */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 font-mono text-xs font-medium tracking-wider text-muted-foreground tabular-nums">
                01 // PRIMITIVES
              </div>
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                浏览分类
              </h2>
            </div>
            <p className="max-w-md text-pretty text-sm text-muted-foreground">
              按编排层级检索社区标准化配置模块，支持一键导入本地工作区。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.type}
                href={category.href}
                className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.015] p-2 transition-[border-color,background-color,transform,box-shadow] duration-150 ease-out hover:border-white/[0.16] hover:bg-white/[0.03] active:scale-[0.98]"
              >
                {/* Concentric inner card: outer 16px (rounded-2xl) - padding 8px (p-2) = inner 8px (rounded-lg) */}
                <div className="flex h-full flex-col justify-between rounded-lg border border-white/[0.05] bg-card/80 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-foreground/80 transition-[border-color,background-color,color] duration-150 ease-out group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary">
                        <category.icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                        {category.index} / {category.code}
                      </span>
                    </div>
                    <h3 className="mb-1.5 text-base font-semibold tracking-tight text-foreground transition-colors duration-150 ease-out group-hover:text-primary">
                      {category.label}
                    </h3>
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                      {category.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-3 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out group-hover:text-foreground">
                    <span>查看目录</span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.75}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 热门资源 */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="container">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 font-mono text-xs font-medium tracking-wider text-muted-foreground tabular-nums">
                02 // CURATED INDEX
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                  热门资源
                </h2>
                <Link href="/rankings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-md border-white/[0.1] bg-white/[0.02] px-3 text-xs font-medium transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/[0.2] hover:bg-white/[0.05] active:scale-[0.98]"
                  >
                    <Trophy className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                    <span>排行榜</span>
                  </Button>
                </Link>
              </div>
            </div>
            <Link href="/marketplace">
              <Button
                variant="ghost"
                className="h-9 gap-1.5 px-3 text-sm text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.98]"
              >
                <span>查看更多</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </Link>
          </div>

          {resourcesLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-2"
                >
                  <div className="rounded-lg border border-white/[0.04] bg-card p-5 animate-pulse">
                    <div className="mb-4 h-4 w-1/3 rounded bg-muted" />
                    <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
                    <div className="mb-4 h-4 w-full rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredResources.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featuredResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-white/[0.01] py-14 text-center text-sm text-muted-foreground">
              暂无热门资源
            </div>
          )}
        </div>
      </section>

      {/* 社区论坛 */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="container">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 font-mono text-xs font-medium tracking-wider text-muted-foreground tabular-nums">
                03 // DISCOURSE CHANNELS
              </div>
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                社区论坛
              </h2>
              <p className="mt-2 text-pretty text-sm text-muted-foreground">
                讨论交流、分享工程经验、协同排查问题
              </p>
            </div>
            <Link href="/forum">
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-lg border-white/[0.1] bg-white/[0.02] px-4 text-sm transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/[0.2] hover:bg-white/[0.05] active:scale-[0.98]"
              >
                <span>进入论坛</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {forumEntries.map((entry) => (
              <Link
                key={entry.label}
                href={entry.href}
                className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.015] p-2 transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/[0.16] hover:bg-white/[0.03] active:scale-[0.98]"
              >
                {/* Concentric inner surface: rounded-2xl (16px) - p-2 (8px) = rounded-lg (8px) */}
                <div className="flex h-full flex-col justify-between rounded-lg border border-white/[0.05] bg-card/80 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-foreground/80 transition-[border-color,background-color,color] duration-150 ease-out group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary">
                        <entry.icon className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                        {entry.code}
                      </span>
                    </div>
                    <h3 className="mb-1.5 text-base font-semibold tracking-tight text-foreground transition-colors duration-150 ease-out group-hover:text-primary">
                      {entry.label}
                    </h3>
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                      {entry.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out group-hover:text-foreground">
                    <span>进入频道</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 精选项目 */}
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="container">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2 font-mono text-xs font-medium tracking-wider text-muted-foreground tabular-nums">
                04 // SHOWCASE
              </div>
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                精选项目
              </h2>
            </div>
            <Link href="/showcase">
              <Button
                variant="ghost"
                className="h-9 gap-1.5 px-3 text-sm text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.98]"
              >
                <span>查看更多</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </Link>
          </div>

          {projectsLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-2 animate-pulse"
                >
                  <div className="aspect-video rounded-lg bg-muted" />
                  <div className="p-3">
                    <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/3 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : showcaseProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {showcaseProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/showcase/${project.id}`}
                  className="group block rounded-2xl border border-white/[0.08] bg-white/[0.015] p-2 transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/[0.16] hover:bg-white/[0.03] active:scale-[0.98]"
                >
                  {/* Concentric media frame: outer rounded-2xl (16px) - p-2 (8px) = inner rounded-lg (8px) */}
                  {project.coverImageUrl ? (
                    <div className="aspect-video overflow-hidden rounded-lg bg-muted img-outline">
                      <img
                        src={project.coverImageUrl}
                        alt={project.title}
                        className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-card bg-grid-architectural">
                      <span className="font-mono text-2xl font-semibold tracking-tight text-muted-foreground/50 tabular-nums">
                        #{String(index + 1).padStart(2, '0')} · {project.title.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="px-3 pt-3.5 pb-2">
                    <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground transition-colors duration-150 ease-out group-hover:text-primary">
                      {project.title}
                    </h3>
                    <div className="mt-2.5 flex items-center gap-2">
                      {project.author.avatarUrl ? (
                        <img
                          src={project.author.avatarUrl}
                          alt={project.author.username}
                          className="h-5 w-5 rounded-full object-cover img-outline"
                        />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.12] bg-secondary">
                          <span className="font-mono text-[10px] font-semibold text-foreground">
                            {project.author.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {project.author.username}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-white/[0.01] py-14 text-center text-sm text-muted-foreground">
              暂无精选项目
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 py-20">
        <div className="container">
          {/* Concentric double-framed CTA: outer rounded-3xl (24px) - p-2 (8px) = inner rounded-2xl (16px) */}
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-2 surface-elevated">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card px-6 py-12 text-center md:px-12 md:py-16">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              />
              <div className="mx-auto max-w-xl">
                <div className="mb-3 font-mono text-xs font-medium tracking-wider text-primary tabular-nums">
                  OPEN CONTRIBUTION
                </div>
                <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                  准备好分享你的创意了吗？
                </h2>
                <p className="mt-3 mb-8 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                  将你的 Workflow、Team、Skill 或 MCP 配置发布到社区注册表，帮助更多开发者构建高可靠性的多 AI 协作流水线。
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/publish" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="h-11 w-full gap-2 rounded-lg bg-foreground px-7 text-background shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 ease-out hover:bg-foreground/90 active:scale-[0.98] sm:w-auto"
                    >
                      <span>立即发布</span>
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </Link>
                  <Link href="/marketplace" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11 w-full rounded-lg border-white/[0.1] bg-white/[0.02] px-6 text-foreground transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/[0.2] hover:bg-white/[0.05] active:scale-[0.98] sm:w-auto"
                    >
                      浏览现有资源
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
