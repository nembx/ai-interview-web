import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { KnowledgeListItem, RecentResumeRecord, RecentTaskRecord } from '@/types';

import { OverviewWorkspace } from './overview-workspace';

vi.mock('@/components/charts/echarts-panel', () => ({
  EChartsPanel: ({ label }: { label: string }) => <div data-testid="mock-chart">{label}</div>,
}));

const recentResumes: RecentResumeRecord[] = [
  {
    id: 1,
    fileName: 'resume-a.pdf',
    lastStatus: 'COMPLETED',
    updatedAt: '2026-04-10T08:00:00.000Z',
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
];

test('renders the overview dashboard charts when data exists', () => {
  render(
    <OverviewWorkspace
      recentResumes={recentResumes}
      recentTasks={recentTasks}
      knowledgeList={knowledgeList}
      activeSessionCount={2}
      archivedSessionCount={1}
      onOpenResume={() => {}}
    />,
  );

  expect(screen.getByText('数据看板')).toBeInTheDocument();
  expect(screen.getByText('资源概览图表')).toBeInTheDocument();
  expect(screen.getByText('任务状态分布图表')).toBeInTheDocument();
  expect(screen.getByText('最近七天活跃度图表')).toBeInTheDocument();
  expect(screen.getByText('知识库分类占比图表')).toBeInTheDocument();
});

test('shows empty states for dashboard sections without source data', () => {
  render(
    <OverviewWorkspace
      recentResumes={[]}
      recentTasks={[]}
      knowledgeList={[]}
      activeSessionCount={0}
      archivedSessionCount={0}
      onOpenResume={() => {}}
    />,
  );

  expect(screen.getByText('资源概览图表')).toBeInTheDocument();
  expect(screen.getByText('暂无任务分布')).toBeInTheDocument();
  expect(screen.getByText('暂无活跃记录')).toBeInTheDocument();
  expect(screen.getByText('暂无知识分类')).toBeInTheDocument();
});
