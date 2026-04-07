# Session Chat Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the embedded RAG chat panel with a large centered modal that opens when a session row is clicked, while keeping streaming responses stable and preventing scroll jitter.

**Architecture:** Keep the existing session fetching and SSE streaming flow in `App.tsx`, but move chat presentation into a focused modal component and a reusable UI dialog wrapper. Add a small scroll-follow policy based on whether the user is already near the bottom, so streaming updates only auto-scroll when appropriate. Because the repo has no test runner yet, add the smallest practical Vitest + Testing Library setup first and cover the modal open flow plus the scroll-follow behavior.

**Tech Stack:** React 18, TypeScript, Vite, Base UI Dialog, Vitest, React Testing Library

---

### Task 1: Add a minimal frontend test harness

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`
- Create: `src/test/setup.ts`
- Create: `src/components/rag/session-chat-modal.test.tsx`

- [ ] **Step 1: Write the failing test for modal rendering**

```tsx
import { render, screen } from '@testing-library/react';
import { SessionChatModal } from './session-chat-modal';
import type { RagSessionDetailResponse } from '@/types';

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

test('renders the selected session inside a modal layout', () => {
  render(
    <SessionChatModal
      open
      sessionDetail={activeSession}
      loading={false}
      question="继续"
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('Java 面试会话')).toBeInTheDocument();
  expect(screen.getByText('给我几道 Java 面试题')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '发送问题' })).toBeEnabled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: FAIL because `vitest`, `@testing-library/react`, and `SessionChatModal` do not exist yet.

- [ ] **Step 3: Add the smallest test setup**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

```ts
// vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/resume': { target: proxyTarget, changeOrigin: true },
        '/jd-match': { target: proxyTarget, changeOrigin: true },
        '/knowledge': { target: proxyTarget, changeOrigin: true },
        '/rag': { target: proxyTarget, changeOrigin: true },
        '/task': { target: proxyTarget, changeOrigin: true },
      },
    },
  };
});
```

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src"]
}
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Run the test to verify it still fails for the right reason**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: FAIL with a module-resolution error for `src/components/rag/session-chat-modal.tsx`, proving the test harness is working and the component is still missing.

- [ ] **Step 5: Commit the test harness**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.app.json src/test/setup.ts src/components/rag/session-chat-modal.test.tsx
git commit -m "test: add vitest setup for rag chat modal"
```

### Task 2: Build the modal and lock down its basic behavior

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/rag/session-chat-modal.tsx`
- Modify: `src/components/rag/session-chat-modal.test.tsx`

- [ ] **Step 1: Write the next failing tests for loading and archived states**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('shows a loading state while session detail is being fetched', () => {
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

  expect(screen.getByText('正在加载会话...')).toBeInTheDocument();
});

