import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, MetricTile, Panel, StatusChip } from '@/shared/ui/app-primitives';
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
    <div className="grid gap-4">
      <Panel
        title="上传与查找"
        subtitle="上传会自动轮询任务；也可以直接输入已有简历 ID 打开"
        actions={
          <Button variant="outline" onClick={onRefreshCurrentResume} disabled={!selectedResumeId || resumeLoading}>
            刷新当前简历
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted-foreground">上传简历</span>
            <input
              key={resumeInputKey}
              type="file"
              accept=".pdf,.doc,.docx,.md"
              className="text-sm file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
              onChange={(event) => onResumeFileChange(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button onClick={onResumeUpload} disabled={resumeUploading}>
            {resumeUploading ? '正在上传与轮询...' : '上传并开始分析'}
          </Button>
        </div>

        <div className="mt-3 flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted-foreground">简历 ID</span>
            <Input value={manualResumeId} onChange={(event) => onManualResumeIdChange(event.target.value)} placeholder="例如 12" />
          </div>
          <Button variant="secondary" onClick={onResumeLookup} disabled={resumeLoading}>
            {resumeLoading ? '加载中...' : '打开简历'}
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {recentResumes.length === 0 ? (
            <EmptyState title="暂无最近简历" text="后端当前没有简历列表接口，这里只展示最近使用过的资源。" />
          ) : (
            recentResumes.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary hover:bg-indigo-soft"
                onClick={() => onResumeOpen(item.id)}
              >
                <div className="flex flex-col">
                  <strong className="text-sm">{item.fileName}</strong>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.updatedAt)}</span>
                </div>
                <StatusChip label={item.lastStatus} tone={statusTone(item.lastStatus)} />
              </button>
            ))
          )}
        </div>
      </Panel>

      <Panel title="当前状态" subtitle="任务状态、文件信息和操作入口">
        {resumeSnapshot ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">文件名</span><strong className="text-sm">{resumeSnapshot.fileName}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">大小</span><strong className="text-sm">{formatBytes(resumeSnapshot.fileSize)}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(resumeSnapshot.uploadTime)}</strong></div>
            {resumeTask ? <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">任务状态</span><StatusChip label={resumeTask.taskStatus} tone={statusTone(resumeTask.taskStatus)} /></div> : null}
            <div className="flex items-center gap-3 pt-1">
              <Button variant="secondary" onClick={onResumeReanalyze} disabled={resumeReanalyzing}>{resumeReanalyzing ? '分析中...' : '重新分析'}</Button>
              <Button variant="secondary" onClick={onResumeExport} disabled={!resumeDetail || resumeExporting}>{resumeExporting ? '导出中...' : '导出 PDF'}</Button>
              <Button variant="destructive" onClick={onResumeDelete} disabled={resumeDeleting}>{resumeDeleting ? '删除中...' : '删除简历'}</Button>
            </div>
          </div>
        ) : (
          <EmptyState title="尚未选择简历" text="上传一份新简历，或者从左侧最近记录里打开已有资源。" />
        )}
      </Panel>

      {resumeDetail ? (
        <>
          <Panel title="简历评分" subtitle="AI 分析评分详情">
            <div className="flex items-center gap-6">
              <div className="score-dial"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">总分</span><strong className="text-[32px] font-extrabold tracking-tight text-indigo">{resumeDetail.analysis.overallScore}</strong></div>
              <div className="flex flex-1 flex-wrap gap-2.5">
                <MetricTile label="内容完整度" value={resumeDetail.analysis.contentScore.toString()} footnote="/25" />
                <MetricTile label="结构清晰度" value={resumeDetail.analysis.structureScore.toString()} footnote="/20" />
                <MetricTile label="技能匹配度" value={resumeDetail.analysis.skillMatchScore.toString()} footnote="/25" />
                <MetricTile label="专业表达" value={resumeDetail.analysis.expressionScore.toString()} footnote="/15" />
                <MetricTile label="项目经验" value={resumeDetail.analysis.projectScore.toString()} footnote="/15" />
              </div>
            </div>
          </Panel>

          <Panel title="摘要与亮点" subtitle="简历结论概览">
            <div className="mb-3 rounded-lg border border-border bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">{resumeDetail.analysis.summary}</div>
            <div className="flex flex-wrap gap-1.5">
              {resumeDetail.analysis.strengths.map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center rounded-md bg-indigo-soft px-3 py-1 text-[13px] font-medium text-indigo-text">{item}</span>
              ))}
            </div>
          </Panel>

          <Panel title="改进建议" subtitle="按问题与建议拆分展示">
            {resumeDetail.analysis.suggestions.length === 0 ? (
              <EmptyState title="暂无建议项" text="如果后端分析结果为空，这里会保持空态。" />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
                {resumeDetail.analysis.suggestions.map((item, index) => (
                  <article key={`${item.issue}-${index}`} className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4">
                    <header className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{item.category}</span><StatusChip label={item.priority} tone={item.priority === '高' ? 'danger' : item.priority === '中' ? 'warn' : 'neutral'} /></header>
                    <strong className="text-sm">{item.issue}</strong>
                    <p className="text-[13px]">{item.recommendation}</p>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="JD 匹配" subtitle="职位描述匹配分析">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted-foreground">职位 JD</span>
                <Textarea value={jdContent} onChange={(event) => onJdContentChange(event.target.value)} rows={7} placeholder="粘贴岗位描述、任职要求或职位链接解析后的文本" />
              </div>
              <Button onClick={onJdMatch} disabled={jdMatching}>{jdMatching ? '匹配中...' : '开始 JD 匹配'}</Button>
            </div>
            {jdResult ? (
              <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
                <MetricTile label="总体得分" value={jdResult.overallScore.toString()} footnote="整体判断" />
                <MetricTile label="匹配度" value={jdResult.matchScore.toString()} footnote="岗位贴合" />
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"><h4 className="text-sm font-semibold">缺失技能</h4>{jdResult.missingSkills.length === 0 ? <p className="text-[13px] text-muted-foreground">暂无明显缺项</p> : null}{jdResult.missingSkills.map((item, index) => <div key={`${item.skillName}-${index}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-[13px]"><strong className="text-[13px]">{item.skillName}</strong><span className="text-xs text-muted-foreground">{item.skillLevel}</span></div>)}</div>
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"><h4 className="text-sm font-semibold">优化建议</h4>{jdResult.suggestions.length === 0 ? <p className="text-[13px] text-muted-foreground">暂无匹配建议</p> : null}{jdResult.suggestions.map((item, index) => <article key={`${item.issue}-${index}`} className="rounded-md border border-border bg-muted/50 px-3 py-2.5"><strong className="text-sm">{item.issue}</strong><p className="text-[13px]">{item.recommendation}</p></article>)}</div>
              </div>
            ) : null}
          </Panel>

          <Panel title="原始简历文本" subtitle="用于核对解析结果是否完整">
            <pre className="thin-scrollbar max-h-[400px] overflow-auto rounded-lg border border-border bg-muted/50 p-4 text-[13px] leading-7 text-muted-foreground">{resumeDetail.resumeText}</pre>
          </Panel>
        </>
      ) : (
        <Panel title="分析结果" subtitle="任务完成后将展示分析详情">
          <EmptyState title={resumeSnapshot ? '分析结果尚未就绪' : '还没有简历数据'} text={resumeSnapshot ? '当前简历存在，但分析详情只会在任务 COMPLETED 后返回。' : '先上传或打开一份简历。'} />
        </Panel>
      )}
    </div>
  );
}
