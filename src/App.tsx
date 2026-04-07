import { useDeferredValue, useEffect, useState } from 'react';
import {
  createRagSession,
  deleteKnowledge,
  deleteRagSession,
  deleteResume,
  exportResumePdf,
  reAnalyzeResume,
  reVectorKnowledge,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { SessionChatModal } from './components/rag/session-chat-modal';

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

const noticeToneClasses: Record<NoticeTone, string> = {
  neutral: 'bg-indigo-soft border-indigo/15 text-indigo-text',
  success: 'bg-success-soft border-success/15 text-emerald-600',
  danger: 'bg-danger-soft border-danger/15 text-red-600',
};

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
  const [resumeReanalyzing, setResumeReanalyzing] = useState(false);

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
  const [knowledgeRevectoringId, setKnowledgeRevectoringId] = useState<number | null>(null);
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
  const [sessionChatOpen, setSessionChatOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [sessionTitleDraft, setSessionTitleDraft] = useState('');
  const [sessionKnowledgeDraft, setSessionKnowledgeDraft] = useState<number[]>([]);
  const [sessionQuestion, setSessionQuestion] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);

  const [taskLookupType, setTaskLookupType] = useState<ResourceType>('resume');
  const [taskLookupId, setTaskLookupId] = useState('');
  const [taskLookupLoading, setTaskLookupLoading] = useState(false);
  const [taskLookupResult, setTaskLookupResult] = useState<TaskStatusResponse | null>(null);

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

  async function openSessionChat(sessionId: number): Promise<void> {
    setSelectedSessionDetail(null);
    setSessionQuestion('');
    setSessionChatOpen(true);
    await loadSessionDetail(sessionId);
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

  async function handleResumeReanalyze(): Promise<void> {
    if (!selectedResumeId || !resumeSnapshot) {
      return;
    }

    setResumeReanalyzing(true);
    setResumeDetail(null);
    try {
      await reAnalyzeResume(selectedResumeId);
      const finalStatus = await pollTaskUntilSettled('resume', selectedResumeId, resumeSnapshot.fileName);
      if (finalStatus.taskStatus === 'COMPLETED') {
        await loadResumeWorkspace(selectedResumeId);
        pushNotice('简历重新分析已完成', 'success');
      } else {
        pushNotice('简历重新分析失败，请检查后端日志', 'danger');
      }
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setResumeReanalyzing(false);
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

  async function handleKnowledgeReVector(knowledgeId: number, fileName: string): Promise<void> {
    setKnowledgeRevectoringId(knowledgeId);
    try {
      await reVectorKnowledge(knowledgeId);
      const finalStatus = await pollTaskUntilSettled('knowledge', knowledgeId, fileName);
      await refreshKnowledgeList();
      pushNotice(finalStatus.taskStatus === 'COMPLETED' ? '知识库重新向量化完成' : '重新向量化失败，请检查后端日志', finalStatus.taskStatus === 'COMPLETED' ? 'success' : 'danger');
    } catch (error) {
      pushNotice((error as Error).message, 'danger');
    } finally {
      setKnowledgeRevectoringId(null);
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
      setSessionChatOpen(true);
      await loadSessionDetail(session.id);
      await refreshSessions();
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
      setSessionChatOpen(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)] min-h-screen">
      {/* ─── Sidebar ─── */}
      <aside className="bg-sidebar-dark sticky top-0 h-screen overflow-y-auto sidebar-scroll flex flex-col gap-1 px-3.5 py-5 border-r border-white/[0.04] max-lg:static max-lg:h-auto max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:px-4 max-lg:py-3 max-lg:gap-2">
        <div className="px-3 pt-3.5 pb-4 mb-2 border-b border-sidebar-border-light max-lg:border-b-0 max-lg:pb-0 max-lg:mb-0">
          <h1 className="text-[17px] font-bold text-sidebar-text-light tracking-tight">AI Interview</h1>
          <p className="text-xs text-sidebar-muted-light mb-3 max-lg:hidden">简历分析 · 知识库 · RAG 会话</p>
          <div className="grid grid-cols-2 gap-2 max-lg:hidden">
            <MetricTile label="知识库" value={knowledgeList.length.toString()} footnote="文档" compact />
            <MetricTile label="会话" value={(activeSessions.length + archivedSessions.length).toString()} footnote="RAG" compact />
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 mb-1 max-lg:flex-row max-lg:flex-wrap max-lg:gap-1">
          {([['overview', '总览'], ['resume', '简历分析'], ['knowledge', '知识库'], ['rag', 'RAG 会话'], ['tasks', '任务中心']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`flex justify-between items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors border-none cursor-pointer ${activeView === value ? 'bg-indigo-medium text-indigo-200' : 'bg-transparent text-sidebar-muted-light hover:bg-sidebar-surface hover:text-sidebar-text-light'}`}
              onClick={() => setActiveView(value)}
            >
              <span>{label}</span>
              {value === 'tasks' && inFlightTaskCount > 0 ? <span className="min-w-5 px-2 py-0.5 rounded-full bg-indigo text-white text-[11px] font-semibold text-center">{inFlightTaskCount}</span> : null}
            </button>
          ))}
        </nav>

      </aside>

      {/* ─── Main ─── */}
      <main className="px-6 py-6 lg:px-8 lg:py-7 flex flex-col gap-4 max-w-[1280px]">
        {/* Hero */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-card border border-border rounded-xl shadow-sm max-lg:flex-col max-lg:items-start">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">
              {activeView === 'overview' && '总览'}
              {activeView === 'resume' && '简历分析'}
              {activeView === 'knowledge' && '知识库'}
              {activeView === 'rag' && 'RAG 会话'}
              {activeView === 'tasks' && '任务中心'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeView === 'overview' && '后端能力映射与快速操作入口'}
              {activeView === 'resume' && '上传、分析、导出与 JD 匹配'}
              {activeView === 'knowledge' && '管理知识文档并准备会话素材'}
              {activeView === 'rag' && '创建会话、调整知识源并流式问答'}
              {activeView === 'tasks' && '查询异步任务处理状态'}
            </p>
          </div>
          <div className="flex flex-row gap-2 flex-1 max-lg:w-full">
            <MetricTile label="简历" value={recentResumes.length.toString()} footnote="本地记录" compact />
            <MetricTile label="进行中" value={inFlightTaskCount.toString()} footnote="任务" compact />
            <MetricTile label="知识源" value={composerKnowledgeIds.length.toString()} footnote="已选" compact />
          </div>
        </div>

        {/* Notice */}
        {notice ? <div className={`px-4 py-3 rounded-lg border text-[13px] font-medium ${noticeToneClasses[notice.tone]}`}>{notice.message}</div> : null}

        {/* ═══ Overview ═══ */}
        {activeView === 'overview' ? (
          <div className="grid gap-4">
            <Panel title="后端能力映射" subtitle="来自当前控制器与实体定义">
              <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                <FeatureCard title="简历分析链路" text="上传简历、查询状态、读取分析详情、删除、导出 PDF、再做 JD 匹配。" />
                <FeatureCard title="知识库管理" text="上传知识文档并分类，查看列表、按分类筛选、删除、选作 RAG 会话资料。" />
                <FeatureCard title="RAG Studio" text="创建/归档/删除会话、更新知识源和标题、按流式 SSE 消费回答。" />
                <FeatureCard title="任务中心" text="围绕 resume / knowledge 的 resourceId 查询异步状态，并保留最近任务历史。" />
              </div>
            </Panel>

            <Panel title="建议操作顺序" subtitle="按当前后端结构最顺的使用路径">
              <ol className="m-0 pl-5 flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed">
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
                    <button key={item.id} type="button" className="flex items-center justify-between gap-3 px-3.5 py-3 border border-border bg-card rounded-lg w-full text-left transition-colors hover:border-primary hover:bg-indigo-soft cursor-pointer" onClick={() => { setActiveView('resume'); void loadResumeWorkspace(item.id); }}>
                      <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">ID #{item.id}</span></div>
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
                <div className="flex flex-col gap-2">
                  {recentTasks.slice(0, 6).map((item) => (
                    <div key={`${item.resourceType}-${item.resourceId}`} className="flex items-center justify-between gap-3 px-3.5 py-3 border border-border bg-card rounded-lg">
                      <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{item.resourceType} / #{item.resourceId}</span></div>
                      <StatusChip label={item.taskStatus} tone={statusTone(item.taskStatus)} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        ) : null}

        {/* ═══ Resume ═══ */}
        {activeView === 'resume' ? (
          <div className="grid gap-4">
            <Panel title="上传与查找" subtitle="上传会自动轮询任务；也可以直接输入已有简历 ID 打开" actions={<Button variant="outline" onClick={() => selectedResumeId && void loadResumeWorkspace(selectedResumeId)} disabled={!selectedResumeId || resumeLoading}>刷新当前简历</Button>}>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">上传简历</span><input key={resumeInputKey} type="file" accept=".pdf,.doc,.docx,.md" className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} /></div>
                <Button onClick={() => void handleResumeUpload()} disabled={resumeUploading}>{resumeUploading ? '正在上传与轮询...' : '上传并开始分析'}</Button>
              </div>

              <div className="flex items-end gap-3 mt-3">
                <div className="flex flex-col gap-1.5 flex-1"><span className="text-[13px] font-medium text-muted-foreground">简历 ID</span><Input value={manualResumeId} onChange={(event) => setManualResumeId(event.target.value)} placeholder="例如 12" /></div>
                <Button variant="secondary" onClick={() => void handleResumeLookup()} disabled={resumeLoading}>{resumeLoading ? '加载中...' : '打开简历'}</Button>
              </div>

              <div className="flex flex-col gap-2 mt-3">
                {recentResumes.length === 0 ? <EmptyState title="暂无最近简历" text="后端当前没有简历列表接口，这里只展示最近使用过的资源。" /> : recentResumes.map((item) => (
                  <button key={item.id} type="button" className="flex items-center justify-between gap-3 px-3.5 py-3 border border-border bg-card rounded-lg w-full text-left transition-colors hover:border-primary hover:bg-indigo-soft cursor-pointer" onClick={() => void loadResumeWorkspace(item.id)}>
                    <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{formatDateTime(item.updatedAt)}</span></div>
                    <StatusChip label={item.lastStatus} tone={statusTone(item.lastStatus)} />
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="当前状态" subtitle="任务状态、文件信息和操作入口">
              {resumeSnapshot ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">文件名</span><strong className="text-sm">{resumeSnapshot.fileName}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">大小</span><strong className="text-sm">{formatBytes(resumeSnapshot.fileSize)}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(resumeSnapshot.uploadTime)}</strong></div>
                  {resumeTask ? <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">任务状态</span><StatusChip label={resumeTask.taskStatus} tone={statusTone(resumeTask.taskStatus)} /></div> : null}
                  <div className="flex items-center gap-3 pt-1">
                    <Button variant="secondary" onClick={() => void handleResumeReanalyze()} disabled={!resumeSnapshot || resumeReanalyzing}>{resumeReanalyzing ? '分析中...' : '重新分析'}</Button>
                    <Button variant="secondary" onClick={() => void handleResumeExport()} disabled={!resumeDetail || resumeExporting}>{resumeExporting ? '导出中...' : '导出 PDF'}</Button>
                    <Button variant="destructive" onClick={() => void handleResumeDelete()} disabled={!resumeSnapshot || resumeDeleting}>{resumeDeleting ? '删除中...' : '删除简历'}</Button>
                  </div>
                </div>
              ) : <EmptyState title="尚未选择简历" text="上传一份新简历，或者从左侧最近记录里打开已有资源。" />}
            </Panel>

            {resumeDetail ? (
              <>
                <Panel title="简历评分" subtitle="AI 分析评分详情">
                  <div className="flex items-center gap-6">
                    <div className="score-dial"><span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">总分</span><strong className="text-[32px] font-extrabold text-indigo tracking-tight">{resumeDetail.analysis.overallScore}</strong></div>
                    <div className="flex flex-wrap gap-2.5 flex-1">
                      <MetricTile label="内容完整度" value={resumeDetail.analysis.contentScore.toString()} footnote="/25" />
                      <MetricTile label="结构清晰度" value={resumeDetail.analysis.structureScore.toString()} footnote="/20" />
                      <MetricTile label="技能匹配度" value={resumeDetail.analysis.skillMatchScore.toString()} footnote="/25" />
                      <MetricTile label="专业表达" value={resumeDetail.analysis.expressionScore.toString()} footnote="/15" />
                      <MetricTile label="项目经验" value={resumeDetail.analysis.projectScore.toString()} footnote="/15" />
                    </div>
                  </div>
                </Panel>

                <Panel title="摘要与亮点" subtitle="简历结论概览">
                  <div className="border border-border bg-muted/50 rounded-lg p-4 text-sm leading-7 text-muted-foreground mb-3">{resumeDetail.analysis.summary}</div>
                  <div className="flex flex-wrap gap-1.5">{resumeDetail.analysis.strengths.map((item, index) => <span key={`${item}-${index}`} className="inline-flex items-center px-3 py-1 rounded-md text-[13px] font-medium bg-indigo-soft text-indigo-text">{item}</span>)}</div>
                </Panel>

                <Panel title="改进建议" subtitle="按问题与建议拆分展示">
                  {resumeDetail.analysis.suggestions.length === 0 ? <EmptyState title="暂无建议项" text="如果后端分析结果为空，这里会保持空态。" /> : (
                    <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                      {resumeDetail.analysis.suggestions.map((item, index) => (
                        <article key={`${item.issue}-${index}`} className="flex flex-col border border-border bg-card rounded-lg p-4 gap-2.5">
                          <header className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground font-medium">{item.category}</span><StatusChip label={item.priority} tone={item.priority === '高' ? 'danger' : item.priority === '中' ? 'warn' : 'neutral'} /></header>
                          <strong className="text-sm">{item.issue}</strong>
                          <p className="text-[13px]">{item.recommendation}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="JD 匹配" subtitle="职位描述匹配分析">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">职位 JD</span><Textarea value={jdContent} onChange={(event) => setJdContent(event.target.value)} rows={7} placeholder="粘贴岗位描述、任职要求或职位链接解析后的文本" /></div>
                    <Button onClick={() => void handleJdMatch()} disabled={jdMatching}>{jdMatching ? '匹配中...' : '开始 JD 匹配'}</Button>
                  </div>
                  {jdResult ? (
                    <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] mt-4">
                      <MetricTile label="总体得分" value={jdResult.overallScore.toString()} footnote="整体判断" />
                      <MetricTile label="匹配度" value={jdResult.matchScore.toString()} footnote="岗位贴合" />
                      <div className="flex flex-col border border-border bg-card rounded-lg p-4 gap-2"><h4 className="text-sm font-semibold">缺失技能</h4>{jdResult.missingSkills.length === 0 ? <p className="text-[13px] text-muted-foreground">暂无明显缺项</p> : null}{jdResult.missingSkills.map((item, index) => <div key={`${item.skillName}-${index}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50 border border-border text-[13px]"><strong className="text-[13px]">{item.skillName}</strong><span className="text-xs text-muted-foreground">{item.skillLevel}</span></div>)}</div>
                      <div className="flex flex-col border border-border bg-card rounded-lg p-4 gap-2"><h4 className="text-sm font-semibold">优化建议</h4>{jdResult.suggestions.length === 0 ? <p className="text-[13px] text-muted-foreground">暂无匹配建议</p> : null}{jdResult.suggestions.map((item, index) => <article key={`${item.issue}-${index}`} className="rounded-md px-3 py-2.5 bg-muted/50 border border-border"><strong className="text-sm">{item.issue}</strong><p className="text-[13px]">{item.recommendation}</p></article>)}</div>
                    </div>
                  ) : null}
                </Panel>

                <Panel title="原始简历文本" subtitle="用于核对解析结果是否完整"><pre className="border border-border bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-auto text-[13px] leading-7 text-muted-foreground thin-scrollbar">{resumeDetail.resumeText}</pre></Panel>
              </>
            ) : <Panel title="分析结果" subtitle="任务完成后将展示分析详情"><EmptyState title={resumeSnapshot ? '分析结果尚未就绪' : '还没有简历数据'} text={resumeSnapshot ? '当前简历存在，但分析详情只会在任务 COMPLETED 后返回。' : '先上传或打开一份简历。'} /></Panel>}
          </div>
        ) : null}

        {/* ═══ Knowledge ═══ */}
        {activeView === 'knowledge' ? (
          <div className="grid gap-4">
            <Panel title="上传知识库" subtitle="文档上传后会触发解析与向量化">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">文档文件</span><input key={knowledgeInputKey} type="file" className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80 file:cursor-pointer" onChange={(event) => setKnowledgeFile(event.target.files?.[0] ?? null)} /></div>
                <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">分类</span><Input value={knowledgeCategory} onChange={(event) => setKnowledgeCategory(event.target.value)} placeholder="例如：面试题 / 岗位资料 / 八股" list="category-suggestions" /><datalist id="category-suggestions">{categoryOptions.map((item) => <option key={item} value={item} />)}</datalist></div>
                <Button onClick={() => void handleKnowledgeUpload()} disabled={knowledgeUploading}>{knowledgeUploading ? '上传中...' : '上传并向量化'}</Button>
              </div>
            </Panel>

            <Panel title="文档库" subtitle="知识库文档列表" actions={<Button variant="outline" onClick={() => void refreshKnowledgeList()} disabled={knowledgeLoading}>{knowledgeLoading ? '刷新中...' : '刷新列表'}</Button>}>
              <div className="flex flex-col gap-1.5 mb-3"><span className="text-[13px] font-medium text-muted-foreground">搜索</span><Input value={knowledgeSearch} onChange={(event) => setKnowledgeSearch(event.target.value)} placeholder="按文件名、分类或类型过滤" /></div>
              <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                {filteredKnowledge.length === 0 ? <EmptyState title="没有匹配的知识库" text="你可以先上传文档，或者换一个筛选关键字。" /> : filteredKnowledge.map((item) => {
                  const selectedForComposer = composerKnowledgeIds.includes(item.id);
                  const selectedForDetail = selectedKnowledgeId === item.id;
                  return (
                    <article key={item.id} className={`flex flex-col border bg-card rounded-lg p-4 gap-2.5 transition-colors hover:border-primary/30 ${selectedForDetail ? 'border-primary' : 'border-border'}`}>
                      <div className="flex justify-between items-center gap-2">
                        <button type="button" className="p-0 bg-transparent border-none text-left text-foreground font-semibold text-sm cursor-pointer" onClick={() => void loadKnowledgeDetail(item.id)}>{item.fileName}</button>
                        <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border cursor-pointer">
                          <Checkbox checked={selectedForComposer} onCheckedChange={() => setComposerKnowledgeIds((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [item.id, ...current].slice(0, 10))} />
                          <span className="text-xs text-muted-foreground">加入草稿</span>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">{item.category}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">{item.fileType}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">{formatBytes(item.fileSize)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3 pb-2 border-b border-border/50"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(item.uploadTime)}</strong></div>
                      <div className="flex items-center gap-3">
                        <button type="button" className="p-0 bg-transparent border-none text-left text-indigo-text text-[13px] cursor-pointer" onClick={() => void handleKnowledgeReVector(item.id, item.fileName)} disabled={knowledgeRevectoringId === item.id}>{knowledgeRevectoringId === item.id ? '向量化中...' : '重新向量化'}</button>
                        <button type="button" className="p-0 bg-transparent border-none text-left text-destructive text-[13px] cursor-pointer" onClick={() => void handleKnowledgeDelete(item.id, item.fileName)} disabled={knowledgeDeletingId === item.id}>{knowledgeDeletingId === item.id ? '删除中...' : '删除文档'}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>

            <Panel title="当前选中知识" subtitle="你可以把它们直接带进 RAG 会话创建器">
              {selectedKnowledge ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">文件名</span><strong className="text-sm">{selectedKnowledge.fileName}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">分类</span><strong className="text-sm">{selectedKnowledge.category}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">类型</span><strong className="text-sm">{selectedKnowledge.fileType}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">大小</span><strong className="text-sm">{formatBytes(selectedKnowledge.fileSize)}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(selectedKnowledge.uploadTime)}</strong></div>
                </div>
              ) : <EmptyState title="未选中文档" text="点击左侧文档名称查看元数据。" />}

              <div className="flex justify-between items-center gap-3 mt-3 px-4 py-3 rounded-lg bg-indigo-soft border border-indigo/10">
                <div><span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-text">会话草稿</span><strong className="block text-sm">{selectedComposerKnowledge.length} 份知识源</strong></div>
                <Button variant="secondary" onClick={() => setActiveView('rag')}>去创建 RAG 会话</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">{selectedComposerKnowledge.map((item) => <span key={item.id} className="inline-flex items-center px-3 py-1 rounded-md text-[13px] font-medium bg-indigo-soft text-indigo-text">{item.fileName}</span>)}</div>
            </Panel>
          </div>
        ) : null}

        {/* ═══ RAG ═══ */}
        {activeView === 'rag' ? (
          <div className="grid gap-4">
            <Panel title="新建会话" subtitle="会话会绑定选中的知识库">
              <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">会话标题</span><Input value={newSessionTitle} onChange={(event) => setNewSessionTitle(event.target.value)} placeholder="可留空，后端会自动生成标题" /></div>
              <div className="flex flex-col gap-2 mt-3">{knowledgeList.length === 0 ? <EmptyState title="还没有知识库" text="先去知识库页面上传文档，再回来创建会话。" /> : knowledgeList.map((item) => (
                <label key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border cursor-pointer">
                  <Checkbox checked={composerKnowledgeIds.includes(item.id)} onCheckedChange={() => setComposerKnowledgeIds((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [item.id, ...current].slice(0, 10))} />
                  <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{item.category}</span></div>
                </label>
              ))}</div>
              <Button className="mt-3" onClick={() => void handleCreateSession()}>创建会话</Button>
            </Panel>

            <Panel title="会话列表" subtitle="支持 ACTIVE / ARCHIVED 两个状态" actions={<Button variant="outline" onClick={() => void refreshSessions()} disabled={sessionsLoading}>{sessionsLoading ? '刷新中...' : '刷新会话'}</Button>}>
              <Tabs value={sessionTab} onValueChange={(v) => setSessionTab(v as SessionStatus)} className="mb-3">
                <TabsList className="w-full">
                  <TabsTrigger value="ACTIVE" className="flex-1">活跃会话</TabsTrigger>
                  <TabsTrigger value="ARCHIVED" className="flex-1">已归档</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex flex-col gap-1.5 mb-3"><span className="text-[13px] font-medium text-muted-foreground">搜索会话</span><Input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="按标题或会话 ID 搜索" /></div>
              <div className="flex flex-col gap-2">{visibleSessions.length === 0 ? <EmptyState title="没有会话" text="新建一条会话后会在这里出现。" /> : visibleSessions.map((item) => (
                <button key={item.id} type="button" className={`flex items-center justify-between gap-3 px-3.5 py-3 border bg-card rounded-lg w-full text-left transition-colors hover:border-primary hover:bg-indigo-soft cursor-pointer ${selectedSessionId === item.id ? 'border-primary bg-indigo-soft' : 'border-border'}`} onClick={() => void openSessionChat(item.id)}>
                  <div className="flex flex-col"><strong className="text-sm">{item.title}</strong><span className="text-xs text-muted-foreground">#{item.id} · {item.knowledgeBaseIds.length} 个知识源</span></div>
                  <StatusChip label={item.status} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} />
                </button>
              ))}</div>
            </Panel>

            <Panel title="会话工作台" subtitle="标题和知识源都在这里管理，聊天已移到独立弹窗">
              {selectedSessionDetail ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-end gap-3 max-lg:flex-col max-lg:items-stretch">
                    <div className="flex flex-col gap-1.5 flex-1"><span className="text-[13px] font-medium text-muted-foreground">标题</span><Input value={sessionTitleDraft} onChange={(event) => setSessionTitleDraft(event.target.value)} disabled={selectedSessionDetail.status !== 'ACTIVE'} /></div>
                    <Button variant="secondary" onClick={() => void handleSessionTitleUpdate()} disabled={selectedSessionDetail.status !== 'ACTIVE'}>保存标题</Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => void handleSessionStatusToggle()}>{selectedSessionDetail.status === 'ACTIVE' ? '归档会话' : '恢复会话'}</Button>
                    <Button variant="destructive" onClick={() => void handleSessionDelete()}>删除会话</Button>
                  </div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">创建时间</span><strong className="text-sm">{formatDateTime(selectedSessionDetail.createdAt)}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">更新时间</span><strong className="text-sm">{formatDateTime(selectedSessionDetail.updatedAt)}</strong></div>
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-auto thin-scrollbar">{knowledgeList.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border cursor-pointer">
                      <Checkbox checked={sessionKnowledgeDraft.includes(item.id)} disabled={selectedSessionDetail.status !== 'ACTIVE'} onCheckedChange={() => setSessionKnowledgeDraft((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id])} />
                      <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{item.category}</span></div>
                    </label>
                  ))}</div>
                  <Button variant="secondary" onClick={() => void handleSessionKnowledgeUpdate()} disabled={selectedSessionDetail.status !== 'ACTIVE'}>更新知识源</Button>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-3 max-lg:flex-col max-lg:items-start">
                    <div className="text-sm text-muted-foreground">聊天已移到独立弹窗。点击任一会话行即可打开，或直接继续当前会话。</div>
                    <Button variant="outline" onClick={() => setSessionChatOpen(true)}>打开聊天</Button>
                  </div>
                </div>
              ) : <EmptyState title="未选择会话" text="从左侧挑一个会话，或先创建一个新的会话。" />}
            </Panel>
          </div>
        ) : null}

        {/* ═══ Tasks ═══ */}
        {activeView === 'tasks' ? (
          <div className="grid gap-4">
            <Panel title="手动查询" subtitle="支持 resume / knowledge 两种资源类型">
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5"><span className="text-[13px] font-medium text-muted-foreground">资源类型</span><select className="h-8 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-ring/50" value={taskLookupType} onChange={(event) => setTaskLookupType(event.target.value as ResourceType)}><option value="resume">resume</option><option value="knowledge">knowledge</option></select></div>
                <div className="flex flex-col gap-1.5 flex-1"><span className="text-[13px] font-medium text-muted-foreground">资源 ID</span><Input value={taskLookupId} onChange={(event) => setTaskLookupId(event.target.value)} placeholder="例如 3" /></div>
                <Button onClick={() => void handleTaskLookup()} disabled={taskLookupLoading}>{taskLookupLoading ? '查询中...' : '查询任务'}</Button>
              </div>
              {taskLookupResult ? (
                <div className="flex flex-col gap-2 mt-3">
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">文件名</span><strong className="text-sm">{taskLookupResult.fileName}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">资源类型</span><strong className="text-sm">{taskLookupResult.resourceType}</strong></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">状态</span><StatusChip label={taskLookupResult.taskStatus} tone={statusTone(taskLookupResult.taskStatus)} /></div>
                  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50"><span className="text-xs text-muted-foreground">上传时间</span><strong className="text-sm">{formatDateTime(taskLookupResult.uploadTime)}</strong></div>
                </div>
              ) : null}
            </Panel>

            <Panel title="最近任务" subtitle="上传后自动纳入最近历史">
              {recentTasks.length === 0 ? <EmptyState title="暂无任务历史" text="简历或知识库上传之后，这里会自动出现。" /> : (
                <div className="flex flex-col gap-2">{recentTasks.map((item) => (
                  <div key={`${item.resourceType}-${item.resourceId}`} className="flex items-center justify-between gap-3 px-3.5 py-3 border border-border bg-card rounded-lg">
                    <div className="flex flex-col"><strong className="text-sm">{item.fileName}</strong><span className="text-xs text-muted-foreground">{item.resourceType} / #{item.resourceId} / {formatDateTime(item.updatedAt)}</span></div>
                    <div className="flex items-center gap-2">
                      <StatusChip label={item.taskStatus} tone={statusTone(item.taskStatus)} />
                      <Button variant="outline" size="sm" onClick={() => { setTaskLookupType(item.resourceType); setTaskLookupId(item.resourceId.toString()); void runTaskLookup(item.resourceType, item.resourceId); }}>刷新</Button>
                      <Button variant="outline" size="sm" onClick={() => { if (item.resourceType === 'resume') { setActiveView('resume'); void loadResumeWorkspace(item.resourceId); } else { setActiveView('knowledge'); void loadKnowledgeDetail(item.resourceId); } }}>打开</Button>
                    </div>
                  </div>
                ))}</div>
              )}
            </Panel>

            <Panel title="说明" subtitle="和后端接口契约保持一致">
              <ol className="m-0 pl-5 flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed">
                <li>任务中心只负责查询 resume 和 knowledge 两类资源状态。</li>
                <li>简历列表接口目前不存在，所以前端对简历历史采用浏览器本地缓存。</li>
                <li>知识库列表接口只返回元数据，不返回文档正文，因此详情页也只展示元信息。</li>
                <li>RAG 聊天接口是 POST SSE，因此前端没有使用 EventSource，而是用 fetch 直接消费流。</li>
              </ol>
            </Panel>
          </div>
        ) : null}
      </main>
      <SessionChatModal
        open={sessionChatOpen}
        loading={sessionDetailLoading}
        sessionDetail={selectedSessionDetail}
        question={sessionQuestion}
        streaming={chatStreaming}
        onOpenChange={setSessionChatOpen}
        onQuestionChange={setSessionQuestion}
        onSend={() => void handleSendQuestion()}
      />
    </div>
  );
}
