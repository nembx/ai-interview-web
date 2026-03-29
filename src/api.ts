import type {
  ApiResult,
  CreateSessionRequest,
  DownloadedFile,
  JdMatchRaw,
  KnowledgeListItem,
  KnowledgeResponse,
  RagSessionDetailResponse,
  RagSessionResponse,
  ResumeDetailResponse,
  ResumeResponse,
  SessionStatus,
  TaskStatusResponse,
  TaskSubmitResponse,
} from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function resolveUrl(path: string): string {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

async function parseJsonResult<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResult<T>;

  if (typeof payload?.code !== 'number') {
    throw new Error('服务端返回了无法识别的响应');
  }

  if (payload.code !== 200) {
    throw new Error(payload.message || '请求失败');
  }

  return payload.data;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveUrl(path), init);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('服务端返回了非 JSON 数据');
  }

  return parseJsonResult<T>(response);
}

function createFormData(values: Record<string, string | File>): FormData {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

function extractFileName(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition') || '';
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

export async function uploadResume(file: File): Promise<TaskSubmitResponse> {
  return request<TaskSubmitResponse>('/resume/upload', {
    method: 'POST',
    body: createFormData({ file }),
  });
}

export async function getResume(resumeId: number): Promise<ResumeResponse> {
  return request<ResumeResponse>(`/resume/get/${resumeId}`);
}

export async function getResumeDetail(resumeId: number): Promise<ResumeDetailResponse> {
  return request<ResumeDetailResponse>(`/resume/detail/${resumeId}`);
}

export async function deleteResume(resumeId: number): Promise<void> {
  await request<void>(`/resume/delete/${resumeId}`, {
    method: 'DELETE',
  });
}

export async function exportResumePdf(resumeId: number): Promise<DownloadedFile> {
  const response = await fetch(resolveUrl(`/resume/export/${resumeId}`));

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    return {
      blob: await response.blob(),
      fileName: extractFileName(response, `resume-${resumeId}.pdf`),
    };
  }

  throw new Error(await response.text());
}

export async function matchResumeWithJd(resumeId: number, jdContent: string): Promise<void> {
  const params = new URLSearchParams({ jdContent });
  await request<void>(`/jd-match/match/${resumeId}?${params.toString()}`, {
    method: 'POST',
  });
}

export async function getJdMatchResult(resumeId: number): Promise<JdMatchRaw> {
  return request<JdMatchRaw>(`/jd-match/result/${resumeId}`);
}

export async function uploadKnowledge(file: File, category: string): Promise<TaskSubmitResponse> {
  return request<TaskSubmitResponse>('/knowledge/upload', {
    method: 'POST',
    body: createFormData({ file, category }),
  });
}

export async function getKnowledgeList(category?: string): Promise<KnowledgeListItem[]> {
  return request<KnowledgeListItem[]>(category ? `/knowledge/list/${encodeURIComponent(category)}` : '/knowledge/list');
}

export async function getKnowledgeById(knowledgeId: number): Promise<KnowledgeResponse> {
  return request<KnowledgeResponse>(`/knowledge/get/${knowledgeId}`);
}

export async function deleteKnowledge(knowledgeId: number): Promise<void> {
  await request<void>(`/knowledge/delete/${knowledgeId}`, {
    method: 'DELETE',
  });
}

export async function createRagSession(payload: CreateSessionRequest): Promise<RagSessionResponse> {
  return request<RagSessionResponse>('/rag/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function getRagSessions(status: SessionStatus): Promise<RagSessionResponse[]> {
  return request<RagSessionResponse[]>(`/rag/sessions?status=${status}`);
}

export async function getRagSessionDetail(sessionId: number): Promise<RagSessionDetailResponse> {
  return request<RagSessionDetailResponse>(`/rag/detail/${sessionId}`);
}

export async function updateRagSessionKnowledge(sessionId: number, knowledgeIds: number[]): Promise<void> {
  await request<void>(`/rag/updateSessionKnowledge/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(knowledgeIds),
  });
}

export async function updateRagSessionTitle(sessionId: number, title: string): Promise<void> {
  await request<void>(`/rag/updateTitle/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(title),
  });
}

export async function updateRagSessionStatus(sessionId: number, status: SessionStatus): Promise<void> {
  await request<void>(`/rag/updateStatus/${sessionId}?status=${status}`, {
    method: 'PUT',
  });
}

export async function deleteRagSession(sessionId: number): Promise<void> {
  await request<void>(`/rag/delete/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function getTaskStatus(resourceType: 'resume' | 'knowledge', resourceId: number): Promise<TaskStatusResponse> {
  return request<TaskStatusResponse>(`/task/status/${resourceType}/${resourceId}`);
}

export async function streamRagChat(
  sessionId: number,
  question: string,
  options: {
    onToken: (token: string) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const response = await fetch(resolveUrl('/rag/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, question }),
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    await parseJsonResult<unknown>(response);
    throw new Error('流式接口没有返回事件流');
  }

  if (!response.body) {
    throw new Error('浏览器未返回流式响应');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const eventBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = eventBlock
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

      if (data) {
        options.onToken(data.replace(/\\n/g, '\n').replace(/\\r/g, '\r'));
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  const tail = buffer.trim();
  if (tail.startsWith('data:')) {
    const data = tail
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (data) {
      options.onToken(data.replace(/\\n/g, '\n').replace(/\\r/g, '\r'));
    }
  }
}

