import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"

import type { InterviewSessionDetailResponse } from "@/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/utils"
import { cn } from "@/lib/utils"

const MESSAGE_SCROLL_THRESHOLD_PX = 80

interface InterviewChatModalProps {
  open: boolean
  loading: boolean
  sessionDetail: InterviewSessionDetailResponse | null
  question: string
  streaming: boolean
  voiceRecording: boolean
  voiceProcessing: boolean
  onOpenChange: (open: boolean) => void
  onQuestionChange: (value: string) => void
  onSend: () => void
  onVoiceStart: () => void
  onVoiceStop: () => void
}

function getSessionStatusLabel(status?: InterviewSessionDetailResponse["status"]) {
  if (status === "ACTIVE") return "进行中"
  if (status === "ARCHIVED") return "已归档"
  return "未加载"
}

function InterviewMessageContent({
  content,
  type,
}: {
  content: string
  type: "USER" | "ASSISTANT"
}) {
  if (type === "USER") {
    return (
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
        {content || "..."}
      </p>
    )
  }

  return (
    <div className="session-chat-markdown break-words text-sm leading-6 text-foreground">
      <ReactMarkdown>{content || "..."}</ReactMarkdown>
    </div>
  )
}

function InterviewChatModal({
  open,
  loading,
  sessionDetail,
  question,
  streaming,
  voiceRecording,
  voiceProcessing,
  onOpenChange,
  onQuestionChange,
  onSend,
  onVoiceStart,
  onVoiceStop,
}: InterviewChatModalProps) {
  const detail = loading ? null : sessionDetail
  const hasSessionDetail = detail !== null
  const isActiveSession = detail?.status === "ACTIVE"
  const hasQuestionText = question.trim().length > 0
  const busy = streaming || voiceProcessing
  const textareaDisabled = !isActiveSession || busy || !hasSessionDetail
  const sendDisabled = !isActiveSession || busy || !hasQuestionText
  const voiceDisabled = !isActiveSession || busy || !hasSessionDetail
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const [shouldFollowScroll, setShouldFollowScroll] = useState(true)
  const lastSessionIdRef = useRef<number | null>(null)
  const hasSnappedForSessionRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)

  const messageSignature = detail?.messages
    .map((message) => `${message.id}:${message.type}:${message.content}`)
    .join("|") ?? ""

  // Cleanup audio object URL on unmount / change
  useEffect(() => {
    return () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc)
    }
  }, [audioSrc])

  function updateShouldFollowScroll() {
    const viewport = scrollViewportRef.current
    if (!viewport) return
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    setShouldFollowScroll(distanceFromBottom <= MESSAGE_SCROLL_THRESHOLD_PX)
  }

  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return
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
    const sessionChanged = lastSessionIdRef.current !== detail.sessionId

    if (!viewport) return

    if (sessionChanged) {
      lastSessionIdRef.current = detail.sessionId
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

  function playAudio(blob: Blob) {
    if (audioSrc) URL.revokeObjectURL(audioSrc)
    const url = URL.createObjectURL(blob)
    setAudioSrc(url)
    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play().catch(() => {})
    }
  }

  // Expose playAudio to parent via a stable callback stored on the DOM element
  // We use a simpler approach: parent passes audioBlob via a prop-like mechanism
  // Actually, we'll just expose playAudio through a ref-like pattern
  // Let's keep it simple: parent will pass onAudioReady, but for now the parent
  // handles this through the voiceProcessing flow and we play from App.

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] flex-col max-sm:max-w-none sm:h-auto sm:min-h-[40rem]"
      >
        <DialogHeader>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate">
              {detail ? `面试 #${detail.sessionId}` : "面试详情"}
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
            <p className="text-sm text-muted-foreground">正在加载面试会话...</p>
          ) : !detail ? (
            <>
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">面试详情暂不可用</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted-foreground">回答</span>
                <Textarea value={question} onChange={(e) => onQuestionChange(e.target.value)} rows={4} disabled placeholder="当前暂无面试可回答" />
              </div>

              <div className="flex gap-2">
                <Button disabled className="flex-1">发送回答</Button>
                <Button disabled variant="outline" className="shrink-0">录音</Button>
              </div>
            </>
          ) : (
            <>
              <div
                ref={scrollViewportRef}
                data-testid="interview-chat-scroll"
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
                        {message.type === "USER" ? "你" : "面试官"}
                      </span>
                      <InterviewMessageContent content={message.content} type={message.type} />
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">面试尚未开始，发送消息或录音开始面试</p>
                )}
              </div>

              {/* Audio player for voice responses */}
              {audioSrc && (
                <audio ref={audioRef} controls src={audioSrc} className="w-full h-8" />
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted-foreground">回答</span>
                <Textarea
                  value={question}
                  onChange={(e) => onQuestionChange(e.target.value)}
                  rows={4}
                  disabled={textareaDisabled}
                  placeholder={isActiveSession ? "输入你的回答..." : "归档会话不可继续面试"}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={onSend} disabled={sendDisabled} className="flex-1">
                  {streaming ? "面试官思考中..." : "发送回答"}
                </Button>

                {voiceRecording ? (
                  <Button
                    variant="destructive"
                    className="shrink-0"
                    onClick={onVoiceStop}
                  >
                    <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-white" />
                    停止录音
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="shrink-0"
                    disabled={voiceDisabled}
                    onClick={onVoiceStart}
                  >
                    {voiceProcessing ? "语音处理中..." : "语音面试"}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { InterviewChatModal }
export type { InterviewChatModalProps }
