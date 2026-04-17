import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { StatusChip } from '@/shared/ui/app-primitives';
import type { InterviewSessionDetailResponse, InterviewSessionResponse, KnowledgeListItem, RecentResumeRecord, SessionStatus } from '@/types';
import { formatDateTime } from '@/utils';

interface InterviewWorkspaceProps {
  newSessionTitle: string;
  newSessionJd: string;
  newSessionResumeId: string;
  newSessionKnowledgeIds: number[];
  knowledgeList: KnowledgeListItem[];
  recentResumes: RecentResumeRecord[];
  sessionsLoading: boolean;
  sessionTab: SessionStatus;
  sessionSearch: string;
  visibleSessions: InterviewSessionResponse[];
  selectedSessionId: number | null;
  selectedSessionDetail: InterviewSessionDetailResponse | null;
  sessionTitleDraft: string;
  onNewSessionTitleChange: (value: string) => void;
  onNewSessionJdChange: (value: string) => void;
  onNewSessionResumeIdChange: (value: string) => void;
  onNewSessionKnowledgeToggle: (knowledgeId: number) => void;
  onCreateSession: () => void;
  onRefreshSessions: () => void;
  onSessionTabChange: (value: SessionStatus) => void;
  onSessionSearchChange: (value: string) => void;
  onSelectSession: (sessionId: number) => void;
  onOpenSessionChat: (sessionId: number) => void;
  onSessionTitleDraftChange: (value: string) => void;
  onSessionTitleUpdate: () => void;
  onSessionStatusToggle: () => void;
  onSessionDelete: () => void;
  onOpenCurrentChat: () => void;
}

export function InterviewWorkspace(props: InterviewWorkspaceProps) {
  const {
    newSessionTitle,
    newSessionJd,
    newSessionResumeId,
    newSessionKnowledgeIds,
    knowledgeList,
    recentResumes,
    sessionsLoading,
    sessionTab,
    sessionSearch,
    visibleSessions,
    selectedSessionId,
    selectedSessionDetail,
    sessionTitleDraft,
    onNewSessionTitleChange,
    onNewSessionJdChange,
    onNewSessionResumeIdChange,
    onNewSessionKnowledgeToggle,
    onCreateSession,
    onRefreshSessions,
    onSessionTabChange,
    onSessionSearchChange,
    onSelectSession,
    onOpenSessionChat,
    onSessionTitleDraftChange,
    onSessionTitleUpdate,
    onSessionStatusToggle,
    onSessionDelete,
    onOpenCurrentChat,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">AI 模拟面试</h2>
        <Button variant="outline" size="sm" onClick={onRefreshSessions} disabled={sessionsLoading}>
          {sessionsLoading ? '刷新中...' : '刷新会话'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: session list */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* New session */}
          <div className="space-y-2 rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">新建面试</h3>
            <Input value={newSessionTitle} onChange={(e) => onNewSessionTitleChange(e.target.value)} placeholder="标题（可留空）" className="h-8" />
            <Select value={newSessionResumeId} onValueChange={(value) => onNewSessionResumeIdChange(!value || value === '__none__' ? '' : value)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="选择简历（可留空）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不关联简历</SelectItem>
                {recentResumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id.toString()}>
                    #{resume.id} {resume.fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={newSessionJd} onChange={(e) => onNewSessionJdChange(e.target.value)} placeholder="职位 JD（可留空）" rows={3} className="text-sm" />
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">知识源（可留空）</div>
              {knowledgeList.length === 0 ? (
                <p className="py-1 text-xs text-muted-foreground">暂无可选知识库</p>
              ) : (
                <div className="thin-scrollbar max-h-[140px] space-y-0.5 overflow-auto">
                  {knowledgeList.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                      <Checkbox checked={newSessionKnowledgeIds.includes(item.id)} onCheckedChange={() => onNewSessionKnowledgeToggle(item.id)} />
                      <span className="truncate">{item.fileName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" className="w-full" onClick={onCreateSession}>创建面试</Button>
          </div>

          {/* Session list */}
          <Tabs value={sessionTab} onValueChange={(value) => onSessionTabChange(value as SessionStatus)}>
            <TabsList className="w-full">
              <TabsTrigger value="ACTIVE" className="flex-1">活跃</TabsTrigger>
              <TabsTrigger value="ARCHIVED" className="flex-1">归档</TabsTrigger>
            </TabsList>
          </Tabs>

          <Input value={sessionSearch} onChange={(e) => onSessionSearchChange(e.target.value)} placeholder="搜索会话..." className="h-8" />

          <div className="thin-scrollbar max-h-[400px] space-y-1 overflow-auto">
            {visibleSessions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">暂无面试会话</p>
            ) : (
              visibleSessions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    selectedSessionId === item.id ? 'bg-muted font-medium' : 'hover:bg-muted/50',
                  )}
                  onClick={() => onSelectSession(item.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">#{item.id}</div>
                  </div>
                  <StatusChip label={item.status} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} />
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right: workbench */}
        <div className="min-w-0">
          {selectedSessionDetail ? (
            <div className="space-y-5 rounded-lg border border-border bg-card p-5">
              {/* Title */}
              <div className="flex items-center gap-3">
                <Input value={sessionTitleDraft} onChange={(e) => onSessionTitleDraftChange(e.target.value)} disabled={selectedSessionDetail.status !== 'ACTIVE'} className="flex-1" />
                <Button size="sm" variant="secondary" onClick={onSessionTitleUpdate} disabled={selectedSessionDetail.status !== 'ACTIVE'}>保存标题</Button>
              </div>

              {/* Info + actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>创建: {formatDateTime(selectedSessionDetail.createdAt)}</span>
                  <span>更新: {formatDateTime(selectedSessionDetail.updatedAt)}</span>
                  <StatusChip label={selectedSessionDetail.status} tone={selectedSessionDetail.status === 'ACTIVE' ? 'success' : 'neutral'} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={onSessionStatusToggle}>
                    {selectedSessionDetail.status === 'ACTIVE' ? '归档' : '恢复'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={onSessionDelete}>删除</Button>
                </div>
              </div>

              {/* JD content */}
              {selectedSessionDetail.jdContent && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">职位 JD</h4>
                  <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{selectedSessionDetail.jdContent}</p>
                </div>
              )}

              {/* Open chat */}
              <Button className="w-full" onClick={onOpenCurrentChat}>打开面试</Button>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-12">
              <p className="text-sm text-muted-foreground">选择或创建一个面试会话开始</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
