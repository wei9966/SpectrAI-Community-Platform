import Link from "next/link";
import { ArrowRight, Zap, Users, Wrench, Plug, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceCard } from "@/components/ResourceCard";
import { mockResources } from "@/lib/mock-data";

export default function HomePage() {
  // 热门资源：按评分和下载综合排序（mock 数据，待 API 对接后从排行榜 API 获取）
  const featuredResources = [...mockResources]
    .map(r => ({
      ...r,
      score: r.downloads * 0.1 + r.likes * 0.5 + 4.0 * 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

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

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* 背景渐变效果 */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
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
