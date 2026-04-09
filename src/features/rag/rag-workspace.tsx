import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, Panel, StatusChip } from '@/shared/ui/app-primitives';
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
    <div className="grid gap-4">
      <Panel title="新建会话" subtitle="会话会绑定选中的知识库">
        <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">会话标题</span><Input value={newSessionTitle} onChange={(event) => onNewSessionTitleChange(event.target.value)} placeholder="可留空，后端会自动生成标题" /></div>
        <div className="mt-3 flex flex-col gap-2">{knowledgeList.length === 0 ? <EmptyState title="还没有知识库" text="先去知识库页面上传文档，再回来创建会话。" /> : knowledgeList.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            <Checkbox checked={composerKnowledgeIds.includes(item.id)} onCheckedChange={() => onComposerKnowledgeToggle(item.id)} />
            <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{item.category}</span></div>
          </label>
        ))}</div>
        <Button className="mt-3" onClick={onCreateSession}>创建会话</Button>
      </Panel>

      <Panel title="会话列表" subtitle="支持 ACTIVE / ARCHIVED 两个状态" actions={<Button variant="outline" onClick={onRefreshSessions} disabled={sessionsLoading}>{sessionsLoading ? '刷新中...' : '刷新会话'}</Button>}>
        <Tabs value={sessionTab} onValueChange={(value) => onSessionTabChange(value as SessionStatus)} className="mb-3">
          <TabsList className="w-full">
            <TabsTrigger value="ACTIVE" className="flex-1">活跃会话</TabsTrigger>
            <TabsTrigger value="ARCHIVED" className="flex-1">已归档</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mb-3 flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">搜索会话</span><Input value={sessionSearch} onChange={(event) => onSessionSearchChange(event.target.value)} placeholder="按标题或会话 ID 搜索" /></div>
        <div className="flex flex-col gap-2">{visibleSessions.length === 0 ? <EmptyState title="没有会话" text="新建一条会话后会在这里出现。" /> : visibleSessions.map((item) => (
          <button key={item.id} type="button" className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary hover:bg-indigo-soft ${selectedSessionId === item.id ? 'border-primary bg-indigo-soft' : 'border-border'}`} onClick={() => onOpenSessionChat(item.id)}>
            <div className="flex flex-col"><strong className="text-sm">{item.title}</strong><span className="text-xs text-muted-foreground">#{item.id} · {item.knowledgeBaseIds.length} 个知识源</span></div>
            <StatusChip label={item.status} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} />
          </button>
        ))}</div>
      </Panel>

      <Panel title="会话工作台" subtitle="标题和知识源都在这里管理，聊天已移到独立弹窗">
        {selectedSessionDetail ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-3 max-lg:flex-col max-lg:items-stretch">
              <div className="flex flex-1 flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">标题</span><Input value={sessionTitleDraft} onChange={(event) => onSessionTitleDraftChange(event.target.value)} disabled={selectedSessionDetail.status !== 'ACTIVE'} /></div>
              <Button variant="secondary" onClick={onSessionTitleUpdate} disabled={selectedSessionDetail.status !== 'ACTIVE'}>保存标题</Button>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onSessionStatusToggle}>{selectedSessionDetail.status === 'ACTIVE' ? '归档会话' : '恢复会话'}</Button>
              <Button variant="destructive" onClick={onSessionDelete}>删除会话</Button>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">创建时间</span><strong className="text-sm">{formatDateTime(selectedSessionDetail.createdAt)}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">更新时间</span><strong className="text-sm">{formatDateTime(selectedSessionDetail.updatedAt)}</strong></div>
            <div className="thin-scrollbar flex max-h-[220px] flex-col gap-2 overflow-auto">{knowledgeList.map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <Checkbox checked={sessionKnowledgeDraft.includes(item.id)} disabled={selectedSessionDetail.status !== 'ACTIVE'} onCheckedChange={() => onSessionKnowledgeDraftToggle(item.id)} />
                <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{item.category}</span></div>
              </label>
            ))}</div>
            <Button variant="secondary" onClick={onSessionKnowledgeUpdate} disabled={selectedSessionDetail.status !== 'ACTIVE'}>更新知识源</Button>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-3 max-lg:flex-col max-lg:items-start">
              <div className="text-sm text-muted-foreground">聊天已移到独立弹窗。点击任一会话行即可打开，或直接继续当前会话。</div>
              <Button variant="outline" onClick={onOpenCurrentChat}>打开聊天</Button>
            </div>
          </div>
        ) : <EmptyState title="未选择会话" text="从左侧挑一个会话，或先创建一个新的会话。" />}
      </Panel>
    </div>
  );
}
