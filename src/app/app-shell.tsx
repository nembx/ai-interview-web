import type { ReactNode } from 'react';

import { MetricTile } from '@/shared/ui/app-primitives';

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

const viewMeta: Record<AppShellView, { title: string; subtitle: string }> = {
  overview: { title: '总览', subtitle: '后端能力映射与快速操作入口' },
  resume: { title: '简历分析', subtitle: '上传、分析、导出与 JD 匹配' },
  knowledge: { title: '知识库', subtitle: '管理知识文档并准备会话素材' },
  rag: { title: 'RAG 会话', subtitle: '创建会话、调整知识源并流式问答' },
  tasks: { title: '任务中心', subtitle: '查询异步任务处理状态' },
};

const noticeToneClasses: Record<AppShellNoticeTone, string> = {
  neutral: 'bg-indigo-soft border-indigo/15 text-indigo-text',
  success: 'bg-success-soft border-success/15 text-emerald-600',
  danger: 'bg-danger-soft border-danger/15 text-red-600',
};

const navigationItems = [
  { value: 'overview', label: '总览' },
  { value: 'resume', label: '简历分析' },
  { value: 'knowledge', label: '知识库' },
  { value: 'rag', label: 'RAG 会话' },
  { value: 'tasks', label: '任务中心' },
] as const satisfies ReadonlyArray<{ value: AppShellView; label: string }>;

export function AppShell({ activeView, notice, onViewChange, views, counts }: AppShellProps) {
  const meta = viewMeta[activeView];

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sidebar-scroll sticky top-0 flex h-screen flex-col gap-1 overflow-y-auto border-r border-white/[0.04] bg-sidebar-dark px-3.5 py-5 max-lg:static max-lg:h-auto max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:gap-2 max-lg:px-4 max-lg:py-3">
        <div className="mb-2 border-b border-sidebar-border-light px-3 pt-3.5 pb-4 max-lg:mb-0 max-lg:border-b-0 max-lg:pb-0">
          <h1 className="text-[17px] font-bold tracking-tight text-sidebar-text-light">AI Interview</h1>
          <p className="mb-3 text-xs text-sidebar-muted-light max-lg:hidden">简历分析 · 知识库 · RAG 会话</p>
          <div className="grid grid-cols-2 gap-2 max-lg:hidden">
            <MetricTile label="知识库" value={counts.knowledgeCount.toString()} footnote="文档" compact />
            <MetricTile label="会话" value={counts.sessionCount.toString()} footnote="RAG" compact />
          </div>
        </div>

        <nav className="mb-1 flex flex-col gap-0.5 max-lg:flex-row max-lg:flex-wrap max-lg:gap-1">
          {navigationItems.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border-none px-3 py-2 text-sm font-medium transition-colors ${activeView === item.value ? 'bg-indigo-medium text-indigo-200' : 'bg-transparent text-sidebar-muted-light hover:bg-sidebar-surface hover:text-sidebar-text-light'}`}
              onClick={() => onViewChange(item.value)}
            >
              <span>{item.label}</span>
              {item.value === 'tasks' && counts.inFlightTaskCount > 0 ? (
                <span className="min-w-5 rounded-full bg-indigo px-2 py-0.5 text-center text-[11px] font-semibold text-white">
                  {counts.inFlightTaskCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex max-w-[1280px] flex-col gap-4 px-6 py-6 lg:px-8 lg:py-7">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-sm max-lg:flex-col max-lg:items-start">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">{meta.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
          <div className="flex flex-1 flex-row gap-2 max-lg:w-full">
            <MetricTile label="简历" value={counts.recentResumeCount.toString()} footnote="本地记录" compact />
            <MetricTile label="进行中" value={counts.inFlightTaskCount.toString()} footnote="任务" compact />
            <MetricTile label="知识源" value={counts.selectedKnowledgeCount.toString()} footnote="已选" compact />
          </div>
        </div>

        {notice ? <div className={`rounded-lg border px-4 py-3 text-[13px] font-medium ${noticeToneClasses[notice.tone]}`}>{notice.message}</div> : null}

        {views[activeView]}
      </main>
    </div>
  );
}