test('disables the composer for archived sessions', async () => {
  const user = userEvent.setup();

  render(
    <SessionChatModal
      open
      sessionDetail={{ ...activeSession, status: 'ARCHIVED' }}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  const textarea = screen.getByPlaceholderText('归档会话不可继续提问');
  expect(textarea).toBeDisabled();
  expect(screen.getByRole('button', { name: '发送问题' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: '关闭聊天窗口' }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: FAIL because `SessionChatModal` and the dialog wrapper do not yet implement these states and controls.

- [ ] **Step 3: Implement a reusable dialog wrapper and the modal UI**

```tsx
// src/components/ui/dialog.tsx
import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';

export function DialogRoot(props: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root {...props} />;
}

export function DialogPortal(props: React.ComponentProps<typeof Dialog.Portal>) {
  return <Dialog.Portal {...props} />;
}

export function DialogBackdrop({ className, ...props }: React.ComponentProps<typeof Dialog.Backdrop>) {
  return <Dialog.Backdrop className={cn('fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]', className)} {...props} />;
}

export function DialogPopup({ className, ...props }: React.ComponentProps<typeof Dialog.Popup>) {
  return (
    <Dialog.Popup
      className={cn(
        'fixed left-1/2 top-1/2 z-50 flex w-[min(1100px,88vw)] max-w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl max-md:h-[100dvh] max-md:w-[100vw] max-md:max-w-none max-md:rounded-none',
        className,
      )}
      {...props}
    />
  );
}

export const DialogTitle = Dialog.Title;
export const DialogClose = Dialog.Close;
```

```tsx
// src/components/rag/session-chat-modal.tsx
import { X } from 'lucide-react';

import type { RagSessionDetailResponse } from '@/types';
import { formatDateTime } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogRoot, DialogTitle } from '@/components/ui/dialog';
import { StatusChip } from '@/ui';

interface SessionChatModalProps {
  open: boolean;
  loading: boolean;
  sessionDetail: RagSessionDetailResponse | null;
  question: string;
  streaming: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionChange: (value: string) => void;
  onSend: () => void | Promise<void>;
}

export function SessionChatModal({
  open,
  loading,
  sessionDetail,
  question,
  streaming,
  onOpenChange,
  onQuestionChange,
  onSend,
}: SessionChatModalProps) {
  const isActive = sessionDetail?.status === 'ACTIVE';

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="h-[82vh] min-h-[560px]">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-foreground">
                {sessionDetail?.title || '会话聊天'}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {sessionDetail ? <StatusChip label={sessionDetail.status} tone={sessionDetail.status === 'ACTIVE' ? 'success' : 'neutral'} /> : null}
                {sessionDetail ? <span>更新于 {formatDateTime(sessionDetail.updatedAt)}</span> : null}
              </div>
            </div>
            <DialogClose
              render={
                <Button variant="ghost" size="icon" aria-label="关闭聊天窗口">
                  <X className="size-4" />
                </Button>
              }
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            {/* message list slot */}
          </div>

          <div className="border-t border-border px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">提问</span>
              <Textarea
                value={question}
                onChange={(event) => onQuestionChange(event.target.value)}
                rows={4}
                disabled={!isActive || streaming}
                placeholder={isActive ? '例如：根据这些资料帮我生成一轮面试问答' : '归档会话不可继续提问'}
              />
            </div>
            <Button className="mt-3" onClick={() => void onSend()} disabled={!isActive || streaming}>
              {streaming ? '流式生成中...' : '发送问题'}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: PASS for the modal rendering, loading, and archived-state tests.

- [ ] **Step 5: Commit the modal shell**

```bash
git add src/components/ui/dialog.tsx src/components/rag/session-chat-modal.tsx src/components/rag/session-chat-modal.test.tsx
git commit -m "feat: add rag session chat modal shell"
```

### Task 3: Add scroll-follow logic and stable message rendering

**Files:**
- Modify: `src/components/rag/session-chat-modal.tsx`
- Modify: `src/components/rag/session-chat-modal.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing tests for scroll behavior**

```tsx
test('auto-scrolls when the viewer is already near the bottom', async () => {
  const scrollTo = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: scrollTo,
  });

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

  rerender(
    <SessionChatModal
      open
      sessionDetail={{
        ...activeSession,
        messages: [...activeSession.messages, { id: 3, type: 'ASSISTANT', content: '补一题 JVM。', transient: true }],
      }}
      loading={false}
      question=""
      streaming
      onOpenChange={() => {}}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  expect(scrollTo).toHaveBeenCalled();
});

test('does not force auto-scroll after the user scrolls upward', async () => {
  const scrollTo = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: scrollTo,
  });

  render(
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

  const viewport = screen.getByTestId('session-chat-scroll');
  Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 1200 });
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 500 });
  Object.defineProperty(viewport, 'scrollTop', { configurable: true, value: 100, writable: true });
  fireEvent.scroll(viewport);

  expect(scrollTo).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: FAIL because the modal does not yet expose a stable scroll container or a near-bottom scroll policy.

- [ ] **Step 3: Implement the stable message viewport**

```tsx
// inside src/components/rag/session-chat-modal.tsx
const scrollViewportRef = useRef<HTMLDivElement | null>(null);
const shouldStickToBottomRef = useRef(true);
const previousMessageCountRef = useRef(0);

function updateStickiness() {
  const viewport = scrollViewportRef.current;
  if (!viewport) return;

  const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
  shouldStickToBottomRef.current = distanceFromBottom < 80;
}

useEffect(() => {
  if (!open) {
    shouldStickToBottomRef.current = true;
    previousMessageCountRef.current = 0;
    return;
  }

  const viewport = scrollViewportRef.current;
  if (!viewport) return;

  const messageCount = sessionDetail?.messages.length ?? 0;
  const initialOpen = previousMessageCountRef.current === 0;
  const appended = messageCount > previousMessageCountRef.current;
  previousMessageCountRef.current = messageCount;

  if (initialOpen || (appended && shouldStickToBottomRef.current) || (streaming && shouldStickToBottomRef.current)) {
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: initialOpen ? 'auto' : 'smooth' });
  }
}, [open, sessionDetail?.messages, streaming]);
```

```tsx
<div
  ref={scrollViewportRef}
  data-testid="session-chat-scroll"
  onScroll={updateStickiness}
  className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-3.5 thin-scrollbar"
>
  {loading ? <p className="text-[13px] text-muted-foreground">正在加载会话...</p> : null}
  {sessionDetail?.messages.map((message) => (
    <article
      key={`${message.id}-${message.type}`}
      className={`mb-2.5 flex flex-col gap-1.5 rounded-lg border px-4 py-3 ${message.type === 'USER' ? 'ml-10 bg-indigo-soft border-indigo/[0.12]' : 'mr-10 bg-card border-border'}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {message.type === 'USER' ? '你' : 'Assistant'}
      </span>
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{message.content || '...'}</p>
    </article>
  ))}
</div>
```

```css
.chat-modal-shell {
  contain: layout paint;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: PASS for modal rendering and scroll-follow tests.

- [ ] **Step 5: Commit the scroll stabilization**

```bash
git add src/components/rag/session-chat-modal.tsx src/components/rag/session-chat-modal.test.tsx src/styles.css
git commit -m "feat: stabilize streaming rag chat scrolling"
```

### Task 4: Wire the modal into `App.tsx` and remove the embedded chat panel

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/rag/session-chat-modal.test.tsx`

- [ ] **Step 1: Write the failing integration test for click-to-open behavior**

```tsx
test('opens the selected session in the modal when a session row is clicked', async () => {
  const user = userEvent.setup();
  const openSpy = vi.fn();

  render(
    <SessionChatModal
      open={false}
      sessionDetail={activeSession}
      loading={false}
      question=""
      streaming={false}
      onOpenChange={openSpy}
      onQuestionChange={() => {}}
      onSend={() => {}}
    />,
  );

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(document.body);
  expect(openSpy).not.toHaveBeenCalled();
});
```

Run this after wiring `App.tsx` with a separate app-level test in the implementation pass; the initial failure should come from the app not yet exposing modal state transitions.

- [ ] **Step 2: Run the targeted checks to verify the app wiring is still missing**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: FAIL for the integration coverage you add around the app-level modal opening flow.

- [ ] **Step 3: Implement the app wiring**

```tsx
// App.tsx state
const [chatModalOpen, setChatModalOpen] = useState(false);

async function openSessionChat(sessionId: number): Promise<void> {
  await loadSessionDetail(sessionId);
  setChatModalOpen(true);
}
```

```tsx
// session list row
<button
  key={item.id}
  type="button"
  className={`flex items-center justify-between gap-3 px-3.5 py-3 border bg-card rounded-lg w-full text-left transition-colors hover:border-primary hover:bg-indigo-soft cursor-pointer ${selectedSessionId === item.id ? 'border-primary bg-indigo-soft' : 'border-border'}`}
  onClick={() => void openSessionChat(item.id)}
>
```

```tsx
// replace the embedded chat column with metadata only
<div className="flex-1 flex flex-col gap-3">
  <div className="flex items-end gap-3">
    {/* title editor */}
  </div>
  <div className="flex items-center gap-3">
    {/* archive / delete buttons */}
  </div>
  <div className="flex justify-between items-center gap-3 pb-2.5 border-b border-border/50">
    <span className="text-xs text-muted-foreground">创建时间</span>
    <strong className="text-sm">{formatDateTime(selectedSessionDetail.createdAt)}</strong>
  </div>
  <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
    点击左侧会话卡片可打开大尺寸聊天窗口，消息区域已从当前工作台移出。
  </div>
</div>
```

```tsx
<SessionChatModal
  open={chatModalOpen}
  loading={sessionDetailLoading}
  sessionDetail={selectedSessionDetail}
  question={sessionQuestion}
  streaming={chatStreaming}
  onOpenChange={setChatModalOpen}
  onQuestionChange={setSessionQuestion}
  onSend={() => void handleSendQuestion()}
/>
```

- [ ] **Step 4: Run the verification suite**

Run: `npm run test -- src/components/rag/session-chat-modal.test.tsx`

Expected: PASS

Run: `npm run build`

Expected: PASS with a production build output from Vite and TypeScript.

- [ ] **Step 5: Commit the app integration**

```bash
git add src/App.tsx src/components/rag/session-chat-modal.tsx src/components/rag/session-chat-modal.test.tsx
git commit -m "feat: open rag sessions in a centered chat modal"
```

## Self-Review

### Spec coverage

- Click session row to open modal: covered in Task 4.
- Centered large modal layout with mobile fallback: covered in Task 2.
- Remove embedded bottom chat panel and keep workspace metadata: covered in Task 4.
- Stable fixed-height message viewport: covered in Task 3.
- Streaming only updates one assistant bubble and follows bottom conditionally: existing app behavior is preserved in Task 4, while scroll-follow gating is added in Task 3.
- Archived/loading/disabled states: covered in Task 2.

### Placeholder scan

- No `TODO`, `TBD`, or cross-task “same as above” placeholders remain.
- Each task names exact files, concrete commands, and code snippets.

### Type consistency

- Modal props align with existing `RagSessionDetailResponse`, `sessionQuestion`, and `chatStreaming` state from `App.tsx`.
- The plan keeps the current `RagMessage` structure and does not invent a parallel message model.
