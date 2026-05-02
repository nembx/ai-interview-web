import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { EmptyState, MetricTile, StatusChip } from '@/shared/ui/app-primitives';
import type { RecentResumeRecord, ResumeDetailView, ResumeResponse, TaskStatusResponse } from '@/types';
import { formatBytes, formatDateTime, statusTone } from '@/utils';

interface ResumeWorkspaceProps {
  recentResumes: RecentResumeRecord[];
  resumeInputKey: number;
  resumeFile: File | null;
  manualResumeId: string;
  resumeLoading: boolean;
  selectedResumeId: number | null;
  resumeSnapshot: ResumeResponse | null;
  resumeDetail: ResumeDetailView | null;
  resumeTask: TaskStatusResponse | null;
  jdContent: string;
  jdMatching: boolean;
  jdResult: {
    overallScore: number;
    matchScore: number;
    missingSkills: Array<{ skillName: string; skillLevel: string }>;
    suggestions: Array<{ issue: string; recommendation: string }>;
  } | null;
  resumeUploading: boolean;
  resumeDeleting: boolean;
  resumeExporting: boolean;
  resumeReanalyzing: boolean;
  onResumeFileChange: (file: File | null) => void;
  onManualResumeIdChange: (value: string) => void;
  onJdContentChange: (value: string) => void;
  onRefreshCurrentResume: () => void;
  onResumeUpload: () => void;
  onResumeLookup: () => void;
  onResumeOpen: (resumeId: number) => void;
  onResumeReanalyze: () => void;
  onResumeExport: () => void;
  onResumeDelete: () => void;
  onJdMatch: () => void;
}

