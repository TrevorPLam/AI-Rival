import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  getListGeminiConversationsQueryKey, 
  getGetGeminiConversationQueryKey,
  getListGeminiMessagesQueryKey
} from "@workspace/api-client-react";
import type { GeminiMessage } from "@workspace/api-client-react";

export function useChatStreaming(conversationId: number | null) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Partial<GeminiMessage> | null>(null);

  const sendMessage = useCallback(async (convId: number, content: string) => {
    if (!convId) return;

    setIsStreaming(true);
    setStreamingMessage({
      conversationId: convId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await fetch(`/api/gemini/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const chunk = JSON.parse(line.slice(6));
              
              if (chunk.content) {
                setStreamingMessage((prev) => ({
                  ...prev,
                  content: (prev?.content || "") + chunk.content,
                }));
              }
              
              if (chunk.titleUpdate) {
                queryClient.invalidateQueries({
                  queryKey: getListGeminiConversationsQueryKey()
                });
              }
              
              if (chunk.done) {
                // Done stream
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
    } finally {
      setIsStreaming(false);
      setStreamingMessage(null);
      // Invalidate to fetch actual saved message
      queryClient.invalidateQueries({
        queryKey: getGetGeminiConversationQueryKey(convId)
      });
      queryClient.invalidateQueries({
        queryKey: getListGeminiMessagesQueryKey(convId)
      });
      queryClient.invalidateQueries({
        queryKey: getListGeminiConversationsQueryKey()
      });
    }
  }, [queryClient]);

  return {
    sendMessage,
    isStreaming,
    streamingMessage
  };
}