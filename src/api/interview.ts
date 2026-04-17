import type {
  CreateInterviewSessionRequest,
  InterviewSessionDetailResponse,
  InterviewSessionResponse,
  SessionStatus,
} from '../types';
import { request, resolveUrl, streamSSE } from './client';

export async function createInterviewSession(payload: CreateInterviewSessionRequest): Promise<InterviewSessionResponse> {
  return request<InterviewSessionResponse>('/interview/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getInterviewSessions(status: SessionStatus): Promise<InterviewSessionResponse[]> {
  return request<InterviewSessionResponse[]>(`/interview/sessions?status=${status}`);
}

export async function getInterviewSessionDetail(sessionId: number): Promise<InterviewSessionDetailResponse> {
  return request<InterviewSessionDetailResponse>(`/interview/detail/${sessionId}`);
}

export async function deleteInterviewSession(sessionId: number): Promise<void> {
  await request<void>(`/interview/delete/${sessionId}`, { method: 'DELETE' });
}

export async function updateInterviewSessionStatus(sessionId: number, status: SessionStatus): Promise<void> {
  await request<void>(`/interview/updateStatus/${sessionId}?status=${status}`, { method: 'PUT' });
}

export async function updateInterviewSessionTitle(sessionId: number, title: string): Promise<void> {
  await request<void>(`/interview/updateTitle/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title),
  });
}

export async function streamInterviewChat(
  sessionId: number,
  question: string,
  options: {
    onToken: (token: string) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  return streamSSE('/interview/chat', { sessionId, question }, options);
}

export async function voiceInterviewChat(
  sessionId: number,
  audioBlob: Blob,
  options?: { signal?: AbortSignal },
): Promise<Blob> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(resolveUrl(`/interview/voice-chat/${sessionId}`), {
    method: 'POST',
    body: formData,
    signal: options?.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!response.body) {
    return response.blob();
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  return new Blob(chunks, { type: contentType });
}
