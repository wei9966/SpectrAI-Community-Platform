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
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('>') && !lines[i].startsWith('- ') && !lines[i].startsWith('* ') && !/^\d+\.\s/.test(lines[i]) && lines[i] !== '---' && lines[i] !== '***' && lines[i] !== '___') {
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
    // 处理行内代码
    const parts: React.ReactNode[] = [];
    const codeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <code key={`code-${match.index}`} className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono">
          {match[1]}
        </code>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    // 处理粗体和斜体
    return parts.map((part, idx) => {
      if (typeof part !== 'string') return part;

      // 处理 **bold**
      const boldRegex = /\*\*([^*]+)\*\*/g;
      const boldParts: React.ReactNode[] = [];
      let boldLastIndex = 0;
      let boldMatch;

      while ((boldMatch = boldRegex.exec(part)) !== null) {
        if (boldMatch.index > boldLastIndex) {
          boldParts.push(processItalic(part.slice(boldLastIndex, boldMatch.index)));
        }
        boldParts.push(<strong key={`bold-${boldMatch.index}`}>{boldMatch[1]}</strong>);
        boldLastIndex = boldMatch.index + boldMatch[0].length;
      }
      if (boldLastIndex < part.length) {
        boldParts.push(processItalic(part.slice(boldLastIndex)));
      }

      return boldParts.length > 0 ? boldParts : part;
    });
  };

  const processItalic = (text: string): React.ReactNode => {
    const italicRegex = /\*([^*]+)\*/g;
    const italicParts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = italicRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        italicParts.push(text.slice(lastIndex, match.index));
      }
      italicParts.push(<em key={`italic-${match.index}`}>{match[1]}</em>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      italicParts.push(text.slice(lastIndex));
    }

    return italicParts.length > 0 ? italicParts : text;
  };

  return (
    <div className={cn('prose prose-invert max-w-none', className)}>
      {renderMarkdown(content)}
    </div>
  );
}
