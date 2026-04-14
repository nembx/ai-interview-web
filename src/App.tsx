import { useDeferredValue, useEffect, useState } from 'react';

import { AppShell, type AppShellNotice, type AppShellNoticeTone, type AppShellView } from '@/app/app-shell';
import { SessionChatModal } from '@/components/rag/session-chat-modal';
import { KnowledgeWorkspace } from '@/features/knowledge/knowledge-workspace';
import { OverviewWorkspace } from '@/features/overview/overview-workspace';
import { RagWorkspace } from '@/features/rag/rag-workspace';
import { ResumeWorkspace } from '@/features/resume/resume-workspace';
import { TasksWorkspace } from '@/features/tasks/tasks-workspace';
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
  reAnalyzeResume,
  reVectorKnowledge,
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
  normalizeJdMatch,
  normalizeResumeDetail,
  upsertResumeRecord,
  upsertTaskRecord,
} from './utils';

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
  const [activeView, setActiveView] = useState<AppShellView>('overview');
  const [notice, setNotice] = useState<AppShellNotice | null>(null);

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

  function pushNotice(message: string, tone: AppShellNoticeTone = 'neutral'): void {
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

  function toggleComposerKnowledge(knowledgeId: number): void {
    setComposerKnowledgeIds((current) => (current.includes(knowledgeId) ? current.filter((value) => value !== knowledgeId) : [knowledgeId, ...current].slice(0, 10)));
  }

  function toggleSessionKnowledgeDraft(knowledgeId: number): void {
    setSessionKnowledgeDraft((current) => (current.includes(knowledgeId) ? current.filter((value) => value !== knowledgeId) : [...current, knowledgeId]));
  }

  function openResumeFromOverview(resumeId: number): void {
    setActiveView('resume');
    void loadResumeWorkspace(resumeId);
  }

  function openTaskResource(resourceType: ResourceType, resourceId: number): void {
    if (resourceType === 'resume') {
      setActiveView('resume');
      void loadResumeWorkspace(resourceId);
      return;
    }

    setActiveView('knowledge');
    void loadKnowledgeDetail(resourceId);
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
    <>
      <AppShell
        activeView={activeView}
        notice={notice}
        onViewChange={setActiveView}
        counts={{
          knowledgeCount: knowledgeList.length,
          sessionCount: activeSessions.length + archivedSessions.length,
          recentResumeCount: recentResumes.length,
          inFlightTaskCount,
          selectedKnowledgeCount: composerKnowledgeIds.length,
        }}
        views={{
          overview: (
            <OverviewWorkspace
              recentResumes={recentResumes}
              recentTasks={recentTasks}
              knowledgeList={knowledgeList}
              activeSessionCount={activeSessions.length}
              archivedSessionCount={archivedSessions.length}
              onOpenResume={openResumeFromOverview}
            />
          ),
          resume: (
            <ResumeWorkspace
              recentResumes={recentResumes}
              resumeInputKey={resumeInputKey}
              resumeFile={resumeFile}
              manualResumeId={manualResumeId}
              resumeLoading={resumeLoading}
              selectedResumeId={selectedResumeId}
              resumeSnapshot={resumeSnapshot}
              resumeDetail={resumeDetail}
              resumeTask={resumeTask}
              jdContent={jdContent}
              jdMatching={jdMatching}
              jdResult={jdResult}
              resumeUploading={resumeUploading}
              resumeDeleting={resumeDeleting}
              resumeExporting={resumeExporting}
              resumeReanalyzing={resumeReanalyzing}
              onResumeFileChange={setResumeFile}
              onManualResumeIdChange={setManualResumeId}
              onJdContentChange={setJdContent}
              onRefreshCurrentResume={() => selectedResumeId && void loadResumeWorkspace(selectedResumeId)}
              onResumeUpload={() => void handleResumeUpload()}
              onResumeLookup={() => void handleResumeLookup()}
              onResumeOpen={(resumeId) => void loadResumeWorkspace(resumeId)}
              onResumeReanalyze={() => void handleResumeReanalyze()}
              onResumeExport={() => void handleResumeExport()}
              onResumeDelete={() => void handleResumeDelete()}
              onJdMatch={() => void handleJdMatch()}
            />
          ),
          knowledge: (
            <KnowledgeWorkspace
              knowledgeInputKey={knowledgeInputKey}
              knowledgeCategory={knowledgeCategory}
              knowledgeUploading={knowledgeUploading}
              knowledgeList={knowledgeList}
              knowledgeLoading={knowledgeLoading}
              knowledgeSearch={knowledgeSearch}
              filteredKnowledge={filteredKnowledge}
              categoryOptions={categoryOptions}
              selectedKnowledgeId={selectedKnowledgeId}
              selectedKnowledge={selectedKnowledge}
              knowledgeDeletingId={knowledgeDeletingId}
              knowledgeRevectoringId={knowledgeRevectoringId}
              composerKnowledgeIds={composerKnowledgeIds}
              selectedComposerKnowledge={selectedComposerKnowledge}
              onKnowledgeFileChange={setKnowledgeFile}
              onKnowledgeCategoryChange={setKnowledgeCategory}
              onKnowledgeSearchChange={setKnowledgeSearch}
              onKnowledgeUpload={() => void handleKnowledgeUpload()}
              onRefreshKnowledgeList={() => void refreshKnowledgeList()}
              onKnowledgeOpen={(knowledgeId) => void loadKnowledgeDetail(knowledgeId)}
              onComposerKnowledgeToggle={toggleComposerKnowledge}
              onKnowledgeRevector={(knowledgeId, fileName) => void handleKnowledgeReVector(knowledgeId, fileName)}
              onKnowledgeDelete={(knowledgeId, fileName) => void handleKnowledgeDelete(knowledgeId, fileName)}
              onGoToRag={() => setActiveView('rag')}
            />
          ),
          rag: (
            <RagWorkspace
              newSessionTitle={newSessionTitle}
              knowledgeList={knowledgeList}
              composerKnowledgeIds={composerKnowledgeIds}
              sessionsLoading={sessionsLoading}
              sessionTab={sessionTab}
              sessionSearch={sessionSearch}
              visibleSessions={visibleSessions}
              selectedSessionId={selectedSessionId}
              selectedSessionDetail={selectedSessionDetail}
              sessionTitleDraft={sessionTitleDraft}
              sessionKnowledgeDraft={sessionKnowledgeDraft}
              onNewSessionTitleChange={setNewSessionTitle}
              onComposerKnowledgeToggle={toggleComposerKnowledge}
              onCreateSession={() => void handleCreateSession()}
              onRefreshSessions={() => void refreshSessions()}
              onSessionTabChange={setSessionTab}
              onSessionSearchChange={setSessionSearch}
              onOpenSessionChat={(sessionId) => void openSessionChat(sessionId)}
              onSessionTitleDraftChange={setSessionTitleDraft}
              onSessionTitleUpdate={() => void handleSessionTitleUpdate()}
              onSessionStatusToggle={() => void handleSessionStatusToggle()}
              onSessionDelete={() => void handleSessionDelete()}
              onSessionKnowledgeDraftToggle={toggleSessionKnowledgeDraft}
              onSessionKnowledgeUpdate={() => void handleSessionKnowledgeUpdate()}
              onOpenCurrentChat={() => setSessionChatOpen(true)}
            />
          ),
          tasks: (
            <TasksWorkspace
              taskLookupType={taskLookupType}
              taskLookupId={taskLookupId}
              taskLookupLoading={taskLookupLoading}
              taskLookupResult={taskLookupResult}
              recentTasks={recentTasks}
              onTaskLookupTypeChange={setTaskLookupType}
              onTaskLookupIdChange={setTaskLookupId}
              onTaskLookup={() => void handleTaskLookup()}
              onTaskRefresh={(resourceType, resourceId) => void runTaskLookup(resourceType, resourceId)}
              onTaskOpen={openTaskResource}
            />
          ),
        }}
      />
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
    </>
  );
}
