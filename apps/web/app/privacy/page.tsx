export default function PrivacyPage() {
  return (
    <div className="container py-16 max-w-3xl mx-auto prose prose-invert">
      <h1 className="text-3xl font-bold mb-8">隐私政策</h1>
      <p className="text-muted-foreground mb-6">最后更新日期：2026 年 4 月</p>

      <h2 className="text-xl font-semibold mt-8 mb-4">1. 信息收集</h2>
      <p className="text-muted-foreground mb-4">
        当您注册或使用 SpectrAI Community 时，我们可能会收集您的用户名、邮箱地址和个人资料信息。
        通过 GitHub OAuth 登录时，我们仅获取您授权的公开信息。
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">2. 信息使用</h2>
      <p className="text-muted-foreground mb-4">
        我们收集的信息用于提供和改善平台服务，包括用户身份验证、个性化推荐和社区交流功能。
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">3. 信息保护</h2>
      <p className="text-muted-foreground mb-4">
        我们采取合理的技术和管理措施保护您的个人信息安全，防止未经授权的访问或泄露。
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">4. 联系方式</h2>
      <p className="text-muted-foreground mb-4">
        如果您对本隐私政策有任何疑问，请通过 GitHub 联系我们。
      </p>
    </div>
  );
}