export function ResumeWorkspace(props: ResumeWorkspaceProps) {
  const {
    recentResumes,
    resumeInputKey,
    manualResumeId,
    resumeLoading,
    selectedResumeId,
    resumeSnapshot,
    resumeDetail,
    resumeTask,
    jdContent,
    jdMatching,
    jdResult,
    resumeUploading,
    resumeDeleting,
    resumeExporting,
    resumeReanalyzing,
    onResumeFileChange,
    onManualResumeIdChange,
    onJdContentChange,
    onRefreshCurrentResume,
    onResumeUpload,
    onResumeLookup,
    onResumeOpen,
    onResumeReanalyze,
    onResumeExport,
    onResumeDelete,
    onJdMatch,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">简历分析</h2>
        <Button variant="outline" size="sm" onClick={onRefreshCurrentResume} disabled={!selectedResumeId || resumeLoading}>
          刷新当前简历
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">上传简历</h3>
            <input
              key={resumeInputKey}
              type="file"
              accept=".pdf,.doc,.docx,.md"
              className="w-full text-xs file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
              onChange={(event) => onResumeFileChange(event.target.files?.[0] ?? null)}
            />
            <Button size="sm" className="w-full" onClick={onResumeUpload} disabled={resumeUploading}>
              {resumeUploading ? '上传中...' : '上传并分析'}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">按 ID 查找</h3>
            <div className="flex gap-2">
              <Input value={manualResumeId} onChange={(event) => onManualResumeIdChange(event.target.value)} placeholder="输入 ID" className="h-8" />
              <Button size="sm" variant="secondary" onClick={onResumeLookup} disabled={resumeLoading}>
                {resumeLoading ? '...' : '打开'}
              </Button>
            </div>
          </div>

          <hr className="border-border" />

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">最近简历</h3>
            {recentResumes.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">暂无记录</p>
            ) : (
              recentResumes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    selectedResumeId === item.id ? 'bg-muted font-medium' : 'hover:bg-muted/50',
                  )}
                  onClick={() => onResumeOpen(item.id)}
                >
                  <span className="truncate">{item.fileName}</span>
                  <StatusChip label={item.lastStatus} tone={statusTone(item.lastStatus)} />
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right content */}
        <div className="min-w-0 space-y-6">
          {resumeSnapshot ? (
            <>
              {/* Status bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <strong className="text-sm">{resumeSnapshot.fileName}</strong>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatBytes(resumeSnapshot.fileSize)}</span>
                      <span>{formatDateTime(resumeSnapshot.uploadTime)}</span>
                    </div>
                  </div>
                  {resumeTask && <StatusChip label={resumeTask.taskStatus} tone={statusTone(resumeTask.taskStatus)} />}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={onResumeReanalyze} disabled={resumeReanalyzing}>
                    {resumeReanalyzing ? '分析中...' : '重新分析'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={onResumeExport} disabled={!resumeDetail || resumeExporting}>
                    {resumeExporting ? '导出中...' : '导出简历分析 PDF'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={onResumeDelete} disabled={resumeDeleting}>
                    {resumeDeleting ? '删除中...' : '删除'}
                  </Button>
                </div>
              </div>

              {resumeDetail ? (
                <>
                  {/* Score */}
                  <section>
                    <h3 className="mb-3 text-sm font-medium">评分详情</h3>
                    <div className="flex items-start gap-5">
                      <div className="score-dial">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">总分</span>
                        <strong className="text-2xl font-bold tracking-tight text-indigo">{resumeDetail.analysis.overallScore}</strong>
                      </div>
                      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                        <MetricTile label="内容完整度" value={resumeDetail.analysis.contentScore.toString()} footnote="/25" compact />
                        <MetricTile label="结构清晰度" value={resumeDetail.analysis.structureScore.toString()} footnote="/20" compact />
                        <MetricTile label="技能匹配度" value={resumeDetail.analysis.skillMatchScore.toString()} footnote="/25" compact />
                        <MetricTile label="专业表达" value={resumeDetail.analysis.expressionScore.toString()} footnote="/15" compact />
                        <MetricTile label="项目经验" value={resumeDetail.analysis.projectScore.toString()} footnote="/15" compact />
                      </div>
                    </div>
                  </section>

                  {/* Summary */}
                  <section>
                    <h3 className="mb-3 text-sm font-medium">摘要与亮点</h3>
                    <p className="text-sm leading-7 text-muted-foreground">{resumeDetail.analysis.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {resumeDetail.analysis.strengths.map((item, index) => (
                        <span key={`${item}-${index}`} className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Suggestions */}
                  <section>
                    <h3 className="mb-3 text-sm font-medium">改进建议</h3>
                    {resumeDetail.analysis.suggestions.length === 0 ? (
                      <EmptyState title="暂无建议项" text="分析结果为空时这里会保持空态。" />
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                        {resumeDetail.analysis.suggestions.map((item, index) => (
                          <article key={`${item.issue}-${index}`} className="rounded-lg border border-border bg-card p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-muted-foreground">{item.category}</span>
                              <StatusChip label={item.priority} tone={item.priority === '高' ? 'danger' : item.priority === '中' ? 'warn' : 'neutral'} />
                            </div>
                            <strong className="text-sm">{item.issue}</strong>
                            <p className="mt-1 text-[13px]">{item.recommendation}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* JD Match */}
                  <section>
                    <h3 className="mb-3 text-sm font-medium">JD 匹配</h3>
                    <div className="flex items-end gap-3 max-sm:flex-col max-sm:items-stretch">
                      <Textarea value={jdContent} onChange={(event) => onJdContentChange(event.target.value)} rows={4} placeholder="粘贴岗位描述或任职要求" className="flex-1" />
                      <Button onClick={onJdMatch} disabled={jdMatching} className="shrink-0">{jdMatching ? '匹配中...' : '开始匹配'}</Button>
                    </div>
                    {jdResult && (
                      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                        <MetricTile label="总体得分" value={jdResult.overallScore.toString()} footnote="整体判断" compact />
                        <MetricTile label="匹配度" value={jdResult.matchScore.toString()} footnote="岗位贴合" compact />
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h4 className="mb-2 text-sm font-medium">缺失技能</h4>
                          {jdResult.missingSkills.length === 0 ? (
                            <p className="text-xs text-muted-foreground">暂无明显缺项</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {jdResult.missingSkills.map((item, index) => (
                                <span key={`${item.skillName}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                                  <strong>{item.skillName}</strong>
                                  <span className="text-muted-foreground">{item.skillLevel}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h4 className="mb-2 text-sm font-medium">优化建议</h4>
                          {jdResult.suggestions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">暂无匹配建议</p>
                          ) : (
                            <div className="space-y-2">
                              {jdResult.suggestions.map((item, index) => (
                                <div key={`${item.issue}-${index}`} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                                  <strong className="text-sm">{item.issue}</strong>
                                  <p className="text-xs">{item.recommendation}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Raw text */}
                  <section>
                    <h3 className="mb-3 text-sm font-medium">原始简历文本</h3>
                    <pre className="thin-scrollbar max-h-[300px] overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-[13px] leading-7 text-muted-foreground">
                      {resumeDetail.resumeText}
                    </pre>
                  </section>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {resumeSnapshot ? '分析结果尚未就绪，任务完成后将展示详情' : '先上传或打开一份简历'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-12">
              <p className="text-sm text-muted-foreground">从左侧上传或选择一份简历开始</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
