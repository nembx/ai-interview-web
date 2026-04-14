import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { AppShell, type AppShellView } from './app-shell';

const baseCounts = {
  knowledgeCount: 8,
  sessionCount: 3,
  recentResumeCount: 2,
  inFlightTaskCount: 1,
  selectedKnowledgeCount: 4,
};

const viewContent: Record<AppShellView, string> = {
  overview: 'overview-content',
  resume: 'resume-content',
  knowledge: 'knowledge-content',
  rag: 'rag-content',
  tasks: 'tasks-content',
};

test('renders the active workspace content and switches views from navigation', () => {
  const onViewChange = vi.fn();

  render(
    <AppShell
      activeView="overview"
      notice={null}
      onViewChange={onViewChange}
      views={{
        overview: <div>{viewContent.overview}</div>,
        resume: <div>{viewContent.resume}</div>,
        knowledge: <div>{viewContent.knowledge}</div>,
        rag: <div>{viewContent.rag}</div>,
        tasks: <div>{viewContent.tasks}</div>,
      }}
      counts={baseCounts}
    />,
  );

  expect(screen.getByText(viewContent.overview)).toBeInTheDocument();
  expect(screen.queryByText(viewContent.resume)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /知识库/i }));
  expect(onViewChange).toHaveBeenCalledWith('knowledge');
});

test('shows the notice banner and in-flight task badge when provided', () => {
  render(
    <AppShell
      activeView="tasks"
      notice={{ message: '任务处理中', tone: 'danger' }}
      onViewChange={() => {}}
      views={{
        overview: <div>{viewContent.overview}</div>,
        resume: <div>{viewContent.resume}</div>,
        knowledge: <div>{viewContent.knowledge}</div>,
        rag: <div>{viewContent.rag}</div>,
        tasks: <div>{viewContent.tasks}</div>,
      }}
      counts={baseCounts}
    />,
  );

  expect(screen.getByText('任务处理中')).toBeInTheDocument();
  expect(screen.getByText(viewContent.tasks)).toBeInTheDocument();
  expect(screen.getAllByText('1').length).toBeGreaterThan(0);
});

test('renders active view content and navigation items for all views', () => {
  render(
    <AppShell
      activeView="resume"
      notice={null}
      onViewChange={() => {}}
      views={{
        overview: <div>{viewContent.overview}</div>,
        resume: <div>{viewContent.resume}</div>,
        knowledge: <div>{viewContent.knowledge}</div>,
        rag: <div>{viewContent.rag}</div>,
        tasks: <div>{viewContent.tasks}</div>,
      }}
      counts={baseCounts}
    />,
  );

  expect(screen.getByText(viewContent.resume)).toBeInTheDocument();
  expect(screen.queryByText(viewContent.overview)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /简历分析/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /RAG 会话/i })).toBeInTheDocument();
});
