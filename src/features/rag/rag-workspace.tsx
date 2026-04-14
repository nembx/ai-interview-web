import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { StatusChip } from '@/shared/ui/app-primitives';
import type { KnowledgeListItem, RagSessionDetailResponse, RagSessionResponse, SessionStatus } from '@/types';
import { formatDateTime } from '@/utils';

interface RagWorkspaceProps {
  newSessionTitle: string;
  knowledgeList: KnowledgeListItem[];
  composerKnowledgeIds: number[];
  sessionsLoading: boolean;
  sessionTab: SessionStatus;
  sessionSearch: string;
  visibleSessions: RagSessionResponse[];
  selectedSessionId: number | null;
  selectedSessionDetail: RagSessionDetailResponse | null;
  sessionTitleDraft: string;
  sessionKnowledgeDraft: number[];
  onNewSessionTitleChange: (value: string) => void;
  onComposerKnowledgeToggle: (knowledgeId: number) => void;
  onCreateSession: () => void;
  onRefreshSessions: () => void;
  onSessionTabChange: (value: SessionStatus) => void;
  onSessionSearchChange: (value: string) => void;
  onOpenSessionChat: (sessionId: number) => void;
  onSessionTitleDraftChange: (value: string) => void;
  onSessionTitleUpdate: () => void;
  onSessionStatusToggle: () => void;
  onSessionDelete: () => void;
  onSessionKnowledgeDraftToggle: (knowledgeId: number) => void;
  onSessionKnowledgeUpdate: () => void;
  onOpenCurrentChat: () => void;
}

export function RagWorkspace(props: RagWorkspaceProps) {
  const {
    newSessionTitle,
    knowledgeList,
    composerKnowledgeIds,
    sessionsLoading,
    sessionTab,
    sessionSearch,
    visibleSessions,
    selectedSessionId,
    selectedSessionDetail,
    sessionTitleDraft,
    sessionKnowledgeDraft,
    onNewSessionTitleChange,
    onComposerKnowledgeToggle,
    onCreateSession,
    onRefreshSessions,
    onSessionTabChange,
    onSessionSearchChange,
    onOpenSessionChat,
    onSessionTitleDraftChange,
    onSessionTitleUpdate,
    onSessionStatusToggle,
    onSessionDelete,
    onSessionKnowledgeDraftToggle,
    onSessionKnowledgeUpdate,
    onOpenCurrentChat,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">RAG 会话</h2>
        <Button variant="outline" size="sm" onClick={onRefreshSessions} disabled={sessionsLoading}>
          {sessionsLoading ? '刷新中...' : '刷新会话'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: session list */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* New session */}
          <div className="space-y-2 rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">新建会话</h3>
            <Input value={newSessionTitle} onChange={(event) => onNewSessionTitleChange(event.target.value)} placeholder="标题（可留空）" className="h-8" />
            {knowledgeList.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">先去知识库上传文档</p>
            ) : (
              <div className="thin-scrollbar max-h-[140px] space-y-0.5 overflow-auto">
                {knowledgeList.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                    <Checkbox checked={composerKnowledgeIds.includes(item.id)} onCheckedChange={() => onComposerKnowledgeToggle(item.id)} />
                    <span className="truncate">{item.fileName}</span>
                  </label>
                ))}
              </div>
            )}
            <Button size="sm" className="w-full" onClick={onCreateSession}>创建会话</Button>
          </div>

          {/* Session list */}
          <Tabs value={sessionTab} onValueChange={(value) => onSessionTabChange(value as SessionStatus)}>
            <TabsList className="w-full">
              <TabsTrigger value="ACTIVE" className="flex-1">活跃</TabsTrigger>
              <TabsTrigger value="ARCHIVED" className="flex-1">归档</TabsTrigger>
            </TabsList>
          </Tabs>

          <Input value={sessionSearch} onChange={(event) => onSessionSearchChange(event.target.value)} placeholder="搜索会话..." className="h-8" />

          <div className="thin-scrollbar max-h-[400px] space-y-1 overflow-auto">
            {visibleSessions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">暂无会话</p>
            ) : (
              visibleSessions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    selectedSessionId === item.id ? 'bg-muted font-medium' : 'hover:bg-muted/50',
                  )}
                  onClick={() => onOpenSessionChat(item.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">#{item.id} · {item.knowledgeBaseIds.length} 个知识源</div>
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
                <Input value={sessionTitleDraft} onChange={(event) => onSessionTitleDraftChange(event.target.value)} disabled={selectedSessionDetail.status !== 'ACTIVE'} className="flex-1" />
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

              {/* Knowledge sources */}
              <div>
                <h4 className="mb-2 text-sm font-medium">知识源</h4>
                <div className="thin-scrollbar max-h-[200px] space-y-0.5 overflow-auto">
                  {knowledgeList.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                      <Checkbox
                        checked={sessionKnowledgeDraft.includes(item.id)}
                        disabled={selectedSessionDetail.status !== 'ACTIVE'}
                        onCheckedChange={() => onSessionKnowledgeDraftToggle(item.id)}
                      />
                      <span className="flex-1 truncate">{item.fileName}</span>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </label>
                  ))}
                </div>
                <Button size="sm" variant="secondary" className="mt-2" onClick={onSessionKnowledgeUpdate} disabled={selectedSessionDetail.status !== 'ACTIVE'}>
                  更新知识源
                </Button>
              </div>

              {/* Open chat */}
              <Button className="w-full" onClick={onOpenCurrentChat}>打开聊天</Button>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-12">
              <p className="text-sm text-muted-foreground">选择或创建一个会话开始</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
