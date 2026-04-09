import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { EmptyState, Panel } from '@/shared/ui/app-primitives';
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
    knowledgeList,
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
    <div className="grid gap-4">
      <Panel title="上传知识库" subtitle="文档上传后会触发解析与向量化">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">文档文件</span><input key={knowledgeInputKey} type="file" className="text-sm file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80" onChange={(event) => onKnowledgeFileChange(event.target.files?.[0] ?? null)} /></div>
          <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">分类</span><Input value={knowledgeCategory} onChange={(event) => onKnowledgeCategoryChange(event.target.value)} placeholder="例如：面试题 / 岗位资料 / 八股" list="category-suggestions" /><datalist id="category-suggestions">{categoryOptions.map((item) => <option key={item} value={item} />)}</datalist></div>
          <Button onClick={onKnowledgeUpload} disabled={knowledgeUploading}>{knowledgeUploading ? '上传中...' : '上传并向量化'}</Button>
        </div>
      </Panel>

      <Panel title="文档库" subtitle="知识库文档列表" actions={<Button variant="outline" onClick={onRefreshKnowledgeList} disabled={knowledgeLoading}>{knowledgeLoading ? '刷新中...' : '刷新列表'}</Button>}>
        <div className="mb-3 flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">搜索</span><Input value={knowledgeSearch} onChange={(event) => onKnowledgeSearchChange(event.target.value)} placeholder="按文件名、分类或类型过滤" /></div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
          {filteredKnowledge.length === 0 ? <EmptyState title="没有匹配的知识库" text="你可以先上传文档，或者换一个筛选关键字。" /> : filteredKnowledge.map((item) => {
            const selectedForComposer = composerKnowledgeIds.includes(item.id);
            const selectedForDetail = selectedKnowledgeId === item.id;
            return (
              <article key={item.id} className={`flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 ${selectedForDetail ? 'border-primary' : 'border-border'}`}>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="cursor-pointer border-none bg-transparent p-0 text-left text-sm font-semibold text-foreground" onClick={() => onKnowledgeOpen(item.id)}>{item.fileName}</button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
                    <Checkbox checked={selectedForComposer} onCheckedChange={() => onComposerKnowledgeToggle(item.id)} />
                    <span className="text-xs text-muted-foreground">加入草稿</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">{item.category}</span>
                  <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">{item.fileType}</span>
                  <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">{formatBytes(item.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(item.uploadTime)}</strong></div>
                <div className="flex items-center gap-3">
                  <button type="button" className="cursor-pointer border-none bg-transparent p-0 text-left text-[13px] text-indigo-text" onClick={() => onKnowledgeRevector(item.id, item.fileName)} disabled={knowledgeRevectoringId === item.id}>{knowledgeRevectoringId === item.id ? '向量化中...' : '重新向量化'}</button>
                  <button type="button" className="cursor-pointer border-none bg-transparent p-0 text-left text-[13px] text-destructive" onClick={() => onKnowledgeDelete(item.id, item.fileName)} disabled={knowledgeDeletingId === item.id}>{knowledgeDeletingId === item.id ? '删除中...' : '删除文档'}</button>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title="当前选中知识" subtitle="你可以把它们直接带进 RAG 会话创建器">
        {selectedKnowledge ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">文件名</span><strong className="text-sm">{selectedKnowledge.fileName}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">分类</span><strong className="text-sm">{selectedKnowledge.category}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">类型</span><strong className="text-sm">{selectedKnowledge.fileType}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">大小</span><strong className="text-sm">{formatBytes(selectedKnowledge.fileSize)}</strong></div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(selectedKnowledge.uploadTime)}</strong></div>
          </div>
        ) : <EmptyState title="未选中文档" text="点击左侧文档名称查看元数据。" />}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-indigo/10 bg-indigo-soft px-4 py-3">
          <div><span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-text">会话草稿</span><strong className="block text-sm">{selectedComposerKnowledge.length} 份知识源</strong></div>
          <Button variant="secondary" onClick={onGoToRag}>去创建 RAG 会话</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{selectedComposerKnowledge.map((item) => <span key={item.id} className="inline-flex items-center rounded-md bg-indigo-soft px-3 py-1 text-[13px] font-medium text-indigo-text">{item.fileName}</span>)}</div>
      </Panel>
    </div>
  );
}
