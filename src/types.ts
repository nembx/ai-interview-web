export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type SessionStatus = 'ACTIVE' | 'ARCHIVED';
export type MessageType = 'USER' | 'ASSISTANT';
export type ResourceType = 'resume' | 'knowledge';

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

export interface TaskSubmitResponse {
  resourceId: number;
  resourceType: ResourceType;
  taskStatus: TaskStatus;
}

export interface TaskStatusResponse {
  resourceId: number;
  resourceType: ResourceType;
  fileName: string;
  taskStatus: TaskStatus;
  uploadTime: string;
}

export interface ResumeResponse {
  id: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  resumeText: string;
  uploadTime: string;
}

export interface ResumeAnalysisRaw {
  id: number;
  resumeId: number;
  overallScore: number;
  contentScore: number;
  structureScore: number;
  skillMatchScore: number;
  expressionScore: number;
  projectScore: number;
  summary: string;
  strengthsJson: string | string[];
  suggestionsJson: string | ResumeSuggestion[];
  analyzedAt: string;
}

export interface ResumeSuggestion {
  category: string;
  priority: string;
  issue: string;
  recommendation: string;
}

export interface ResumeAnalysis {
  id: number;
  resumeId: number;
  overallScore: number;
  contentScore: number;
  structureScore: number;
  skillMatchScore: number;
  expressionScore: number;
  projectScore: number;
  summary: string;
  strengths: string[];
  suggestions: ResumeSuggestion[];
  analyzedAt: string;
}

export interface ResumeDetailResponse {
  id: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  resumeText: string;
  uploadTime: string;
  analysis: ResumeAnalysisRaw;
}

export interface ResumeDetailView {
  id: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  resumeText: string;
  uploadTime: string;
  analysis: ResumeAnalysis;
}

export interface JdMissingSkill {
  skillName: string;
  skillLevel: string;
}

export interface JdSuggestion {
  category: string;
  priority: string;
  issue: string;
  recommendation: string;
}

export interface JdMatchRaw {
  jdContent: string;
  overallScore: number;
  matchScore: number;
  missingSkills: unknown[];
  suggestions: unknown[];
}

export interface JdMatchResponse {
  jdContent: string;
  overallScore: number;
  matchScore: number;
  missingSkills: JdMissingSkill[];
  suggestions: JdSuggestion[];
}

export interface KnowledgeListItem {
  id: number;
  fileName: string;
  category: string;
  fileSize: number;
  fileType: string;
  uploadTime: string;
}

export interface KnowledgeResponse {
  id: number;
  fileName: string;
  category: string;
  fileSize: number;
  fileType: string;
  uploadTime: string;
}

export interface RagSessionResponse {
  id: number;
  title: string;
  knowledgeBaseIds: number[];
  status: SessionStatus;
  createdAt: string;
}

export interface RagMessage {
  id: number;
  type: MessageType;
  content: string;
  transient?: boolean;
}

export interface RagSessionDetailResponse {
  id: number;
  title: string;
  knowledgeBases: KnowledgeListItem[];
  messages: RagMessage[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  knowledgeIds: number[];
  title?: string;
}

export interface RecentResumeRecord {
  id: number;
  fileName: string;
  lastStatus: TaskStatus;
  updatedAt: string;
}

export interface RecentTaskRecord {
  resourceId: number;
  resourceType: ResourceType;
  fileName: string;
  taskStatus: TaskStatus;
  updatedAt: string;
}

export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

