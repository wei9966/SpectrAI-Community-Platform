"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingsCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingsCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | 'start' | 'end')[] = [];
    const leftSiblingIndex = Math.max(currentPage - siblingsCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingsCount, totalPages);

    const shouldShowStartEllipsis = leftSiblingIndex > 2;
    const shouldShowEndEllipsis = rightSiblingIndex < totalPages - 1;

    if (shouldShowStartEllipsis) {
      pages.push(1, 'start');
    } else {
      for (let i = 1; i <= leftSiblingIndex; i++) {
        pages.push(i);
      }
    }

    for (let i = leftSiblingIndex + 1; i <= rightSiblingIndex; i++) {
      pages.push(i);
    }

    if (shouldShowEndEllipsis) {
      pages.push('end', totalPages);
    } else {
      for (let i = rightSiblingIndex + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-1">
      {/* 上一页 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* 跳到首页 */}
      {currentPage > 2 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(1)}
          className="h-9 w-9"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      {/* 页码 */}
      {visiblePages.map((page, index) => {
        if (page === 'start' || page === 'end') {
          return (
            <span
              key={`${page}-${index}`}
              className="px-2 text-muted-foreground"
            >
              ...
            </span>
          );
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={cn(
              "h-9 w-9 p-0",
              currentPage === page && "bg-primary text-primary-foreground"
            )}
          >
            {page}
          </Button>
        );
      })}

      {/* 跳到末页 */}
      {currentPage < totalPages - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          className="h-9 w-9"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}

      {/* 下一页 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
