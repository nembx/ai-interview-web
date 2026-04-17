import type { TaskStatusResponse } from '../types';
import { request } from './client';

export async function getTaskStatus(resourceType: 'resume' | 'knowledge', resourceId: number): Promise<TaskStatusResponse> {
  return request<TaskStatusResponse>(`/task/status/${resourceType}/${resourceId}`);
}
