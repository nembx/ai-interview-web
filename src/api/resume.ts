import type { DownloadedFile, JdMatchRaw, ResumeDetailResponse, ResumeResponse, TaskSubmitResponse } from '../types';
import { createFormData, extractFileName, request, resolveUrl } from './client';

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

export async function reAnalyzeResume(resumeId: number): Promise<void> {
  await request<void>(`/resume/reAnalyze/${resumeId}`, {
    method: 'POST',
  });
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
