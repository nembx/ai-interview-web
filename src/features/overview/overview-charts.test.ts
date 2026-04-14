import { expect, test } from 'vitest';

import type { KnowledgeListItem, RecentResumeRecord, RecentTaskRecord } from '@/types';

import {
  buildActivityTrendOption,
  buildKnowledgeCategoryOption,
  buildResourceOverviewOption,
  buildTaskStatusOption,
} from './overview-charts';

const recentResumes: RecentResumeRecord[] = [
  {
    id: 1,
    fileName: 'resume-a.pdf',
    lastStatus: 'COMPLETED',
    updatedAt: '2026-04-10T08:00:00.000Z',
  },
  {
    id: 2,
    fileName: 'resume-b.pdf',
    lastStatus: 'PROCESSING',
    updatedAt: '2026-04-12T09:30:00.000Z',
  },
];

const recentTasks: RecentTaskRecord[] = [
  {
    resourceId: 1,
    resourceType: 'resume',
    fileName: 'resume-a.pdf',
    taskStatus: 'COMPLETED',
    updatedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    resourceId: 2,
    resourceType: 'knowledge',
    fileName: 'java-guide.md',
    taskStatus: 'PROCESSING',
    updatedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    resourceId: 3,
    resourceType: 'knowledge',
    fileName: 'system-design.md',
    taskStatus: 'FAILED',
    updatedAt: '2026-04-12T11:00:00.000Z',
  },
  {
    resourceId: 4,
    resourceType: 'resume',
    fileName: 'resume-c.pdf',
    taskStatus: 'PENDING',
    updatedAt: '2026-04-12T14:00:00.000Z',
  },
];

const knowledgeList: KnowledgeListItem[] = [
  {
    id: 1,
    fileName: 'java-guide.md',
    category: '八股',
    fileSize: 1000,
    fileType: 'md',
    uploadTime: '2026-04-10T08:00:00.000Z',
  },
  {
    id: 2,
    fileName: 'spring-notes.pdf',
    category: '八股',
    fileSize: 2000,
    fileType: 'pdf',
    uploadTime: '2026-04-11T08:00:00.000Z',
  },
  {
    id: 3,
    fileName: 'interview-qna.docx',
    category: '面试题',
    fileSize: 3000,
    fileType: 'docx',
    uploadTime: '2026-04-12T08:00:00.000Z',
  },
];

test('builds resource overview bars from current counts', () => {
  const option = buildResourceOverviewOption({
    resumeCount: 2,
    knowledgeCount: 3,
    activeSessionCount: 4,
    archivedSessionCount: 1,
    inFlightTaskCount: 2,
  });

  expect(option.xAxis).toMatchObject({
    data: ['简历', '知识库', '活跃会话', '归档会话', '处理中任务'],
  });
  expect(option.series).toMatchObject([
    {
      data: [2, 3, 4, 1, 2],
    },
  ]);
});

test('builds task status ring chart from recent task statuses', () => {
  const option = buildTaskStatusOption(recentTasks);

  expect(option.series).toMatchObject([
    {
      data: [
        { name: 'PENDING', value: 1 },
        { name: 'PROCESSING', value: 1 },
        { name: 'COMPLETED', value: 1 },
        { name: 'FAILED', value: 1 },
      ],
    },
  ]);
});

test('builds a trailing seven-day activity trend from resume and task updates', () => {
  const option = buildActivityTrendOption(recentResumes, recentTasks, '2026-04-13T00:00:00.000Z');

  expect(option.xAxis).toMatchObject({
    data: ['04-07', '04-08', '04-09', '04-10', '04-11', '04-12', '04-13'],
  });
  expect(option.series).toMatchObject([
    {
      data: [0, 0, 0, 2, 1, 3, 0],
    },
  ]);
});

test('builds knowledge category bars sorted by document count', () => {
  const option = buildKnowledgeCategoryOption(knowledgeList);

  expect(option.yAxis).toMatchObject({
    data: ['八股', '面试题'],
  });
  expect(option.series).toMatchObject([
    {
      data: [2, 1],
    },
  ]);
});
