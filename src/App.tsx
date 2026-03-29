import { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  createRagSession,
  deleteKnowledge,
  deleteRagSession,
  deleteResume,
  exportResumePdf,
  getJdMatchResult,
  getKnowledgeById,
  getKnowledgeList,
  getRagSessionDetail,
  getRagSessions,
  getResume,
  getResumeDetail,
  getTaskStatus,
  matchResumeWithJd,
  streamRagChat,
  updateRagSessionKnowledge,
  updateRagSessionStatus,
  updateRagSessionTitle,
  uploadKnowledge,
  uploadResume,
} from './api';
import type {
  KnowledgeListItem,
  KnowledgeResponse,
  RagSessionDetailResponse,
  RagSessionResponse,
  RecentResumeRecord,
  RecentTaskRecord,
  ResourceType,
  ResumeDetailView,
  ResumeResponse,
  SessionStatus,
  TaskStatus,
  TaskStatusResponse,
} from './types';
import {
  formatBytes,
  formatDateTime,
  normalizeJdMatch,
  normalizeResumeDetail,
  statusTone,
  upsertResumeRecord,
  upsertTaskRecord,
} from './utils';
import { EmptyState, FeatureCard, MetricTile, Panel, StatusChip } from './ui';

type View = 'overview' | 'resume' | 'knowledge' | 'rag' | 'tasks';
type NoticeTone = 'neutral' | 'success' | 'danger';

interface NoticeState {
  message: string;
  tone: NoticeTone;
}

const RECENT_RESUMES_KEY = 'ai-interview-web/recent-resumes';
const RECENT_TASKS_KEY = 'ai-interview-web/recent-tasks';

function readStoredArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('overview');
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [recentResumes, setRecentResumes] = useState<RecentResumeRecord[]>(() => readStoredArray(RECENT_RESUMES_KEY, []));
  const [recentTasks, setRecentTasks] = useState<RecentTaskRecord[]>(() => readStoredArray(RECENT_TASKS_KEY, []));

  const [resumeInputKey, setResumeInputKey] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [manualResumeId, setManualResumeId] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [resumeSnapshot, setResumeSnapshot] = useState<ResumeResponse | null>(null);
  const [resumeDetail, setResumeDetail] = useState<ResumeDetailView | null>(null);
  const [resumeTask, setResumeTask] = useState<TaskStatusResponse | null>(null);
  const [jdContent, setJdContent] = useState('');
  const [jdMatching, setJdMatching] = useState(false);
  const [jdResult, setJdResult] = useState<ReturnType<typeof normalizeJdMatch> | null>(null);
  const [resumeDeleting, setResumeDeleting] = useState(false);
  const [resumeExporting, setResumeExporting] = useState(false);

  const [knowledgeInputKey, setKnowledgeInputKey] = useState(0);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [knowledgeCategory, setKnowledgeCategory] = useState('面试题');
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeListItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const deferredKnowledgeSearch = useDeferredValue(knowledgeSearch);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<number | null>(null);
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeResponse | null>(null);
  const [knowledgeDeletingId, setKnowledgeDeletingId] = useState<number | null>(null);
  const [composerKnowledgeIds, setComposerKnowledgeIds] = useState<number[]>([]);

  const [sessionTab, setSessionTab] = useState<SessionStatus>('ACTIVE');
  const [sessionSearch, setSessionSearch] = useState('');
  const deferredSessionSearch = useDeferredValue(sessionSearch);
  const [activeSessions, setActiveSessions] = useState<RagSessionResponse[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<RagSessionResponse[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<RagSessionDetailResponse | null>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [sessionTitleDraft, setSessionTitleDraft] = useState('');
  const [sessionKnowledgeDraft, setSessionKnowledgeDraft] = useState<number[]>([]);
  const [sessionQuestion, setSessionQuestion] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);

  const [taskLookupType, setTaskLookupType] = useState<ResourceType>('resume');
  const [taskLookupId, setTaskLookupId] = useState('');
  const [taskLookupLoading, setTaskLookupLoading] = useState(false);
  const [taskLookupResult, setTaskLookupResult] = useState<TaskStatusResponse | null>(null);

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(RECENT_RESUMES_KEY, JSON.stringify(recentResumes));
  }, [recentResumes]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_TASKS_KEY, JSON.stringify(recentTasks));
  }, [recentTasks]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    void refreshKnowledgeList();
    void refreshSessions();
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedSessionDetail]);

  function pushNotice(message: string, tone: NoticeTone = 'neutral'): void {
    setNotice({ message, tone });
  }

  function trackResume(id: number, fileName: string, lastStatus: TaskStatus): void {
    setRecentResumes((current) =>
      upsertResumeRecord(current, {
        id,
        fileName,
        lastStatus,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function trackTask(
    item: Pick<TaskStatusResponse, 'resourceId' | 'resourceType' | 'taskStatus'> & Partial<Pick<TaskStatusResponse, 'fileName'>>,
    fallbackName: string,
  ): void {
    setRecentTasks((current) =>
      upsertTaskRecord(current, {
        resourceId: item.resourceId,
        resourceType: item.resourceType,
        fileName: item.fileName || fallbackName,
        taskStatus: item.taskStatus,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  async function pollTaskUntilSettled(resourceType: ResourceType, resourceId: number, fallbackName: string) {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const status = await getTaskStatus(resourceType, resourceId);
      const normalizedStatus = {
        ...status,
        fileName: status.fileName || fallbackName,
      };

      setResumeTask((current) => (resourceType === 'resume' && current?.resourceId === resourceId ? normalizedStatus : current));
      trackTask(normalizedStatus, fallbackName);
      if (resourceType === 'resume') {
        trackResume(resourceId, normalizedStatus.fileName, normalizedStatus.taskStatus);
      }

      if (normalizedStatus.taskStatus === 'COMPLETED' || normalizedStatus.taskStatus === 'FAILED') {
        return normalizedStatus;
      }

      await sleep(2000);
    }

    throw new Error('任务轮询超时，请稍后手动刷新');
  }

  async function refreshKnowledgeList(): Promise<void> {
    setKnowledgeLoading(true);
    try {
      setKnowledgeList(await getKnowledgeList());
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setKnowledgeLoading(false);
    }
  }

  async function refreshSessions(): Promise<void> {
    setSessionsLoading(true);
    try {
      const [active, archived] = await Promise.all([getRagSessions('ACTIVE'), getRagSessions('ARCHIVED')]);
      setActiveSessions(active);
      setArchivedSessions(archived);
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setSessionsLoading(false);
    }
  }

  async function loadKnowledgeDetail(knowledgeId: number): Promise<void> {
    setSelectedKnowledgeId(knowledgeId);
    try {
      setSelectedKnowledge(await getKnowledgeById(knowledgeId));
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
      setSelectedKnowledge(null);
    }
  }

  async function loadResumeWorkspace(resumeId: number): Promise<void> {
    setResumeLoading(true);
    setSelectedResumeId(resumeId);
    setJdResult(null);
    try {
      const [status, snapshot] = await Promise.all([getTaskStatus('resume', resumeId), getResume(resumeId)]);
      setResumeTask(status);
      setResumeSnapshot(snapshot);
      trackTask(status, snapshot.fileName);
      trackResume(snapshot.id, snapshot.fileName, status.taskStatus);

      if (status.taskStatus === 'COMPLETED') {
        setResumeDetail(normalizeResumeDetail(await getResumeDetail(resumeId)));
        try {
          setJdResult(normalizeJdMatch(await getJdMatchResult(resumeId)));
        } catch {
          setJdResult(null);
        }
      } else {
        setResumeDetail(null);
      }
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
      setResumeSnapshot(null);
      setResumeDetail(null);
    } finally {
      setResumeLoading(false);
    }
  }

  async function loadSessionDetail(sessionId: number): Promise<void> {
    setSessionDetailLoading(true);
    setSelectedSessionId(sessionId);
    try {
      const detail = await getRagSessionDetail(sessionId);
      setSelectedSessionDetail(detail);
      setSessionTitleDraft(detail.title);
      setSessionKnowledgeDraft(detail.knowledgeBases.map((item) => item.id));
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
      setSelectedSessionDetail(null);
    } finally {
      setSessionDetailLoading(false);
    }
  }
  async function handleResumeUpload(): Promise<void> {
    if (!resumeFile) {
      pushNotice('先选择一份简历文件', 'danger');
      return;
    }

    setResumeUploading(true);
    setActiveView('resume');
    try {
      const submitted = await uploadResume(resumeFile);
      trackTask(submitted, resumeFile.name);
      trackResume(submitted.resourceId, resumeFile.name, submitted.taskStatus);
      setResumeTask({
        resourceId: submitted.resourceId,
        resourceType: submitted.resourceType,
        fileName: resumeFile.name,
        taskStatus: submitted.taskStatus,
        uploadTime: new Date().toISOString(),
      });
      setResumeSnapshot({
        id: submitted.resourceId,
        fileName: resumeFile.name,
        fileSize: resumeFile.size,
        contentType: resumeFile.type || 'application/octet-stream',
        resumeText: '',
        uploadTime: new Date().toISOString(),
      });
      setSelectedResumeId(submitted.resourceId);
      setResumeDetail(null);
      setJdResult(null);

      const finalStatus = await pollTaskUntilSettled(submitted.resourceType, submitted.resourceId, resumeFile.name);
      if (finalStatus.taskStatus === 'COMPLETED') {
        await loadResumeWorkspace(submitted.resourceId);
        pushNotice('简历分析已完成', 'success');
      } else {
        pushNotice('简历分析失败，请检查后端日志', 'danger');
      }

      setResumeFile(null);
      setResumeInputKey((value) => value + 1);
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setResumeUploading(false);
    }
  }

  async function handleResumeLookup(): Promise<void> {
    const resumeId = Number.parseInt(manualResumeId, 10);
    if (Number.isNaN(resumeId)) {
      pushNotice('请输入有效的简历 ID', 'danger');
      return;
    }

    await loadResumeWorkspace(resumeId);
  }

  async function handleResumeDelete(): Promise<void> {
    if (!selectedResumeId || !resumeSnapshot || !window.confirm(`确定删除简历 ${resumeSnapshot.fileName} 吗？`)) {
      return;
    }

    setResumeDeleting(true);
    try {
      await deleteResume(selectedResumeId);
      setRecentResumes((current) => current.filter((item) => item.id !== selectedResumeId));
      setRecentTasks((current) => current.filter((item) => !(item.resourceType === 'resume' && item.resourceId === selectedResumeId)));
      setSelectedResumeId(null);
      setResumeSnapshot(null);
      setResumeDetail(null);
      setResumeTask(null);
      setJdResult(null);
      pushNotice('简历已删除', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setResumeDeleting(false);
    }
  }

  async function handleResumeExport(): Promise<void> {
    if (!selectedResumeId) {
      return;
    }

    setResumeExporting(true);
    try {
      const file = await exportResumePdf(selectedResumeId);
      triggerDownload(file.blob, file.fileName);
      pushNotice('PDF 已开始下载', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setResumeExporting(false);
    }
  }

  async function handleJdMatch(): Promise<void> {
    if (!selectedResumeId || !resumeDetail) {
      pushNotice('先加载一份已完成分析的简历', 'danger');
      return;
    }

    if (!jdContent.trim()) {
      pushNotice('请输入职位 JD 文本', 'danger');
      return;
    }

    setJdMatching(true);
    try {
      await matchResumeWithJd(selectedResumeId, jdContent.trim());
      setJdResult(normalizeJdMatch(await getJdMatchResult(selectedResumeId)));
      pushNotice('JD 匹配分析完成', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setJdMatching(false);
    }
  }

  async function handleKnowledgeUpload(): Promise<void> {
    if (!knowledgeFile) {
      pushNotice('先选择知识库文件', 'danger');
      return;
    }

    if (!knowledgeCategory.trim()) {
      pushNotice('请填写分类', 'danger');
      return;
    }

    setKnowledgeUploading(true);
    setActiveView('knowledge');
    try {
      const submitted = await uploadKnowledge(knowledgeFile, knowledgeCategory.trim());
      trackTask(submitted, knowledgeFile.name);
      const finalStatus = await pollTaskUntilSettled(submitted.resourceType, submitted.resourceId, knowledgeFile.name);
      await refreshKnowledgeList();
      await loadKnowledgeDetail(submitted.resourceId);
      setComposerKnowledgeIds((current) => (current.includes(submitted.resourceId) ? current : [submitted.resourceId, ...current].slice(0, 6)));
      pushNotice(finalStatus.taskStatus === 'COMPLETED' ? '知识库向量化完成' : '知识库任务失败，请检查后端日志', finalStatus.taskStatus === 'COMPLETED' ? 'success' : 'danger');
      setKnowledgeFile(null);
      setKnowledgeInputKey((value) => value + 1);
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setKnowledgeUploading(false);
    }
  }

  async function handleKnowledgeDelete(knowledgeId: number, fileName: string): Promise<void> {
    if (!window.confirm(`确定删除知识库 ${fileName} 吗？`)) {
      return;
    }

    setKnowledgeDeletingId(knowledgeId);
    try {
      await deleteKnowledge(knowledgeId);
      setKnowledgeList((current) => current.filter((item) => item.id !== knowledgeId));
      setComposerKnowledgeIds((current) => current.filter((item) => item !== knowledgeId));
      if (selectedKnowledgeId === knowledgeId) {
        setSelectedKnowledgeId(null);
        setSelectedKnowledge(null);
      }
      pushNotice('知识库已删除', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setKnowledgeDeletingId(null);
    }
  }

  async function handleCreateSession(): Promise<void> {
    if (composerKnowledgeIds.length === 0) {
      pushNotice('至少选择一个知识库后再创建会话', 'danger');
      return;
    }

    try {
      const session = await createRagSession({ knowledgeIds: composerKnowledgeIds, title: newSessionTitle.trim() || undefined });
      setActiveView('rag');
      setSessionTab('ACTIVE');
      setNewSessionTitle('');
      await refreshSessions();
      await loadSessionDetail(session.id);
      pushNotice('RAG 会话已创建', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    }
  }

  async function handleSessionTitleUpdate(): Promise<void> {
    if (!selectedSessionDetail) {
      return;
    }

    try {
      await updateRagSessionTitle(selectedSessionDetail.id, sessionTitleDraft.trim());
      await refreshSessions();
      await loadSessionDetail(selectedSessionDetail.id);
      pushNotice('会话标题已更新', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    }
  }
  async function handleSessionKnowledgeUpdate(): Promise<void> {
    if (!selectedSessionDetail) {
      return;
    }

    try {
      await updateRagSessionKnowledge(selectedSessionDetail.id, sessionKnowledgeDraft);
      await loadSessionDetail(selectedSessionDetail.id);
      pushNotice('会话知识源已更新', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    }
  }

  async function handleSessionStatusToggle(): Promise<void> {
    if (!selectedSessionDetail) {
      return;
    }

    const nextStatus: SessionStatus = selectedSessionDetail.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      await updateRagSessionStatus(selectedSessionDetail.id, nextStatus);
      setSessionTab(nextStatus);
      await refreshSessions();
      await loadSessionDetail(selectedSessionDetail.id);
      pushNotice(nextStatus === 'ARCHIVED' ? '会话已归档' : '会话已恢复', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    }
  }

  async function handleSessionDelete(): Promise<void> {
    if (!selectedSessionDetail || !window.confirm(`确定删除会话 ${selectedSessionDetail.title} 吗？`)) {
      return;
    }

    try {
      await deleteRagSession(selectedSessionDetail.id);
      setSelectedSessionId(null);
      setSelectedSessionDetail(null);
      await refreshSessions();
      pushNotice('会话已删除', 'success');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    }
  }

  async function handleSendQuestion(): Promise<void> {
    if (!selectedSessionDetail) {
      pushNotice('先选择一个会话', 'danger');
      return;
    }

    if (selectedSessionDetail.status !== 'ACTIVE') {
      pushNotice('归档会话不能继续提问', 'danger');
      return;
    }

    const question = sessionQuestion.trim();
    if (!question) {
      pushNotice('请输入问题', 'danger');
      return;
    }

    const tempSeed = Date.now();
    setChatStreaming(true);
    setSessionQuestion('');
    setSelectedSessionDetail((current) =>
      current
        ? {
            ...current,
            messages: [
              ...current.messages,
              { id: -tempSeed, type: 'USER', content: question, transient: true },
              { id: -(tempSeed + 1), type: 'ASSISTANT', content: '', transient: true },
            ],
          }
        : current,
    );

    try {
      await streamRagChat(selectedSessionDetail.id, question, {
        onToken: (token) => {
          setSelectedSessionDetail((current) => {
            if (!current) {
              return current;
            }

            const messages = [...current.messages];
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.type !== 'ASSISTANT') {
              return current;
            }

            messages[messages.length - 1] = { ...lastMessage, content: `${lastMessage.content}${token}`, transient: true };
            return { ...current, messages };
          });
        },
      });
      await refreshSessions();
      await loadSessionDetail(selectedSessionDetail.id);
    } catch (error) {
      setSelectedSessionDetail((current) => {
        if (!current) {
          return current;
        }

        const messages = [...current.messages];
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.type !== 'ASSISTANT') {
          return current;
        }

        messages[messages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content || `回答失败：${(error as Error).message}`,
          transient: true,
        };
        return { ...current, messages };
      });
      pushNotice((error as Error).message, 'danger');
    } finally {
      setChatStreaming(false);
    }
  }

  async function runTaskLookup(resourceType: ResourceType, resourceId: number): Promise<void> {
    setTaskLookupLoading(true);
    try {
      const result = await getTaskStatus(resourceType, resourceId);
      setTaskLookupType(resourceType);
      setTaskLookupId(resourceId.toString());
      setTaskLookupResult(result);
      trackTask(result, result.fileName);
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setTaskLookupLoading(false);
    }
  }

  async function handleTaskLookup(): Promise<void> {
    const resourceId = Number.parseInt(taskLookupId, 10);
    if (Number.isNaN(resourceId)) {
      pushNotice('请输入有效的资源 ID', 'danger');
      return;
    }

    await runTaskLookup(taskLookupType, resourceId);
  }

  const filteredKnowledge = knowledgeList.filter((item) => {
    const keyword = deferredKnowledgeSearch.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return [item.fileName, item.category, item.fileType].some((field) => field.toLowerCase().includes(keyword));
  });
  const categoryOptions = Array.from(new Set(knowledgeList.map((item) => item.category).filter(Boolean))).sort();
  const visibleSessions = (sessionTab === 'ACTIVE' ? activeSessions : archivedSessions).filter((item) => {
    const keyword = deferredSessionSearch.trim().toLowerCase();
    return !keyword || item.title.toLowerCase().includes(keyword) || item.id.toString().includes(keyword);
  });
  const selectedComposerKnowledge = knowledgeList.filter((item) => composerKnowledgeIds.includes(item.id));
  const inFlightTaskCount = recentTasks.filter((item) => item.taskStatus === 'PENDING' || item.taskStatus === 'PROCESSING').length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <span className="eyebrow">Spring AI / React TS</span>
          <h1>AI Interview Console</h1>
          <p>一个对接你当前后端接口的前端工作台，覆盖简历分析、知识库、RAG 会话和任务追踪。</p>
          <div className="brand-metrics">
            <MetricTile label="知识库" value={knowledgeList.length.toString()} footnote="已接入文档" compact />
            <MetricTile label="会话" value={(activeSessions.length + archivedSessions.length).toString()} footnote="RAG 空间" compact />
          </div>
        </div>

        <nav className="nav-list">
          {[
            ['overview', '总览'],
            ['resume', '简历分析'],
            ['knowledge', '知识库'],
            ['rag', 'RAG 会话'],
            ['tasks', '任务中心'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={`nav-button ${activeView === value ? 'is-active' : ''}`} onClick={() => setActiveView(value as View)}>
              <span>{label}</span>
              {value === 'tasks' && inFlightTaskCount > 0 ? <strong>{inFlightTaskCount}</strong> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="eyebrow">后端基线</span>
          <p>默认通过 Vite 代理转发到 localhost:8080。独立部署接口时，改 VITE_API_BASE_URL 即可。</p>
        </div>
      </aside>

      <main className="main-panel">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">Workspace</span>
            <h2>
              {activeView === 'overview' && '把后端能力直接变成可操作页面'}
              {activeView === 'resume' && '围绕简历上传、分析、导出和 JD 匹配工作'}
              {activeView === 'knowledge' && '管理知识文档并准备会话素材'}
              {activeView === 'rag' && '创建会话、调整知识源并流式问答'}
              {activeView === 'tasks' && '轮询异步任务，定位处理中或失败资源'}
            </h2>
            <p>这个前端按你当前 Spring Boot 控制器的接口能力实现，上传类任务会自动轮询，RAG 对话走 POST + SSE 流式消费。</p>
          </div>
          <div className="hero-stats">
            <MetricTile label="最近简历" value={recentResumes.length.toString()} footnote="本地记忆" />
            <MetricTile label="处理中任务" value={inFlightTaskCount.toString()} footnote="自动轮询" />
            <MetricTile label="选中知识源" value={composerKnowledgeIds.length.toString()} footnote="会话草稿" />
          </div>
        </section>

        {notice ? <div className={`notice tone-${notice.tone}`}>{notice.message}</div> : null}
        {activeView === 'overview' ? (
          <section className="view-grid">
            <Panel title="后端能力映射" subtitle="来自当前控制器与实体定义">
              <div className="capability-grid">
                <FeatureCard title="简历分析链路" text="上传简历、查询状态、读取分析详情、删除、导出 PDF、再做 JD 匹配。" />
                <FeatureCard title="知识库管理" text="上传知识文档并分类，查看列表、按分类筛选、删除、选作 RAG 会话资料。" />
                <FeatureCard title="RAG Studio" text="创建/归档/删除会话、更新知识源和标题、按流式 SSE 消费回答。" />
                <FeatureCard title="任务中心" text="围绕 resume / knowledge 的 resourceId 查询异步状态，并保留最近任务历史。" />
              </div>
            </Panel>

            <Panel title="建议操作顺序" subtitle="按当前后端结构最顺的使用路径">
              <ol className="steps-list">
                <li>先上传简历，等分析任务完成后查看评分、摘要和改进建议。</li>
                <li>再上传知识库文档，把常用面试资料或岗位资料选进会话草稿。</li>
                <li>在 RAG 会话里创建新会话，用流式问答验证知识命中效果。</li>
                <li>如果上传或向量化卡住，去任务中心按资源 ID 检查状态。</li>
              </ol>
            </Panel>

            <Panel title="最近简历" subtitle="后端没有简历列表接口，因此这里使用本地最近访问记录">
              {recentResumes.length === 0 ? (
                <EmptyState title="还没有简历历史" text="上传成功后会把资源 ID 和状态保存在浏览器本地，方便再次打开。" />
              ) : (
                <div className="list-stack">
                  {recentResumes.map((item) => (
                    <button key={item.id} type="button" className="list-card" onClick={() => { setActiveView('resume'); void loadResumeWorkspace(item.id); }}>
                      <div>
                        <strong>{item.fileName}</strong>
                        <span>ID #{item.id}</span>
                      </div>
                      <StatusChip label={item.lastStatus} tone={statusTone(item.lastStatus)} />
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="最近任务" subtitle="自动轮询过的任务会进入这里">
              {recentTasks.length === 0 ? (
                <EmptyState title="暂无任务记录" text="上传简历或知识库之后，这里会逐步累积最近任务状态。" />
              ) : (
                <div className="list-stack">
                  {recentTasks.slice(0, 6).map((item) => (
                    <div key={`${item.resourceType}-${item.resourceId}`} className="task-row">
                      <div>
                        <strong>{item.fileName}</strong>
                        <span>{item.resourceType} / #{item.resourceId}</span>
                      </div>
                      <StatusChip label={item.taskStatus} tone={statusTone(item.taskStatus)} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>
        ) : null}

        {activeView === 'resume' ? (
          <section className="view-grid">
            <Panel title="上传与查找" subtitle="上传会自动轮询任务；也可以直接输入已有简历 ID 打开" actions={<button type="button" className="ghost-button" onClick={() => selectedResumeId && void loadResumeWorkspace(selectedResumeId)} disabled={!selectedResumeId || resumeLoading}>刷新当前简历</button>}>
              <div className="form-stack">
                <label className="field-block"><span>上传简历</span><input key={resumeInputKey} type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} /></label>
                <button type="button" className="primary-button" onClick={() => void handleResumeUpload()} disabled={resumeUploading}>{resumeUploading ? '正在上传与轮询...' : '上传并开始分析'}</button>
              </div>

              <div className="form-inline">
                <label className="field-block grow"><span>简历 ID</span><input value={manualResumeId} onChange={(event) => setManualResumeId(event.target.value)} placeholder="例如 12" /></label>
                <button type="button" className="secondary-button" onClick={() => void handleResumeLookup()} disabled={resumeLoading}>{resumeLoading ? '加载中...' : '打开简历'}</button>
              </div>

              <div className="list-stack">
                {recentResumes.length === 0 ? <EmptyState title="暂无最近简历" text="后端当前没有简历列表接口，这里只展示最近使用过的资源。" /> : recentResumes.map((item) => (
                  <button key={item.id} type="button" className="list-card" onClick={() => void loadResumeWorkspace(item.id)}>
                    <div><strong>{item.fileName}</strong><span>{formatDateTime(item.updatedAt)}</span></div>
                    <StatusChip label={item.lastStatus} tone={statusTone(item.lastStatus)} />
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="当前状态" subtitle="任务状态、文件信息和操作入口">
              {resumeSnapshot ? (
                <div className="detail-stack">
                  <div className="detail-row"><span>文件名</span><strong>{resumeSnapshot.fileName}</strong></div>
                  <div className="detail-row"><span>大小</span><strong>{formatBytes(resumeSnapshot.fileSize)}</strong></div>
                  <div className="detail-row"><span>上传时间</span><strong>{formatDateTime(resumeSnapshot.uploadTime)}</strong></div>
                  {resumeTask ? <div className="detail-row"><span>任务状态</span><StatusChip label={resumeTask.taskStatus} tone={statusTone(resumeTask.taskStatus)} /></div> : null}
                  <div className="button-row">
                    <button type="button" className="secondary-button" onClick={() => void handleResumeExport()} disabled={!resumeDetail || resumeExporting}>{resumeExporting ? '导出中...' : '导出 PDF'}</button>
                    <button type="button" className="danger-button" onClick={() => void handleResumeDelete()} disabled={!resumeSnapshot || resumeDeleting}>{resumeDeleting ? '删除中...' : '删除简历'}</button>
                  </div>
                </div>
              ) : <EmptyState title="尚未选择简历" text="上传一份新简历，或者从左侧最近记录里打开已有资源。" />}
            </Panel>

            {resumeDetail ? (
              <>
                <Panel title="简历评分" subtitle="后端分析实体 + JSON 字段已在前端做了解析">
                  <div className="score-hero">
                    <div className="score-dial"><span>总分</span><strong>{resumeDetail.analysis.overallScore}</strong></div>
                    <div className="score-grid">
                      <MetricTile label="内容完整度" value={resumeDetail.analysis.contentScore.toString()} footnote="/25" />
                      <MetricTile label="结构清晰度" value={resumeDetail.analysis.structureScore.toString()} footnote="/20" />
                      <MetricTile label="技能匹配度" value={resumeDetail.analysis.skillMatchScore.toString()} footnote="/25" />
                      <MetricTile label="专业表达" value={resumeDetail.analysis.expressionScore.toString()} footnote="/15" />
                      <MetricTile label="项目经验" value={resumeDetail.analysis.projectScore.toString()} footnote="/15" />
                    </div>
                  </div>
                </Panel>

                <Panel title="摘要与亮点" subtitle="适合快速过一遍简历结论">
                  <div className="summary-box">{resumeDetail.analysis.summary}</div>
                  <div className="pill-list">{resumeDetail.analysis.strengths.map((item, index) => <span key={`${item}-${index}`} className="highlight-pill">{item}</span>)}</div>
                </Panel>

                <Panel title="改进建议" subtitle="按问题与建议拆分展示">
                  {resumeDetail.analysis.suggestions.length === 0 ? <EmptyState title="暂无建议项" text="如果后端分析结果为空，这里会保持空态。" /> : (
                    <div className="suggestion-grid">
                      {resumeDetail.analysis.suggestions.map((item, index) => (
                        <article key={`${item.issue}-${index}`} className="suggestion-card">
                          <header><span>{item.category}</span><StatusChip label={item.priority} tone={item.priority === '高' ? 'danger' : item.priority === '中' ? 'warn' : 'neutral'} /></header>
                          <strong>{item.issue}</strong>
                          <p>{item.recommendation}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="JD 匹配" subtitle="直接调用 /jd-match 接口">
                  <div className="form-stack">
                    <label className="field-block"><span>职位 JD</span><textarea value={jdContent} onChange={(event) => setJdContent(event.target.value)} rows={7} placeholder="粘贴岗位描述、任职要求或职位链接解析后的文本" /></label>
                    <button type="button" className="primary-button" onClick={() => void handleJdMatch()} disabled={jdMatching}>{jdMatching ? '匹配中...' : '开始 JD 匹配'}</button>
                  </div>
                  {jdResult ? (
                    <div className="match-grid">
                      <MetricTile label="总体得分" value={jdResult.overallScore.toString()} footnote="整体判断" />
                      <MetricTile label="匹配度" value={jdResult.matchScore.toString()} footnote="岗位贴合" />
                      <div className="match-column"><h4>缺失技能</h4>{jdResult.missingSkills.length === 0 ? <p className="muted-text">暂无明显缺项</p> : null}{jdResult.missingSkills.map((item, index) => <div key={`${item.skillName}-${index}`} className="skill-chip"><strong>{item.skillName}</strong><span>{item.skillLevel}</span></div>)}</div>
                      <div className="match-column"><h4>优化建议</h4>{jdResult.suggestions.length === 0 ? <p className="muted-text">暂无匹配建议</p> : null}{jdResult.suggestions.map((item, index) => <article key={`${item.issue}-${index}`} className="mini-suggestion"><strong>{item.issue}</strong><p>{item.recommendation}</p></article>)}</div>
                    </div>
                  ) : null}
                </Panel>

                <Panel title="原始简历文本" subtitle="用于核对解析结果是否完整"><pre className="document-preview">{resumeDetail.resumeText}</pre></Panel>
              </>
            ) : <Panel title="分析结果" subtitle="如果任务还没完成，这里会保持等待态"><EmptyState title={resumeSnapshot ? '分析结果尚未就绪' : '还没有简历数据'} text={resumeSnapshot ? '当前简历存在，但分析详情只会在任务 COMPLETED 后返回。' : '先上传或打开一份简历。'} /></Panel>}
          </section>
        ) : null}
        {activeView === 'knowledge' ? (
          <section className="view-grid">
            <Panel title="上传知识库" subtitle="文档上传后会触发解析与向量化">
              <div className="form-stack">
                <label className="field-block"><span>文档文件</span><input key={knowledgeInputKey} type="file" onChange={(event) => setKnowledgeFile(event.target.files?.[0] ?? null)} /></label>
                <label className="field-block"><span>分类</span><input value={knowledgeCategory} onChange={(event) => setKnowledgeCategory(event.target.value)} placeholder="例如：面试题 / 岗位资料 / 八股" list="category-suggestions" /><datalist id="category-suggestions">{categoryOptions.map((item) => <option key={item} value={item} />)}</datalist></label>
                <button type="button" className="primary-button" onClick={() => void handleKnowledgeUpload()} disabled={knowledgeUploading}>{knowledgeUploading ? '上传中...' : '上传并向量化'}</button>
              </div>
            </Panel>

            <Panel title="文档库" subtitle="后端列表接口返回的是元数据，不包含正文内容" actions={<button type="button" className="ghost-button" onClick={() => void refreshKnowledgeList()} disabled={knowledgeLoading}>{knowledgeLoading ? '刷新中...' : '刷新列表'}</button>}>
              <label className="field-block"><span>搜索</span><input value={knowledgeSearch} onChange={(event) => setKnowledgeSearch(event.target.value)} placeholder="按文件名、分类或类型过滤" /></label>
              <div className="knowledge-grid">
                {filteredKnowledge.length === 0 ? <EmptyState title="没有匹配的知识库" text="你可以先上传文档，或者换一个筛选关键字。" /> : filteredKnowledge.map((item) => {
                  const selectedForComposer = composerKnowledgeIds.includes(item.id);
                  const selectedForDetail = selectedKnowledgeId === item.id;
                  return (
                    <article key={item.id} className={`knowledge-card ${selectedForDetail ? 'is-selected' : ''}`}>
                      <div className="knowledge-head">
                        <button type="button" className="knowledge-title" onClick={() => void loadKnowledgeDetail(item.id)}>{item.fileName}</button>
                        <label className="checkbox-inline"><input type="checkbox" checked={selectedForComposer} onChange={() => setComposerKnowledgeIds((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [item.id, ...current].slice(0, 10))} /><span>加入草稿</span></label>
                      </div>
                      <div className="meta-cloud"><span>{item.category}</span><span>{item.fileType}</span><span>{formatBytes(item.fileSize)}</span></div>
                      <div className="detail-row"><span>上传时间</span><strong>{formatDateTime(item.uploadTime)}</strong></div>
                      <button type="button" className="danger-link" onClick={() => void handleKnowledgeDelete(item.id, item.fileName)} disabled={knowledgeDeletingId === item.id}>{knowledgeDeletingId === item.id ? '删除中...' : '删除文档'}</button>
                    </article>
                  );
                })}
              </div>
            </Panel>

            <Panel title="当前选中知识" subtitle="你可以把它们直接带进 RAG 会话创建器">
              {selectedKnowledge ? (
                <div className="detail-stack">
                  <div className="detail-row"><span>文件名</span><strong>{selectedKnowledge.fileName}</strong></div>
                  <div className="detail-row"><span>分类</span><strong>{selectedKnowledge.category}</strong></div>
                  <div className="detail-row"><span>类型</span><strong>{selectedKnowledge.fileType}</strong></div>
                  <div className="detail-row"><span>大小</span><strong>{formatBytes(selectedKnowledge.fileSize)}</strong></div>
                  <div className="detail-row"><span>上传时间</span><strong>{formatDateTime(selectedKnowledge.uploadTime)}</strong></div>
                </div>
              ) : <EmptyState title="未选中文档" text="点击左侧文档名称查看元数据。正文内容目前后端没有返回接口。" />}

              <div className="selection-strip"><div><span className="eyebrow">会话草稿</span><strong>{selectedComposerKnowledge.length} 份知识源</strong></div><button type="button" className="secondary-button" onClick={() => setActiveView('rag')}>去创建 RAG 会话</button></div>
              <div className="pill-list">{selectedComposerKnowledge.map((item) => <span key={item.id} className="highlight-pill">{item.fileName}</span>)}</div>
            </Panel>
          </section>
        ) : null}

        {activeView === 'rag' ? (
          <section className="view-grid">
            <Panel title="新建会话" subtitle="会话会绑定选中的知识库">
              <label className="field-block"><span>会话标题</span><input value={newSessionTitle} onChange={(event) => setNewSessionTitle(event.target.value)} placeholder="可留空，后端会自动生成标题" /></label>
              <div className="select-list">{knowledgeList.length === 0 ? <EmptyState title="还没有知识库" text="先去知识库页面上传文档，再回来创建会话。" /> : knowledgeList.map((item) => <label key={item.id} className="select-row"><input type="checkbox" checked={composerKnowledgeIds.includes(item.id)} onChange={() => setComposerKnowledgeIds((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [item.id, ...current].slice(0, 10))} /><div><strong>{item.fileName}</strong><span>{item.category}</span></div></label>)}</div>
              <button type="button" className="primary-button" onClick={() => void handleCreateSession()}>创建会话</button>
            </Panel>

            <Panel title="会话列表" subtitle="支持 ACTIVE / ARCHIVED 两个状态" actions={<button type="button" className="ghost-button" onClick={() => void refreshSessions()} disabled={sessionsLoading}>{sessionsLoading ? '刷新中...' : '刷新会话'}</button>}>
              <div className="tab-row"><button type="button" className={`tab-button ${sessionTab === 'ACTIVE' ? 'is-active' : ''}`} onClick={() => setSessionTab('ACTIVE')}>活跃会话</button><button type="button" className={`tab-button ${sessionTab === 'ARCHIVED' ? 'is-active' : ''}`} onClick={() => setSessionTab('ARCHIVED')}>已归档</button></div>
              <label className="field-block"><span>搜索会话</span><input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="按标题或会话 ID 搜索" /></label>
              <div className="list-stack">{visibleSessions.length === 0 ? <EmptyState title="没有会话" text="新建一条会话后会在这里出现。" /> : visibleSessions.map((item) => <button key={item.id} type="button" className={`list-card ${selectedSessionId === item.id ? 'is-active' : ''}`} onClick={() => void loadSessionDetail(item.id)}><div><strong>{item.title}</strong><span>#{item.id} · {item.knowledgeBaseIds.length} 个知识源</span></div><StatusChip label={item.status} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} /></button>)}</div>
            </Panel>

            <Panel title="会话工作台" subtitle="标题、知识源和对话都在这里管理">
              {selectedSessionDetail ? (
                <div className="rag-layout">
                  <div className="rag-settings">
                    <div className="form-inline stretch-end"><label className="field-block grow"><span>标题</span><input value={sessionTitleDraft} onChange={(event) => setSessionTitleDraft(event.target.value)} disabled={selectedSessionDetail.status !== 'ACTIVE'} /></label><button type="button" className="secondary-button" onClick={() => void handleSessionTitleUpdate()} disabled={selectedSessionDetail.status !== 'ACTIVE'}>保存标题</button></div>
                    <div className="button-row"><button type="button" className="secondary-button" onClick={() => void handleSessionStatusToggle()}>{selectedSessionDetail.status === 'ACTIVE' ? '归档会话' : '恢复会话'}</button><button type="button" className="danger-button" onClick={() => void handleSessionDelete()}>删除会话</button></div>
                    <div className="detail-row"><span>创建时间</span><strong>{formatDateTime(selectedSessionDetail.createdAt)}</strong></div>
                    <div className="detail-row"><span>更新时间</span><strong>{formatDateTime(selectedSessionDetail.updatedAt)}</strong></div>
                    <div className="select-list compact-select-list">{knowledgeList.map((item) => <label key={item.id} className="select-row"><input type="checkbox" checked={sessionKnowledgeDraft.includes(item.id)} disabled={selectedSessionDetail.status !== 'ACTIVE'} onChange={() => setSessionKnowledgeDraft((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id])} /><div><strong>{item.fileName}</strong><span>{item.category}</span></div></label>)}</div>
                    <button type="button" className="secondary-button" onClick={() => void handleSessionKnowledgeUpdate()} disabled={selectedSessionDetail.status !== 'ACTIVE'}>更新知识源</button>
                  </div>

                  <div className="chat-panel">
                    <div className="chat-stream">{sessionDetailLoading ? <p className="muted-text">正在加载会话...</p> : null}{selectedSessionDetail.messages.map((message) => <article key={`${message.id}-${message.type}`} className={`message-bubble ${message.type === 'USER' ? 'is-user' : 'is-assistant'}`}><span>{message.type === 'USER' ? '你' : 'Assistant'}</span><p>{message.content || '...'}</p></article>)}<div ref={messageEndRef} /></div>
                    <label className="field-block"><span>提问</span><textarea value={sessionQuestion} onChange={(event) => setSessionQuestion(event.target.value)} rows={4} disabled={selectedSessionDetail.status !== 'ACTIVE' || chatStreaming} placeholder={selectedSessionDetail.status === 'ACTIVE' ? '例如：根据这些资料帮我生成一轮前端面试问答' : '归档会话不可继续提问'} /></label>
                    <button type="button" className="primary-button" onClick={() => void handleSendQuestion()} disabled={selectedSessionDetail.status !== 'ACTIVE' || chatStreaming}>{chatStreaming ? '流式生成中...' : '发送问题'}</button>
                  </div>
                </div>
              ) : <EmptyState title="未选择会话" text="从左侧挑一个会话，或先创建一个新的会话。" />}
            </Panel>
          </section>
        ) : null}

        {activeView === 'tasks' ? (
          <section className="view-grid">
            <Panel title="手动查询" subtitle="后端当前支持 resume / knowledge 两种资源类型">
              <div className="form-inline stretch-end"><label className="field-block"><span>资源类型</span><select value={taskLookupType} onChange={(event) => setTaskLookupType(event.target.value as ResourceType)}><option value="resume">resume</option><option value="knowledge">knowledge</option></select></label><label className="field-block grow"><span>资源 ID</span><input value={taskLookupId} onChange={(event) => setTaskLookupId(event.target.value)} placeholder="例如 3" /></label><button type="button" className="primary-button" onClick={() => void handleTaskLookup()} disabled={taskLookupLoading}>{taskLookupLoading ? '查询中...' : '查询任务'}</button></div>
              {taskLookupResult ? <div className="detail-stack"><div className="detail-row"><span>文件名</span><strong>{taskLookupResult.fileName}</strong></div><div className="detail-row"><span>资源类型</span><strong>{taskLookupResult.resourceType}</strong></div><div className="detail-row"><span>状态</span><StatusChip label={taskLookupResult.taskStatus} tone={statusTone(taskLookupResult.taskStatus)} /></div><div className="detail-row"><span>上传时间</span><strong>{formatDateTime(taskLookupResult.uploadTime)}</strong></div></div> : null}
            </Panel>

            <Panel title="最近任务" subtitle="上传后自动纳入最近历史">
              {recentTasks.length === 0 ? <EmptyState title="暂无任务历史" text="简历或知识库上传之后，这里会自动出现。" /> : <div className="list-stack">{recentTasks.map((item) => <div key={`${item.resourceType}-${item.resourceId}`} className="task-row"><div><strong>{item.fileName}</strong><span>{item.resourceType} / #{item.resourceId} / {formatDateTime(item.updatedAt)}</span></div><div className="button-row compact-row"><StatusChip label={item.taskStatus} tone={statusTone(item.taskStatus)} /><button type="button" className="ghost-button small-button" onClick={() => { setTaskLookupType(item.resourceType); setTaskLookupId(item.resourceId.toString()); void runTaskLookup(item.resourceType, item.resourceId); }}>刷新</button><button type="button" className="ghost-button small-button" onClick={() => { if (item.resourceType === 'resume') { setActiveView('resume'); void loadResumeWorkspace(item.resourceId); } else { setActiveView('knowledge'); void loadKnowledgeDetail(item.resourceId); } }}>打开</button></div></div>)}</div>}
            </Panel>

            <Panel title="说明" subtitle="和后端接口契约保持一致">
              <ol className="steps-list"><li>任务中心只负责查询 resume 和 knowledge 两类资源状态。</li><li>简历列表接口目前不存在，所以前端对简历历史采用浏览器本地缓存。</li><li>知识库列表接口只返回元数据，不返回文档正文，因此详情页也只展示元信息。</li><li>RAG 聊天接口是 POST SSE，因此前端没有使用 EventSource，而是用 fetch 直接消费流。</li></ol>
            </Panel>
          </section>
        ) : null}
      </main>
    </div>
  );
}


