import type { RecentResumeRecord, RecentTaskRecord } from '@/types';
import { statusTone } from '@/utils';
import { EmptyState, FeatureCard, Panel, StatusChip } from '@/shared/ui/app-primitives';

interface OverviewWorkspaceProps {
  recentResumes: RecentResumeRecord[];
  recentTasks: RecentTaskRecord[];
  onOpenResume: (resumeId: number) => void;
}

export function OverviewWorkspace({ recentResumes, recentTasks, onOpenResume }: OverviewWorkspaceProps) {
  return (
    <div className="grid gap-4">
      <Panel title="后端能力映射" subtitle="来自当前控制器与实体定义">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
          <FeatureCard title="简历分析链路" text="上传简历、查询状态、读取分析详情、删除、导出 PDF、再做 JD 匹配。" />
          <FeatureCard title="知识库管理" text="上传知识文档并分类，查看列表、按分类筛选、删除、选作 RAG 会话资料。" />
          <FeatureCard title="RAG Studio" text="创建/归档/删除会话、更新知识源和标题、按流式 SSE 消费回答。" />
          <FeatureCard title="任务中心" text="围绕 resume / knowledge 的 resourceId 查询异步状态，并保留最近任务历史。" />
        </div>
      </Panel>

      <Panel title="建议操作顺序" subtitle="按当前后端结构最顺的使用路径">
        <ol className="m-0 flex flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>先上传简历，等分析任务完成后查看评分、摘要和改进建议。</li>
          <li>再上传知识库文档，把常用面试资料或岗位资料选进会话草稿。</li>
          <li>在 RAG 会话里创建新会话，用流式问答验证知识命中效果。</li>
          <li>如果上传或向量化卡住，去任务中心按资源 ID 检查状态。</li>
        </ol>
      </Panel>

      <Panel title="最近简历" subtitle="本地最近访问记录">
        {recentResumes.length === 0 ? (
          <EmptyState title="还没有简历历史" text="上传成功后会把资源 ID 和状态保存在浏览器本地，方便再次打开。" />
        ) : (
          <div className="flex flex-col gap-2">
            {recentResumes.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full cursor-pointer rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary hover:bg-indigo-soft"
                onClick={() => onOpenResume(item.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <strong className="text-sm">{item.fileName}</strong>
                    <span className="text-xs text-muted-foreground">ID #{item.id}</span>
                  </div>
                  <StatusChip label={item.lastStatus} tone={statusTone(item.lastStatus)} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="最近任务" subtitle="自动轮询过的任务会进入这里">
        {recentTasks.length === 0 ? (
          <EmptyState title="暂无任务记录" text="上传简历或知识库之后，这里会逐步累积最近任务状态。" />
        ) : (
          <div className="flex flex-col gap-2">
            {recentTasks.slice(0, 6).map((item) => (
              <div key={`${item.resourceType}-${item.resourceId}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
                <div className="flex flex-col">
                  <strong className="text-sm">{item.fileName}</strong>
                  <span className="text-xs text-muted-foreground">
                    {item.resourceType} / #{item.resourceId}
                  </span>
                </div>
                <StatusChip label={item.taskStatus} tone={statusTone(item.taskStatus)} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
