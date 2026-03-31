'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  /** 当前图片 URL */
  value?: string | null;
  /** 上传变化回调 */
  onChange: (url: string | null) => void;
  /** 上传 API 地址（留空则用 mock） */
  uploadUrl?: string;
  /** 接受的文件类型 */
  accept?: string;
  /** 最大文件大小（MB） */
  maxSize?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** className */
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  uploadUrl,
  accept = 'image/*',
  maxSize = 5,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(value || null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 当外部 value 变化时同步
  React.useEffect(() => {
    setPreviewUrl(value || null);
  }, [value]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    // 验证文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`图片大小不能超过 ${maxSize}MB`);
      return;
    }

    // 创建本地预览
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // 如果没有上传地址，使用 mock
    if (!uploadUrl) {
      setIsUploading(true);
      setUploadProgress(0);

      // 模拟上传进度
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      // 模拟上传完成
      await new Promise((resolve) => setTimeout(resolve, 1500));
      clearInterval(interval);
      setUploadProgress(100);

      // Mock: 返回本地预览 URL 作为"上传后"的 URL
      onChange(localPreview);
      setIsUploading(false);
      return;
    }

    // 实际上传到 presigned URL
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // TODO: 使用 presigned URL 上传
      // const formData = new FormData();
      // formData.append('file', file);
      // await fetch(uploadUrl, { method: 'PUT', body: formData });
      onChange(localPreview);
    } catch (err) {
      setError('上传失败，请重试');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  };

  if (previewUrl) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden', className)}>
        <img
          src={previewUrl}
          alt="预览"
          className="w-full h-48 object-cover"
        />
        {!disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="w-3/4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">上传中 {uploadProgress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg transition-all duration-200',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center py-8 px-4">
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground mb-2">上传中 {uploadProgress}%</p>
            <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-full bg-secondary mb-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              拖拽图片到此处，或<span className="text-primary">点击上传</span>
            </p>
            <p className="text-xs text-muted-foreground">
              支持 JPG、PNG、WebP，最大 {maxSize}MB
            </p>
            {error && (
              <p className="text-xs text-destructive mt-2">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
