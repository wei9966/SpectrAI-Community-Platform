"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ResourceType } from "@spectrai-community/shared";
import { ResourceType as ResourceTypeEnum } from "@spectrai-community/shared";

interface TypeFilterProps {
  value?: ResourceType | 'all';
  onChange?: (type: ResourceType | 'all') => void;
}

const typeOptions: Array<{
  value: ResourceType | 'all';
  label: string;
  icon: string;
}> = [
  { value: 'all', label: '全部', icon: '📦' },
  { value: ResourceTypeEnum.WORKFLOW, label: '工作流', icon: '⚡' },
  { value: ResourceTypeEnum.TEAM, label: '团队', icon: '👥' },
  { value: ResourceTypeEnum.SKILL, label: '技能', icon: '🛠️' },
  { value: ResourceTypeEnum.MCP, label: 'MCP', icon: '🔌' },
];

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  const selectedValue = value || 'all';

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {typeOptions.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange?.(option.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              isSelected
                ? "bg-gradient-primary text-white shadow-md shadow-primary/25"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <span className="mr-1.5">{option.icon}</span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
