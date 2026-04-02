'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// 简单的 Markdown 渲染器
// 注：完整功能需要 react-markdown + rehype-highlight（待安装）

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 围栏代码块 ```
      if (line.trimStart().startsWith('```')) {
        const lang = line.trimStart().slice(3).trim();
        i++;
        const codeLines: string[] = [];
        while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // 跳过结束的 ```
        elements.push(
          <pre key={key++} className="bg-secondary rounded-lg p-4 my-4 overflow-x-auto">
            <code className={lang ? `language-${lang}` : ''}>
              {codeLines.join('\n')}
            </code>
          </pre>
        );
        continue;
      }

      // 标题
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-lg font-semibold mt-6 mb-3">
            {renderInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-xl font-semibold mt-6 mb-3">
            {renderInline(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={key++} className="text-2xl font-bold mt-6 mb-4">
            {renderInline(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // 引用块
      if (line.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        elements.push(
          <blockquote key={key++} className="border-l-4 border-primary pl-4 py-2 my-4 bg-secondary/30 rounded-r">
            {quoteLines.map((l, idx) => (
              <p key={idx} className="text-muted-foreground">{renderInline(l)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // 无序列表
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
          listItems.push(lines[i].slice(2));
          i++;
        }
        elements.push(
          <ul key={key++} className="list-disc list-inside my-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // 有序列表
      if (/^\d+\.\s/.test(line)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          listItems.push(lines[i].replace(/^\d+\.\s/, ''));
          i++;
        }
        elements.push(
          <ol key={key++} className="list-decimal list-inside my-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx}>{renderInline(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // 水平线
      if (line === '---' || line === '***' || line === '___') {
        elements.push(<hr key={key++} className="my-6 border-border" />);
        i++;
        continue;
      }

      // 空行
      if (line.trim() === '') {
        i++;
        continue;
      }

      // 段落
      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('>') && !lines[i].startsWith('- ') && !lines[i].startsWith('* ') && !/^\d+\.\s/.test(lines[i]) && lines[i] !== '---' && lines[i] !== '***' && lines[i] !== '___' && !lines[i].trimStart().startsWith('```')) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        elements.push(
          <p key={key++} className="my-3 leading-relaxed">
            {renderInline(paraLines.join(' '))}
          </p>
        );
      }
    }

    return elements;
  };

  const renderInline = (text: string): React.ReactNode => {
    // 第一步：处理图片 ![alt](url)
    const imgParts: React.ReactNode[] = [];
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imgLastIndex = 0;
    let imgMatch;

    while ((imgMatch = imgRegex.exec(text)) !== null) {
      if (imgMatch.index > imgLastIndex) {
        imgParts.push(text.slice(imgLastIndex, imgMatch.index));
      }
      imgParts.push(
        <img
          key={`img-${imgMatch.index}`}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          className="max-w-full h-auto rounded-lg my-2 inline-block"
        />
      );
      imgLastIndex = imgMatch.index + imgMatch[0].length;
    }
    if (imgLastIndex < text.length) {
      imgParts.push(text.slice(imgLastIndex));
    }
    if (imgLastIndex === 0) {
      imgParts.length = 0;
      imgParts.push(text);
    }

    // 第二步：处理行内代码和其他格式
    return imgParts.map((imgPart, imgIdx) => {
      if (typeof imgPart !== 'string') return imgPart;

      // 处理行内代码
      const parts: React.ReactNode[] = [];
      const codeRegex = /`([^`]+)`/g;
      let lastIndex = 0;
      let match;

      while ((match = codeRegex.exec(imgPart)) !== null) {
        if (match.index > lastIndex) {
          parts.push(imgPart.slice(lastIndex, match.index));
        }
        parts.push(
          <code key={`code-${imgIdx}-${match.index}`} className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono">
            {match[1]}
          </code>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < imgPart.length) {
        parts.push(imgPart.slice(lastIndex));
      }

      // 处理链接 [text](url)
      const processLinks = (input: string): React.ReactNode => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const linkParts: React.ReactNode[] = [];
        let linkLastIndex = 0;
        let linkMatch;

        while ((linkMatch = linkRegex.exec(input)) !== null) {
          if (linkMatch.index > linkLastIndex) {
            linkParts.push(input.slice(linkLastIndex, linkMatch.index));
          }
          linkParts.push(
            <a key={`link-${linkMatch.index}`} href={linkMatch[2]} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {linkMatch[1]}
            </a>
          );
          linkLastIndex = linkMatch.index + linkMatch[0].length;
        }
        if (linkLastIndex < input.length) {
          linkParts.push(input.slice(linkLastIndex));
        }
        return linkParts.length > 0 ? linkParts : input;
      };

      // 处理斜体 *italic*，非斜体部分交给 processLinks
      const processItalicAndLinks = (input: string): React.ReactNode => {
        const italicRegex = /\*([^*]+)\*/g;
        const italicParts: React.ReactNode[] = [];
        let italicLastIndex = 0;
        let italicMatch;

        while ((italicMatch = italicRegex.exec(input)) !== null) {
          if (italicMatch.index > italicLastIndex) {
            italicParts.push(processLinks(input.slice(italicLastIndex, italicMatch.index)));
          }
          italicParts.push(<em key={`italic-${imgIdx}-${italicMatch.index}`}>{italicMatch[1]}</em>);
          italicLastIndex = italicMatch.index + italicMatch[0].length;
        }
        if (italicLastIndex < input.length) {
          italicParts.push(processLinks(input.slice(italicLastIndex)));
        }

        return italicParts.length > 0 ? italicParts : processLinks(input);
      };

      // 处理粗斜体、粗体和斜体
      return parts.map((part, idx) => {
        if (typeof part !== 'string') return part;

        // 辅助：处理 **bold**，非bold部分交给 processItalicAndLinks
        const processBold = (input: string): React.ReactNode[] => {
          const boldRegex = /\*\*([^*]+)\*\*/g;
          const boldParts: React.ReactNode[] = [];
          let boldLastIndex = 0;
          let boldMatch;

          while ((boldMatch = boldRegex.exec(input)) !== null) {
            if (boldMatch.index > boldLastIndex) {
              boldParts.push(processItalicAndLinks(input.slice(boldLastIndex, boldMatch.index)));
            }
            boldParts.push(<strong key={`bold-${boldMatch.index}`}>{boldMatch[1]}</strong>);
            boldLastIndex = boldMatch.index + boldMatch[0].length;
          }
          if (boldLastIndex < input.length) {
            boldParts.push(processItalicAndLinks(input.slice(boldLastIndex)));
          }

          return boldParts.length > 0 ? boldParts : [processItalicAndLinks(input)];
        };

        // 先处理 ***bold-italic***，再处理 **bold**
        const boldItalicRegex = /\*\*\*(.+?)\*\*\*/g;
        const biParts: React.ReactNode[] = [];
        let biLastIndex = 0;
        let biMatch;

        while ((biMatch = boldItalicRegex.exec(part)) !== null) {
          if (biMatch.index > biLastIndex) {
            biParts.push(...processBold(part.slice(biLastIndex, biMatch.index)));
          }
          biParts.push(<strong key={`bi-${biMatch.index}`}><em>{biMatch[1]}</em></strong>);
          biLastIndex = biMatch.index + biMatch[0].length;
        }
        if (biLastIndex < part.length) {
          biParts.push(...processBold(part.slice(biLastIndex)));
        }

        return biParts.length > 0 ? biParts : processBold(part);
      });
    });
  };

  return (
    <div className={cn('prose prose-invert max-w-none', className)}>
      {renderMarkdown(content)}
    </div>
  );
}
