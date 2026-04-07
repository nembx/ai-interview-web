import { useEffect, useRef, useState } from "react"

import type { RagSessionDetailResponse } from "@/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/utils"
import { cn } from "@/lib/utils"

const MESSAGE_SCROLL_THRESHOLD_PX = 80

interface SessionChatModalProps {
  open: boolean
  loading: boolean
  sessionDetail: RagSessionDetailResponse | null
  question: string
  streaming: boolean
  onOpenChange: (open: boolean) => void
  onQuestionChange: (value: string) => void
  onSend: () => void
}

function getSessionStatusLabel(status?: RagSessionDetailResponse["status"]) {
  if (status === "ACTIVE") {
    return "进行中"
  }

  if (status === "ARCHIVED") {
    return "已归档"
  }

  return "未加载"
}

function SessionChatModal({
  open,
  loading,
  sessionDetail,
  question,
  streaming,
  onOpenChange,
  onQuestionChange,
  onSend,
}: SessionChatModalProps) {
  const detail = loading ? null : sessionDetail
  const hasSessionDetail = detail !== null
  const isActiveSession = detail?.status === "ACTIVE"
  const hasQuestionText = question.trim().length > 0
  const textareaDisabled = !isActiveSession || streaming || !hasSessionDetail
  const sendDisabled = !isActiveSession || streaming || !hasQuestionText
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const [shouldFollowScroll, setShouldFollowScroll] = useState(true)
  const lastSessionIdRef = useRef<number | null>(null)
  const hasSnappedForSessionRef = useRef(false)
  const messageSignature = detail?.messages
    .map((message) => `${message.id}:${message.type}:${message.content}`)
    .join("|") ?? ""

  function updateShouldFollowScroll() {
    const viewport = scrollViewportRef.current

    if (!viewport) {
      return
    }

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    setShouldFollowScroll(distanceFromBottom <= MESSAGE_SCROLL_THRESHOLD_PX)
  }

  useEffect(() => {
    const viewport = scrollViewportRef.current

    if (!viewport) {
      return
    }

    viewport.addEventListener("scroll", updateShouldFollowScroll, { passive: true })
    return () => viewport.removeEventListener("scroll", updateShouldFollowScroll)
  }, [updateShouldFollowScroll])

  useEffect(() => {
    if (!open || !detail) {
      lastSessionIdRef.current = null
      hasSnappedForSessionRef.current = false
      setShouldFollowScroll(true)
      return
    }

    const viewport = scrollViewportRef.current
    const sessionChanged = lastSessionIdRef.current !== detail.id

    if (!viewport) {
      return
    }

    if (sessionChanged) {
      lastSessionIdRef.current = detail.id
      hasSnappedForSessionRef.current = false
      setShouldFollowScroll(true)
    }

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    const viewportNearBottom = distanceFromBottom <= MESSAGE_SCROLL_THRESHOLD_PX
    const shouldSnapToBottom =
      !hasSnappedForSessionRef.current || (shouldFollowScroll && viewportNearBottom)

    if (shouldSnapToBottom) {
      viewport.scrollTop = viewport.scrollHeight
      setShouldFollowScroll(true)
    } else {
      setShouldFollowScroll(viewportNearBottom)
    }

    hasSnappedForSessionRef.current = true
  }, [detail, messageSignature, open, shouldFollowScroll, streaming])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] flex-col max-sm:max-w-none sm:h-auto sm:min-h-[40rem]"
      >
        <DialogHeader>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate">
              {detail?.title ?? "会话详情"}
            </DialogTitle>
            {!loading && detail ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={detail?.status === "ACTIVE" ? "secondary" : "outline"}>
                  {getSessionStatusLabel(detail?.status)}
                </Badge>
                <span>更新时间 {formatDateTime(detail?.updatedAt)}</span>
              </div>
            ) : null}
          </div>
          <DialogClose />
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">正在加载会话...</p>
          ) : !detail ? (
            <>
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">会话详情暂不可用</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted-foreground">提问</span>
                <Textarea
                  value={question}
                  onChange={(event) => onQuestionChange(event.target.value)}
                  rows={4}
                  disabled
                  placeholder="当前暂无会话可提问"
                />
              </div>

              <Button disabled>发送问题</Button>
            </>
          ) : (
            <>
              <div
                ref={scrollViewportRef}
                data-testid="session-chat-scroll"
                data-scroll-following={shouldFollowScroll ? "true" : "false"}
                onScrollCapture={(event) => {
                  const viewport = event.currentTarget
                  const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
                  setShouldFollowScroll(distanceFromBottom <= MESSAGE_SCROLL_THRESHOLD_PX)
                }}
                className={cn(
                  "flex h-[22rem] min-h-0 flex-col gap-2 overflow-auto rounded-2xl border border-border/70 bg-muted/40 p-3 thin-scrollbar",
                  !detail?.messages.length && "justify-center",
                )}
              >
                {detail?.messages.length ? (
                  detail.messages.map((message) => (
                    <article
                      key={`${message.id}-${message.type}`}
                      className={cn(
                        "flex flex-col gap-1.5 rounded-xl border px-4 py-3",
                        message.type === "USER"
                          ? "ml-10 border-indigo/[0.12] bg-indigo-soft"
                          : "mr-10 border-border bg-card",
                      )}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {message.type === "USER" ? "你" : "Assistant"}
                      </span>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                        {message.content || "..."}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">暂无消息</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted-foreground">提问</span>
                <Textarea
                  value={question}
                  onChange={(event) => onQuestionChange(event.target.value)}
                  rows={4}
                  disabled={textareaDisabled}
                  placeholder={isActiveSession ? "例如：根据这些资料帮我生成一轮面试问答" : "归档会话不可继续提问"}
                />
              </div>

              <Button onClick={onSend} disabled={sendDisabled}>
                {streaming ? "流式生成中..." : "发送问题"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { SessionChatModal }
