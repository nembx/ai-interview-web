import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, Panel, StatusChip } from '@/shared/ui/app-primitives';
import type { RecentTaskRecord, ResourceType, TaskStatusResponse } from '@/types';
import { formatDateTime, statusTone } from '@/utils';

interface TasksWorkspaceProps {
  taskLookupType: ResourceType;
  taskLookupId: string;
  taskLookupLoading: boolean;
  taskLookupResult: TaskStatusResponse | null;
  recentTasks: RecentTaskRecord[];
  onTaskLookupTypeChange: (value: ResourceType) => void;
  onTaskLookupIdChange: (value: string) => void;
  onTaskLookup: () => void;
  onTaskRefresh: (resourceType: ResourceType, resourceId: number) => void;
  onTaskOpen: (resourceType: ResourceType, resourceId: number) => void;
}

export function TasksWorkspace(props: TasksWorkspaceProps) {
  const {
    taskLookupType,
    taskLookupId,
    taskLookupLoading,
    taskLookupResult,
    recentTasks,
    onTaskLookupTypeChange,
    onTaskLookupIdChange,
    onTaskLookup,
    onTaskRefresh,
    onTaskOpen,
  } = props;

  return (
    <div className="grid gap-4">
      <Panel title="手动查询" subtitle="支持 resume / knowledge 两种资源类型">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">资源类型</span><select className="h-8 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-ring/50" value={taskLookupType} onChange={(event) => onTaskLookupTypeChange(event.target.value as ResourceType)}><option value="resume">resume</option><option value="knowledge">knowledge</option></select></div>
          <div className="flex flex-1 flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">资源 ID</span><Input value={taskLookupId} onChange={(event) => onTaskLookupIdChange(event.target.value)} placeholder="例如 3" /></div>
          <Button onClick={onTaskLookup} disabled={taskLookupLoading}>{taskLookupLoading ? '查询中...' : '查询任务'}</Button>
        </div>
        {taskLookupResult ? (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">文件名</span><strong className="text-sm">{taskLookupResult.fileName}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">资源类型</span><strong className="text-sm">{taskLookupResult.resourceType}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">状态</span><StatusChip label={taskLookupResult.taskStatus} tone={statusTone(taskLookupResult.taskStatus)} /></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(taskLookupResult.uploadTime)}</strong></div>
          </div>
        ) : null}
      </Panel>

      <Panel title="最近任务" subtitle="上传后自动纳入最近历史">
        {recentTasks.length === 0 ? <EmptyState title="暂无任务历史" text="简历或知识库上传之后，这里会自动出现。" /> : (
          <div className="flex flex-col gap-2">{recentTasks.map((item) => (
            <div key={`${item.resourceType}-${item.resourceId}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
              <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{item.resourceType} / #{item.resourceId} / {formatDateTime(item.updatedAt)}</span></div>
              <div className="flex items-center gap-2">
                <StatusChip label={item.taskStatus} tone={statusTone(item.taskStatus)} />
                <Button variant="outline" size="sm" onClick={() => onTaskRefresh(item.resourceType, item.resourceId)}>刷新</Button>
                <Button variant="outline" size="sm" onClick={() => onTaskOpen(item.resourceType, item.resourceId)}>打开</Button>
              </div>
            </div>
          ))}</div>
        )}
      </Panel>

      <Panel title="说明" subtitle="和后端接口契约保持一致">
        <ol className="m-0 flex flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>任务中心只负责查询 resume 和 knowledge 两类资源状态。</li>
          <li>简历列表接口目前不存在，所以前端对简历历史采用浏览器本地缓存。</li>
          <li>知识库列表接口只返回元数据，不返回文档正文，因此详情页也只展示元信息。</li>
          <li>RAG 聊天接口是 POST SSE，因此前端没有使用 EventSource，而是用 fetch 直接消费流。</li>
        </ol>
      </Panel>
    </div>
  );
}
