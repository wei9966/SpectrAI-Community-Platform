'use client';

import * as React from 'react';
import { Bold, Italic, Code, Link as LinkIcon, List, ListOrdered, Image, Eye, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

// 简单的 Markdown 编辑器（集成预览功能）
function SimpleMarkdownEditor({
  value,
  onChange,
  placeholder = '输入内容...',
  minHeight = 300,
  className,
}: MarkdownEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [isPreview, setIsPreview] = React.useState(false);
  // 保存光标位置，防止点击工具栏按钮时 textarea 失焦导致位置丢失
  const cursorPosRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const saveCursorPos = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      cursorPosRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
    }
  };

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const { start, end } = cursorPosRef.current;
    const selectedText = value.substring(start, end) || placeholder;
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newValue);

    // 设置光标位置
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(
        start + before.length,
        newCursorPos
      );
      cursorPosRef.current = { start: start + before.length, end: newCursorPos };
    }, 0);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    // 创建本地预览 URL，作为上传后的占位
    const localUrl = URL.createObjectURL(file);
    const prefix = value.length > 0 && cursorPosRef.current.start > 0 ? '\n' : '';
    const { start, end } = cursorPosRef.current;
    const imgMarkdown = `${prefix}![${file.name}](${localUrl})\n`;
    const newValue = value.substring(0, start) + imgMarkdown + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newPos = start + imgMarkdown.length;
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
        cursorPosRef.current = { start: newPos, end: newPos };
      }
    }, 0);
  };

  const handleImageButtonClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
    // 重置 input 以允许重复选择同一文件
    e.target.value = '';
  };

  const toolbarButtons = [
    { icon: Bold, label: '粗体', action: () => insertText('**', '**', '粗体文字') },
    { icon: Italic, label: '斜体', action: () => insertText('*', '*', '斜体文字') },
    { icon: Code, label: '代码', action: () => insertText('`', '`', '代码') },
    { icon: LinkIcon, label: '链接', action: () => insertText('[', '](url)', '链接文字') },
    { icon: List, label: '无序列表', action: () => insertText('- ', '', '列表项') },
    { icon: ListOrdered, label: '有序列表', action: () => insertText('1. ', '', '列表项') },
    { icon: Image, label: '图片', action: handleImageButtonClick },
  ];

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 p-2 border-b bg-secondary/30">
        {toolbarButtons.map(({ icon: Icon, label, action }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={action}
            title={label}
            disabled={isPreview}
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
        <div className="flex-1" />
        {isPreview ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(false)}
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            编辑
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(true)}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            预览
          </Button>
        )}
      </div>

      {/* 编辑器/预览 */}
      {isPreview ? (
        <div className="p-4 min-h-[300px]">
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <span className="text-muted-foreground">无内容</span>
          )}
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={saveCursorPos}
            onSelect={saveCursorPos}
            onKeyUp={saveCursorPos}
            placeholder={placeholder}
            className="w-full p-4 bg-background resize-y focus:outline-none font-mono text-sm"
            style={{ minHeight }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <SimpleMarkdownEditor {...props} />;
}
