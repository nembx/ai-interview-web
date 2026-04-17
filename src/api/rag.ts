import type {
  CreateSessionRequest,
  RagSessionDetailResponse,
  RagSessionResponse,
  SessionStatus,
} from '../types';
import { request, streamSSE } from './client';

export async function createRagSession(payload: CreateSessionRequest): Promise<RagSessionResponse> {
  return request<RagSessionResponse>('/rag/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(knowledgeIds),
  });
}

export async function updateRagSessionTitle(sessionId: number, title: string): Promise<void> {
  await request<void>(`/rag/updateTitle/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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

export async function streamRagChat(
  sessionId: number,
  question: string,
  options: {
    onToken: (token: string) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  return streamSSE('/rag/chat', { sessionId, question }, options);
}
