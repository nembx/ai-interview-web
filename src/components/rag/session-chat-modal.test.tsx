import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { RagSessionDetailResponse } from '@/types';
import { formatDateTime } from '@/utils';

import { SessionChatModal } from './session-chat-modal';

const activeSession: RagSessionDetailResponse = {
  id: 7,
  title: 'Java 面试会话',
  status: 'ACTIVE',
  createdAt: '2026-04-05T08:00:00.000Z',
  updatedAt: '2026-04-05T09:00:00.000Z',
  knowledgeBases: [],
  messages: [
    { id: 1, type: 'USER', content: '给我几道 Java 面试题' },
    { id: 2, type: 'ASSISTANT', content: '先从集合与并发开始。' },
  ],
};

const archivedSession: RagSessionDetailResponse = {
  ...activeSession,
  status: 'ARCHIVED',
  updatedAt: '2026-04-05T10:30:00.000Z',
};

function setScrollMetrics(
  element: HTMLElement,
  metrics: { scrollHeight: number; clientHeight: number; scrollTop: number },
) {
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: metrics.clientHeight,
  });
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    value: metrics.scrollTop,
    writable: true,
  });
}

test('renders loading state while the session detail is being fetched', () => {
  render(
    <SessionChatModal
      open
      sessionDetail={null}
      loading
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getAllByText('正在加载会话...').length).toBeGreaterThan(0);
});

