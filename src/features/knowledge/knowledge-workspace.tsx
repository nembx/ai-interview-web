import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/shared/ui/app-primitives';
import type { KnowledgeListItem, KnowledgeResponse } from '@/types';
import { formatBytes, formatDateTime } from '@/utils';

interface KnowledgeWorkspaceProps {
  knowledgeInputKey: number;
  knowledgeCategory: string;
  knowledgeUploading: boolean;
  knowledgeList: KnowledgeListItem[];
  knowledgeLoading: boolean;
  knowledgeSearch: string;
  filteredKnowledge: KnowledgeListItem[];
  categoryOptions: string[];
  selectedKnowledgeId: number | null;
  selectedKnowledge: KnowledgeResponse | null;
  knowledgeDeletingId: number | null;
  knowledgeRevectoringId: number | null;
  composerKnowledgeIds: number[];
  selectedComposerKnowledge: KnowledgeListItem[];
  onKnowledgeFileChange: (file: File | null) => void;
  onKnowledgeCategoryChange: (value: string) => void;
  onKnowledgeSearchChange: (value: string) => void;
  onKnowledgeUpload: () => void;
  onRefreshKnowledgeList: () => void;
  onKnowledgeOpen: (knowledgeId: number) => void;
  onComposerKnowledgeToggle: (knowledgeId: number) => void;
  onKnowledgeRevector: (knowledgeId: number, fileName: string) => void;
  onKnowledgeDelete: (knowledgeId: number, fileName: string) => void;
  onGoToRag: () => void;
}

export function KnowledgeWorkspace(props: KnowledgeWorkspaceProps) {
  const {
    knowledgeInputKey,
    knowledgeCategory,
    knowledgeUploading,
    knowledgeLoading,
    knowledgeSearch,
    filteredKnowledge,
    categoryOptions,
    selectedKnowledgeId,
    selectedKnowledge,
    knowledgeDeletingId,
    knowledgeRevectoringId,
    composerKnowledgeIds,
    selectedComposerKnowledge,
    onKnowledgeFileChange,
    onKnowledgeCategoryChange,
    onKnowledgeSearchChange,
    onKnowledgeUpload,
    onRefreshKnowledgeList,
    onKnowledgeOpen,
    onComposerKnowledgeToggle,
    onKnowledgeRevector,
    onKnowledgeDelete,
    onGoToRag,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">知识库</h2>
        <Button variant="outline" size="sm" onClick={onRefreshKnowledgeList} disabled={knowledgeLoading}>
          {knowledgeLoading ? '刷新中...' : '刷新列表'}
        </Button>
      </div>

      {/* Upload bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">文档文件</span>
          <input
            key={knowledgeInputKey}
            type="file"
            className="text-xs file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
            onChange={(event) => onKnowledgeFileChange(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">分类</span>
          <Input className="h-8 w-36" value={knowledgeCategory} onChange={(event) => onKnowledgeCategoryChange(event.target.value)} placeholder="面试题" list="category-suggestions" />
          <datalist id="category-suggestions">{categoryOptions.map((item) => <option key={item} value={item} />)}</datalist>
        </div>
        <Button size="sm" onClick={onKnowledgeUpload} disabled={knowledgeUploading}>
          {knowledgeUploading ? '上传中...' : '上传并向量化'}
        </Button>
      </div>

      {/* Search */}
      <Input value={knowledgeSearch} onChange={(event) => onKnowledgeSearchChange(event.target.value)} placeholder="搜索文件名、分类或类型..." className="h-8 max-w-sm" />

      {/* Document grid */}
      {filteredKnowledge.length === 0 ? (
        <EmptyState title="没有匹配的知识库" text="你可以先上传文档，或者换一个筛选关键字。" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {filteredKnowledge.map((item) => {
            const selectedForComposer = composerKnowledgeIds.includes(item.id);
            const selectedForDetail = selectedKnowledgeId === item.id;
            return (
              <article
                key={item.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors',
                  selectedForDetail ? 'border-primary' : 'border-border hover:border-primary/30',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="cursor-pointer border-none bg-transparent p-0 text-left text-sm font-semibold text-foreground hover:text-primary"
                    onClick={() => onKnowledgeOpen(item.id)}
                  >
                    {item.fileName}
                  </button>
                  <Checkbox checked={selectedForComposer} onCheckedChange={() => onComposerKnowledgeToggle(item.id)} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">{item.category}</span>
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">{item.fileType}</span>
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">{formatBytes(item.fileSize)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{formatDateTime(item.uploadTime)}</div>
                <div className="flex items-center gap-3 border-t border-border pt-2 text-xs">
                  <button
                    type="button"
                    className="cursor-pointer border-none bg-transparent p-0 text-primary hover:underline"
                    onClick={() => onKnowledgeRevector(item.id, item.fileName)}
                    disabled={knowledgeRevectoringId === item.id}
                  >
                    {knowledgeRevectoringId === item.id ? '向量化中...' : '重新向量化'}
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer border-none bg-transparent p-0 text-destructive hover:underline"
                    onClick={() => onKnowledgeDelete(item.id, item.fileName)}
                    disabled={knowledgeDeletingId === item.id}
                  >
                    {knowledgeDeletingId === item.id ? '删除中...' : '删除'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail + Composer */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">文档详情</h3>
          {selectedKnowledge ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">文件名</dt>
              <dd className="font-medium">{selectedKnowledge.fileName}</dd>
              <dt className="text-muted-foreground">分类</dt>
              <dd className="font-medium">{selectedKnowledge.category}</dd>
              <dt className="text-muted-foreground">类型</dt>
              <dd className="font-medium">{selectedKnowledge.fileType}</dd>
              <dt className="text-muted-foreground">大小</dt>
              <dd className="font-medium">{formatBytes(selectedKnowledge.fileSize)}</dd>
              <dt className="text-muted-foreground">上传时间</dt>
              <dd className="font-medium">{formatDateTime(selectedKnowledge.uploadTime)}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">点击文档名称查看详情</p>
          )}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">会话草稿</h3>
              <span className="text-xs text-muted-foreground">{selectedComposerKnowledge.length} 份知识源已选中</span>
            </div>
            <Button size="sm" onClick={onGoToRag}>创建 RAG 会话</Button>
          </div>
          {selectedComposerKnowledge.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedComposerKnowledge.map((item) => (
                <span key={item.id} className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {item.fileName}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
