import Link from "next/link";

export default function DiscordPage() {
  return (
    <div className="container py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Discord 社区</h1>
      <p className="text-muted-foreground mb-8">
        SpectrAI Discord 社区即将开放，敬请期待！您也可以在论坛中与其他用户交流。
      </p>
      <div className="flex gap-4">
        <Link
          href="/forum"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          前往论坛
        </Link>
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
