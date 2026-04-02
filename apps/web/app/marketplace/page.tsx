"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { TypeFilter } from "@/components/TypeFilter";
import { ResourceCard } from "@/components/ResourceCard";
import { Pagination } from "@/components/Pagination";
import type { ResourceType, PublicResource } from "@spectrai-community/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function MarketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resources, setResources] = React.useState<PublicResource[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [selectedType, setSelectedType] = React.useState<ResourceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const itemsPerPage = 8;

  // 从 URL 读取初始筛选条件
  React.useEffect(() => {
    const type = searchParams.get('type') as ResourceType | null;
    const query = searchParams.get('q') || '';

    if (type) setSelectedType(type);
    setSearchQuery(query);
  }, [searchParams]);

  // 从 API 获取资源数据
  React.useEffect(() => {
    let cancelled = false;

    async function fetchResources() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(itemsPerPage));
        if (selectedType !== 'all') params.set('type', selectedType);
        if (searchQuery) params.set('q', searchQuery);

        const res = await fetch(`${API_BASE}/api/resources?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch resources');

        const json = await res.json();
        if (cancelled) return;

        const data = json.data || json;
        setResources(data.items || []);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        console.error('Failed to load resources:', err);
        if (!cancelled) {
          setResources([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchResources();
    return () => { cancelled = true; };
  }, [selectedType, searchQuery, currentPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    router.push(`?${params.toString()}`);
  };

  const handleTypeChange = (type: ResourceType | 'all') => {
    setSelectedType(type);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (type !== 'all') {
      params.set('type', type);
    } else {
      params.delete('type');
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="container py-8 md:py-12">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          资源市场
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          发现社区分享的优质 Workflow、Team、Skill 和 MCP 资源
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="flex justify-center mb-8">
        <SearchBar
          initialValue={searchQuery}
          onSearch={handleSearch}
          placeholder="搜索资源名称、描述或标签..."
        />
      </div>

      {/* 类型筛选 */}
      <div className="mb-8">
        <TypeFilter value={selectedType} onChange={handleTypeChange} />
      </div>

      {/* 结果统计 */}
      <div className="mb-6 text-sm text-muted-foreground">
        共找到 {totalCount} 个资源
        {searchQuery && `（"${searchQuery}"）`}
      </div>

      {/* 资源网格 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: itemsPerPage }).map((_, i) => (
            <div key={i} className="h-52 rounded-lg bg-muted/60 animate-pulse" />
          ))}
        </div>
      ) : resources.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            没有找到匹配的资源
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            尝试更换搜索词或筛选条件
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="container py-16 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MarketContent />
    </Suspense>
  );
}
