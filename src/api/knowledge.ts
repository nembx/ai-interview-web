import type { KnowledgeListItem, KnowledgeResponse, TaskSubmitResponse } from '../types';
import { createFormData, request } from './client';

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

export async function reVectorKnowledge(knowledgeId: number): Promise<void> {
  await request<void>(`/knowledge/reVector/${knowledgeId}`, {
    method: 'POST',
  });
}

export async function deleteKnowledge(knowledgeId: number): Promise<void> {
  await request<void>(`/knowledge/delete/${knowledgeId}`, {
    method: 'DELETE',
  });
}
