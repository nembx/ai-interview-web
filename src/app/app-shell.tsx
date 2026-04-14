import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Database,
  FileSearch,
  LayoutDashboard,
  MessageSquareText,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type AppShellView = 'overview' | 'resume' | 'knowledge' | 'rag' | 'tasks';
export type AppShellNoticeTone = 'neutral' | 'success' | 'danger';

export interface AppShellNotice {
  message: string;
  tone: AppShellNoticeTone;
}

interface AppShellProps {
  activeView: AppShellView;
  notice: AppShellNotice | null;
  onViewChange: (view: AppShellView) => void;
  views: Record<AppShellView, ReactNode>;
  counts: {
    knowledgeCount: number;
    sessionCount: number;
    recentResumeCount: number;
    inFlightTaskCount: number;
    selectedKnowledgeCount: number;
  };
}

const noticeToneClasses: Record<AppShellNoticeTone, string> = {
  neutral: 'bg-muted border-border text-muted-foreground',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  danger: 'bg-red-50 border-red-200 text-red-700',
};

const navigationItems = [
  { value: 'overview', label: '总览', icon: LayoutDashboard },
  { value: 'resume', label: '简历分析', icon: FileSearch },
  { value: 'knowledge', label: '知识库', icon: Database },
  { value: 'rag', label: 'RAG 会话', icon: MessageSquareText },
  { value: 'tasks', label: '任务中心', icon: Activity },
] as const satisfies ReadonlyArray<{ value: AppShellView; label: string; icon: LucideIcon }>;

export function AppShell({ activeView, notice, onViewChange, views, counts }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-3.5" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">AI Interview</span>
          </div>

          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
                    active
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                  onClick={() => onViewChange(item.value)}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                  {item.value === 'tasks' && counts.inFlightTaskCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-medium leading-4 text-primary-foreground">
                      {counts.inFlightTaskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {notice && (
            <div className={cn('mb-4 rounded-lg border px-4 py-2.5 text-sm font-medium', noticeToneClasses[notice.tone])}>
              {notice.message}
            </div>
          )}
          {views[activeView]}
        </div>
      </main>
    </div>
  );
}
