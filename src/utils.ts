import type {
  JdMatchRaw,
  JdMatchResponse,
  JdMissingSkill,
  JdSuggestion,
  RecentResumeRecord,
  RecentTaskRecord,
  ResumeDetailResponse,
  ResumeDetailView,
  ResumeSuggestion,
  TaskStatus,
} from './types';

export function formatBytes(bytes?: number): string {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function normalizeResumeDetail(detail: ResumeDetailResponse): ResumeDetailView {
  return {
    ...detail,
    analysis: {
      id: detail.analysis.id,
      resumeId: detail.analysis.resumeId,
      overallScore: detail.analysis.overallScore,
      contentScore: detail.analysis.contentScore,
      structureScore: detail.analysis.structureScore,
      skillMatchScore: detail.analysis.skillMatchScore,
      expressionScore: detail.analysis.expressionScore,
      projectScore: detail.analysis.projectScore,
      summary: detail.analysis.summary,
      strengths: parseJsonArray<string>(detail.analysis.strengthsJson),
      suggestions: parseJsonArray<ResumeSuggestion>(detail.analysis.suggestionsJson),
      analyzedAt: detail.analysis.analyzedAt,
    },
  };
}

function isMissingSkill(value: unknown): value is JdMissingSkill {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'skillName' in value;
}

function isSuggestion(value: unknown): value is JdSuggestion {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'issue' in value && 'recommendation' in value;
}

export function normalizeJdMatch(result: JdMatchRaw): JdMatchResponse {
  const missingFromMissing = result.missingSkills.filter(isMissingSkill);
  const missingFromSuggestions = result.suggestions.filter(isMissingSkill);
  const suggestionFromSuggestions = result.suggestions.filter(isSuggestion);
  const suggestionFromMissing = result.missingSkills.filter(isSuggestion);

  return {
    jdContent: result.jdContent,
    overallScore: result.overallScore,
    matchScore: result.matchScore,
    missingSkills: missingFromMissing.length > 0 ? missingFromMissing : missingFromSuggestions,
    suggestions: suggestionFromSuggestions.length > 0 ? suggestionFromSuggestions : suggestionFromMissing,
  };
}

export function upsertResumeRecord(
  list: RecentResumeRecord[],
  item: RecentResumeRecord,
): RecentResumeRecord[] {
  return [item, ...list.filter((entry) => entry.id !== item.id)].slice(0, 8);
}

export function upsertTaskRecord(
  list: RecentTaskRecord[],
  item: RecentTaskRecord,
): RecentTaskRecord[] {
  return [item, ...list.filter((entry) => !(entry.resourceId === item.resourceId && entry.resourceType === item.resourceType))].slice(0, 12);
}

export function statusTone(status: TaskStatus): 'neutral' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'PENDING':
    case 'PROCESSING':
    default:
      return 'warn';
  }
}


