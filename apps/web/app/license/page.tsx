export default function LicensePage() {
  return (
    <div className="container py-16 max-w-3xl mx-auto prose prose-invert">
      <h1 className="text-3xl font-bold mb-8">许可证</h1>

      <h2 className="text-xl font-semibold mt-8 mb-4">MIT License</h2>
      <p className="text-muted-foreground mb-4">
        Copyright (c) 2025-2026 SpectrAI Community
      </p>
      <div className="bg-secondary/50 rounded-lg p-6 text-sm text-muted-foreground font-mono whitespace-pre-wrap">
{`Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
      </div>
    </div>
  );
}
