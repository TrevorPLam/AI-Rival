import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListGeminiMessages, useGetGeminiConversation } from "@workspace/api-client-react";
import { useChatStreaming } from "@/hooks/use-chat";

interface ChatAreaProps {
  conversationId: number | null;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: messages, isLoading: isLoadingMessages } = useListGeminiMessages(
    conversationId as number,
    { query: { enabled: !!conversationId } }
  );

  const { data: conversation } = useGetGeminiConversation(
    conversationId as number,
    { query: { enabled: !!conversationId } }
  );

  const { sendMessage, isStreaming, streamingMessage } = useChatStreaming(conversationId);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, streamingMessage]);

  const handleSend = (content: string) => {
    if (!conversationId) return;
    sendMessage(conversationId, content);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <div className="text-2xl font-semibold text-primary">A</div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">How can I help you today?</h2>
        <p className="text-muted-foreground max-w-md">
          Start a new conversation in the sidebar to begin interacting with Aria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 absolute top-0 w-full">
        <h2 className="font-medium truncate">{conversation?.title || "Conversation"}</h2>
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
                role={msg.role as "user" | "assistant"}
                content={msg.content}
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

      <div className="shrink-0 w-full z-10">
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}