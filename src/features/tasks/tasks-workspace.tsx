import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, StatusChip } from '@/shared/ui/app-primitives';
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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">任务中心</h2>

      {/* Lookup bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">资源类型</span>
          <select
            className="h-8 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/50"
            value={taskLookupType}
            onChange={(event) => onTaskLookupTypeChange(event.target.value as ResourceType)}
          >
            <option value="resume">resume</option>
            <option value="knowledge">knowledge</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">资源 ID</span>
          <Input className="h-8" value={taskLookupId} onChange={(event) => onTaskLookupIdChange(event.target.value)} placeholder="例如 3" />
        </div>
        <Button size="sm" onClick={onTaskLookup} disabled={taskLookupLoading}>
          {taskLookupLoading ? '查询中...' : '查询任务'}
        </Button>
      </div>

      {/* Lookup result */}
      {taskLookupResult && (
        <div className="rounded-lg border border-border bg-card p-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">文件名</dt>
              <dd className="mt-0.5 font-medium">{taskLookupResult.fileName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">资源类型</dt>
              <dd className="mt-0.5 font-medium">{taskLookupResult.resourceType}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">状态</dt>
              <dd className="mt-0.5"><StatusChip label={taskLookupResult.taskStatus} tone={statusTone(taskLookupResult.taskStatus)} /></dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">上传时间</dt>
              <dd className="mt-0.5 font-medium">{formatDateTime(taskLookupResult.uploadTime)}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Recent tasks */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">最近任务</h3>
        {recentTasks.length === 0 ? (
          <EmptyState title="暂无任务历史" text="简历或知识库上传之后，这里会自动出现。" />
        ) : (
          <div className="space-y-2">
            {recentTasks.map((item) => (
              <div key={`${item.resourceType}-${item.resourceId}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <strong className="text-sm">{item.fileName}</strong>
                  <span className="ml-2 text-xs text-muted-foreground">{item.resourceType} / #{item.resourceId} / {formatDateTime(item.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip label={item.taskStatus} tone={statusTone(item.taskStatus)} />
                  <Button variant="outline" size="sm" onClick={() => onTaskRefresh(item.resourceType, item.resourceId)}>刷新</Button>
                  <Button variant="outline" size="sm" onClick={() => onTaskOpen(item.resourceType, item.resourceId)}>打开</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
