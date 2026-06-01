import { useEffect, useRef, useCallback, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import type { GeminiModelId } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, PanelLeft, ArrowDown } from "lucide-react";
import { useListGeminiMessages, useGetGeminiConversation } from "@workspace/api-client-react";
import { useChatStreaming } from "@/hooks/use-chat";
import { useCreateGeminiConversation, getListGeminiConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  { label: "Explain a concept", prompt: "Explain quantum computing in simple terms" },
  { label: "Write something", prompt: "Help me write a professional email declining a meeting politely" },
  { label: "Brainstorm ideas", prompt: "Give me 10 creative side project ideas for a software developer" },
  { label: "Debug code", prompt: "What are common causes of memory leaks in JavaScript?" },
  { label: "Learn something", prompt: "What are the most important things to know about personal finance?" },
  { label: "Summarize", prompt: "Summarize the history of artificial intelligence in 5 key milestones" },
];

interface ChatAreaProps {
  conversationId: number | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  systemInstruction: string;
  model: GeminiModelId;
  onModelChange: (model: GeminiModelId) => void;
  onNewChat: () => void;
}

export function ChatArea({ conversationId, sidebarOpen, onToggleSidebar, systemInstruction, model, onModelChange, onNewChat }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  
  const { data: messages, isLoading: isLoadingMessages } = useListGeminiMessages(
    conversationId as number,
    { query: { enabled: !!conversationId } }
  );

  const { data: conversation } = useGetGeminiConversation(
    conversationId as number,
    { query: { enabled: !!conversationId } }
  );

  const { sendMessage, regenerateResponse, editMessage, stopGeneration, isStreaming, streamingMessage } = useChatStreaming(conversationId);
  const createMutation = useCreateGeminiConversation();

  const getScrollElement = useCallback(() => {
    if (!scrollRef.current) return null;
    return scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = getScrollElement();
    if (el) el.scrollTop = el.scrollHeight;
  }, [getScrollElement]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  useEffect(() => {
    const el = getScrollElement();
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 120);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [getScrollElement, conversationId]);

  const handleSend = (content: string) => {
    if (!conversationId) return;
    sendMessage(conversationId, content, systemInstruction, model);
  };

  const handleEdit = (messageId: number, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handleSubmitEdit = (newContent: string) => {
    if (!conversationId || editingMessageId === null) return;
    setEditingMessageId(null);
    setEditingContent("");
    editMessage(conversationId, editingMessageId, newContent, systemInstruction, model);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSuggestedPrompt = (prompt: string) => {
    createMutation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
          setLocation(`/${newConv.id}`);
          sendMessage(newConv.id, prompt, systemInstruction, model);
        },
      }
    );
  };

  const handleRegenerate = useCallback(() => {
    if (!conversationId) return;
    regenerateResponse(conversationId, model);
  }, [conversationId, regenerateResponse, model]);

  const handleExport = () => {
    if (!messages || !conversation) return;
    const lines: string[] = [`# ${conversation.title}`, ""];
    for (const msg of messages) {
      const label = msg.role === "user" ? "**You**" : "**Aria**";
      lines.push(`${label}\n\n${msg.content}`, "");
      lines.push("---", "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={onToggleSidebar} title="Open sidebar">
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="font-medium text-muted-foreground">Aria</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-8 overflow-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <div className="text-2xl font-semibold text-primary">A</div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">How can I help you today?</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Start a new conversation, or try one of these prompts:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
            {SUGGESTED_PROMPTS.map((item) => (
              <button
                key={item.prompt}
                className="text-left p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-border/80 transition-colors group"
                onClick={() => handleSuggestedPrompt(item.prompt)}
                disabled={createMutation.isPending}
              >
                <div className="text-xs font-medium text-primary mb-1">{item.label}</div>
                <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">{item.prompt}</div>
              </button>
            ))}
          </div>
        </div>

        <ChatInput
          onSend={(content) => {
            createMutation.mutate(
              { data: { title: "New Conversation" } },
              {
                onSuccess: (newConv) => {
                  queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
                  setLocation(`/${newConv.id}`);
                  sendMessage(newConv.id, content, systemInstruction, model);
                },
              }
            );
          }}
          disabled={createMutation.isPending}
          isStreaming={false}
          model={model}
          onModelChange={onModelChange}
        />
      </div>
    );
  }

  const lastAssistantIndex = messages
    ? [...messages].reverse().findIndex((m) => m.role === "assistant")
    : -1;
  const lastAssistantId =
    lastAssistantIndex !== -1 && messages
      ? messages[messages.length - 1 - lastAssistantIndex]?.id
      : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 absolute top-0 w-full">
        {!sidebarOpen && (
          <Button variant="ghost" size="icon" className="h-8 w-8 mr-2 shrink-0" onClick={onToggleSidebar} title="Open sidebar">
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="font-medium truncate flex-1">{conversation?.title || "Conversation"}</h2>
        {messages && messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-2 shrink-0"
            onClick={handleExport}
            title="Export as Markdown"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 pt-14 pb-4" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="p-8 text-center text-muted-foreground">Loading messages...</div>
        ) : messages?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No messages yet. Say hello!</div>
        ) : (
          <div className="flex flex-col pb-4">
            {messages?.map((msg) => (
              <MessageBubble
                key={msg.id}
                messageId={msg.id}
                role={msg.role as "user" | "assistant"}
                content={msg.content}
                createdAt={msg.createdAt}
                isLastAssistant={msg.id === lastAssistantId && !isStreaming}
                onRegenerate={handleRegenerate}
                onEdit={msg.role === "user" && !isStreaming ? () => handleEdit(msg.id, msg.content) : undefined}
              />
            ))}
            {isStreaming && streamingMessage && (
              <MessageBubble
                role={streamingMessage.role as "assistant"}
                content={streamingMessage.content || ""}
                isStreaming={true}
              />
            )}
          </div>
        )}
      </ScrollArea>

      {showScrollBtn && (
        <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-20">
          <Button
            size="sm"
            variant="secondary"
            className={cn(
              "rounded-full shadow-md gap-1.5 px-3 transition-all",
              "border border-border"
            )}
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Scroll to bottom
          </Button>
        </div>
      )}

      <div className="shrink-0 w-full z-10">
        <ChatInput
          onSend={editingMessageId !== null ? handleSubmitEdit : handleSend}
          onStop={stopGeneration}
          disabled={false}
          isStreaming={isStreaming}
          initialValue={editingMessageId !== null ? editingContent : undefined}
          isEditing={editingMessageId !== null}
          onCancelEdit={handleCancelEdit}
          key={editingMessageId ?? "normal"}
          model={model}
          onModelChange={onModelChange}
        />
      </div>
    </div>
  );
}