test('disables the composer for archived sessions', () => {
  const onOpenChange = vi.fn();
  const onQuestionChange = vi.fn();
  const onSend = vi.fn();

  render(
    <SessionChatModal
      open
      sessionDetail={archivedSession}
      loading={false}
      question="继续"
      streaming={false}
      onOpenChange={onOpenChange}
      onQuestionChange={onQuestionChange}
      onSend={onSend}
    />,
  );

  expect(screen.getByText('Java 面试会话')).toBeInTheDocument();
  expect(screen.getByText('已归档')).toBeInTheDocument();
  expect(screen.getByText(new RegExp(formatDateTime(archivedSession.updatedAt)))).toBeInTheDocument();

  const composer = screen.getByPlaceholderText('归档会话不可继续提问');
  expect(composer).toBeDisabled();
  expect(screen.getByRole('button', { name: '发送问题' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  expect(onOpenChange).toHaveBeenCalled();
  expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
});

test('keeps send disabled for whitespace-only active questions', () => {
  const onOpenChange = vi.fn();
  const onQuestionChange = vi.fn();
  const onSend = vi.fn();

  render(
    <SessionChatModal
      open
      sessionDetail={activeSession}
      loading={false}
      question="   "
      streaming={false}
      onOpenChange={onOpenChange}
      onQuestionChange={onQuestionChange}
      onSend={onSend}
    />,
  );

  expect(screen.getByPlaceholderText('例如：根据这些资料帮我生成一轮面试问答')).toBeEnabled();
  expect(screen.getByRole('button', { name: '发送问题' })).toBeDisabled();
});

test('hides stale header metadata while loading a non-null session', () => {
  render(
    <SessionChatModal
      open
      sessionDetail={activeSession}
      loading
      question="继续"
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  const dialogs = screen.getAllByRole('dialog');
  const dialog = dialogs[dialogs.length - 1];

  expect(within(dialog).getAllByText('正在加载会话...').length).toBeGreaterThan(0);
  expect(within(dialog).queryByText('Java 面试会话')).not.toBeInTheDocument();
  expect(within(dialog).queryByText('未加载')).not.toBeInTheDocument();
  expect(within(dialog).queryByText(/更新时间/)).not.toBeInTheDocument();
  expect(within(dialog).queryByText('已归档')).not.toBeInTheDocument();
  expect(within(dialog).queryByText('进行中')).not.toBeInTheDocument();
});

test('shows a neutral empty state when session detail is missing after loading', () => {
  render(
    <SessionChatModal
      open
      sessionDetail={null}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  const dialog = screen.getByRole('dialog');

  expect(within(dialog).getByText('会话详情暂不可用')).toBeInTheDocument();
  expect(within(dialog).queryByText('未加载')).not.toBeInTheDocument();
  expect(within(dialog).queryByText(/更新时间/)).not.toBeInTheDocument();
  expect(within(dialog).getByPlaceholderText('当前暂无会话可提问')).toBeDisabled();
  expect(within(dialog).getByRole('button', { name: '发送问题' })).toBeDisabled();
});

test('auto-scrolls when new content arrives and the viewport is near the bottom', async () => {
  const { rerender } = render(
    <SessionChatModal
      open
      sessionDetail={activeSession}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  const dialog = screen.getByRole('dialog');
  const viewport = within(dialog).getByTestId('session-chat-scroll');
  setScrollMetrics(viewport, {
    scrollHeight: 1000,
    clientHeight: 320,
    scrollTop: 650,
  });
  fireEvent.scroll(viewport, { target: { scrollTop: 650 } });

  setScrollMetrics(viewport, {
    scrollHeight: 1200,
    clientHeight: 320,
    scrollTop: 650,
  });

  rerender(
    <SessionChatModal
      open
      sessionDetail={{
        ...activeSession,
        messages: [
          ...activeSession.messages,
          { id: 3, type: 'ASSISTANT', content: '补一题 JVM。' },
        ],
      }}
      loading={false}
      question=""
      streaming
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  await waitFor(() => {
    expect(viewport.scrollTop).toBe(1200);
  });
});

test('does not force auto-scroll after the user scrolls upward', async () => {
  const { rerender } = render(
    <SessionChatModal
      open
      sessionDetail={activeSession}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  const dialog = screen.getByRole('dialog');
  const viewport = within(dialog).getByTestId('session-chat-scroll');
  setScrollMetrics(viewport, {
    scrollHeight: 1000,
    clientHeight: 320,
    scrollTop: 650,
  });
  fireEvent.scroll(viewport, { target: { scrollTop: 650 } });

  setScrollMetrics(viewport, {
    scrollHeight: 1000,
    clientHeight: 320,
    scrollTop: 160,
  });
  fireEvent.scroll(viewport, { target: { scrollTop: 160 } });

  setScrollMetrics(viewport, {
    scrollHeight: 1200,
    clientHeight: 320,
    scrollTop: 160,
  });

  rerender(
    <SessionChatModal
      open
      sessionDetail={{
        ...activeSession,
        messages: [
          ...activeSession.messages,
          { id: 3, type: 'ASSISTANT', content: '补一题 JVM。' },
        ],
      }}
      loading={false}
      question=""
      streaming
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  await waitFor(() => {
    expect(viewport.scrollTop).toBe(160);
  });
});

test('resets the initial bottom snap when opening a different session', async () => {
  const otherSession: RagSessionDetailResponse = {
    ...activeSession,
    id: 8,
    title: 'Python 面试会话',
    updatedAt: '2026-04-05T11:30:00.000Z',
    messages: [
      { id: 11, type: 'USER', content: '给我几道 Python 面试题' },
      { id: 12, type: 'ASSISTANT', content: '先从迭代器与装饰器开始。' },
      { id: 13, type: 'ASSISTANT', content: '再补一题协程。' },
    ],
  };

  const { rerender } = render(
    <SessionChatModal
      open
      sessionDetail={activeSession}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  const dialog = screen.getByRole('dialog');
  const viewport = within(dialog).getByTestId('session-chat-scroll');

  setScrollMetrics(viewport, {
    scrollHeight: 1000,
    clientHeight: 320,
    scrollTop: 100,
  });
  fireEvent.scroll(viewport, { target: { scrollTop: 100 } });

  setScrollMetrics(viewport, {
    scrollHeight: 1400,
    clientHeight: 320,
    scrollTop: 100,
  });

  rerender(
    <SessionChatModal
      open
      sessionDetail={otherSession}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  await waitFor(() => {
    expect(viewport.scrollTop).toBe(1400);
  });
});

test('renders assistant messages as formatted markdown', () => {
  const markdownSession: RagSessionDetailResponse = {
    ...activeSession,
    messages: [
      {
        id: 21,
        type: 'ASSISTANT',
        content: '# 面试重点\n\n- JVM\n- 并发\n\n```ts\nconst answer = 1;\n```',
      },
    ],
  };

  render(
    <SessionChatModal
      open
      sessionDetail={markdownSession}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  expect(screen.getByRole('heading', { name: '面试重点' })).toBeInTheDocument();
  expect(screen.getByText('JVM')).toBeInTheDocument();
  expect(screen.getByText('并发')).toBeInTheDocument();
  expect(screen.getByText('const answer = 1;')).toBeInTheDocument();
});
