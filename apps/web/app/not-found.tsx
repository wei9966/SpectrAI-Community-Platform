import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] py-16 text-center">
      <div className="text-8xl font-bold text-gradient mb-4">404</div>
      <h1 className="text-2xl font-bold mb-2">页面未找到</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        抱歉，您访问的页面不存在或已被移除。请检查 URL 是否正确，或返回首页继续浏览。
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 bg-gradient-primary text-white hover:opacity-90 transition-opacity"
        >
          返回首页
        </Link>
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          浏览市场
        </Link>
      </div>
    </div>
  );
}
