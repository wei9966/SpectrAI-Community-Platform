import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="container py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">文档中心</h1>
      <p className="text-muted-foreground mb-8">
        文档正在编写中，请访问我们的 GitHub 仓库获取最新信息和使用指南。
      </p>
      <div className="flex gap-4">
        <a
          href="https://github.com/spectrai-community"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          访问 GitHub
        </a>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-secondary text-sm font-medium"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
