"use client";

import * as React from "react";
import {
  adminSettingsApi,
  type SystemSetting,
} from "@/lib/admin/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Save,
  Settings,
  Globe,
  UserPlus,
  Shield,
  MessageSquare,
  RotateCcw,
} from "lucide-react";

// ── Setting groups for UI layout ────────────────────────────

interface SettingGroup {
  title: string;
  icon: React.ReactNode;
  keys: string[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "站点设置",
    icon: <Globe className="h-4 w-4" />,
    keys: ["site_name", "site_description", "maintenance_mode"],
  },
  {
    title: "注册与用户",
    icon: <UserPlus className="h-4 w-4" />,
    keys: ["registration_enabled", "default_user_role", "require_email_verification"],
  },
  {
    title: "资源审核",
    icon: <Shield className="h-4 w-4" />,
    keys: ["resource_auto_approve", "max_upload_size_mb"],
  },
  {
    title: "论坛设置",
    icon: <MessageSquare className="h-4 w-4" />,
    keys: ["forum_enabled", "posts_per_page"],
  },
];

const BOOLEAN_KEYS = new Set([
  "maintenance_mode",
  "registration_enabled",
  "require_email_verification",
  "resource_auto_approve",
  "forum_enabled",
]);

const ROLE_OPTIONS = ["user", "moderator"];

export default function AdminSettingsPage() {
  const [settings, setSettings] = React.useState<SystemSetting[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminSettingsApi.getAll();
      setSettings(data);
      const vals: Record<string, string> = {};
      for (const s of data) {
        vals[s.key] = s.value;
      }
      setValues(vals);
      setOriginalValues({ ...vals });
    } catch { /* auth guard handles */ }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const hasChanges = React.useMemo(() => {
    return Object.keys(values).some((k) => values[k] !== originalValues[k]);
  }, [values, originalValues]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleReset = () => {
    setValues({ ...originalValues });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    // Only send changed values
    const changed: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v !== originalValues[k]) {
        changed[k] = v;
      }
    }
    if (Object.keys(changed).length === 0) return;

    setSaving(true);
    try {
      const data = await adminSettingsApi.update(changed);
      setSettings(data);
      const vals: Record<string, string> = {};
      for (const s of data) {
        vals[s.key] = s.value;
      }
      setValues(vals);
      setOriginalValues({ ...vals });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { /* */ }
    finally { setSaving(false); }
  };

  const getSettingByKey = (key: string): SystemSetting | undefined =>
    settings.find((s) => s.key === key);

  const renderField = (key: string) => {
    const setting = getSettingByKey(key);
    const val = values[key] ?? "";
    const desc = setting?.description ?? key;

    if (BOOLEAN_KEYS.has(key)) {
      return (
        <div key={key} className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium">{desc}</div>
            <div className="text-xs text-muted-foreground font-mono">{key}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={val === "true"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              val === "true" ? "bg-primary" : "bg-muted"
            }`}
            onClick={() => handleChange(key, val === "true" ? "false" : "true")}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                val === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      );
    }

    if (key === "default_user_role") {
      return (
        <div key={key} className="py-3">
          <div className="text-sm font-medium mb-1">{desc}</div>
          <div className="text-xs text-muted-foreground font-mono mb-2">{key}</div>
          <select
            value={val}
            onChange={(e) => handleChange(key, e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-48"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      );
    }

    if (key === "max_upload_size_mb" || key === "posts_per_page") {
      return (
        <div key={key} className="py-3">
          <div className="text-sm font-medium mb-1">{desc}</div>
          <div className="text-xs text-muted-foreground font-mono mb-2">{key}</div>
          <Input
            type="number"
            value={val}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full sm:w-48"
            min={1}
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div key={key} className="py-3">
        <div className="text-sm font-medium mb-1">{desc}</div>
        <div className="text-xs text-muted-foreground font-mono mb-2">{key}</div>
        <Input
          value={val}
          onChange={(e) => handleChange(key, e.target.value)}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-muted-foreground text-sm mt-1">管理系统配置</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-muted-foreground text-sm mt-1">管理系统配置</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> 保存中...
              </>
            ) : saveSuccess ? (
              "已保存"
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> 保存更改
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Setting groups */}
      {SETTING_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <span className="text-muted-foreground">{group.icon}</span>
              <h2 className="text-base font-semibold">{group.title}</h2>
            </div>
            <div className="divide-y divide-border/50">
              {group.keys.map((key) => renderField(key))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
            <span className="text-sm text-amber-400">
              有未保存的更改
            </span>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存更改"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
