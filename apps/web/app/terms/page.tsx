export default function TermsPage() {
  return (
    <div className="container py-16 max-w-3xl mx-auto prose prose-invert">
      <h1 className="text-3xl font-bold mb-8">服务条款</h1>
      <p className="text-muted-foreground mb-6">最后更新日期：2026 年 4 月</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">1. 服务说明</h2>
      <p className="text-muted-foreground mb-4">
        SpectrAI Community 是一个开源社区平台，用于分享和发现 Workflow、Team、Skill、MCP 等资源模板。
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">2. 用户责任</h2>
      <p className="text-muted-foreground mb-4">
        用户需对其发布的内容负责，不得发布违法、侵权或有害内容。我们保留删除违规内容的权利。
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">3. 知识产权</h2>
      <p className="text-muted-foreground mb-4">
        用户发布的资源模板版权归原作者所有。通过本平台分享资源即表示您授权其他用户按照资源许可证使用。
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">4. 免责声明</h2>
      <p className="text-muted-foreground mb-4">
        本平台按"现状"提供服务，不对社区资源的准确性、安全性或适用性作任何保证。
      </p>
    </div>
  );
}
