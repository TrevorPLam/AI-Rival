import { useState, useCallback, useRef } from "react";
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const runStream = useCallback(async (convId: number, url: string, body: object) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setStreamingMessage({
      conversationId: convId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
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
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Stream error:", error);
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamingMessage(null);
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

  const sendMessage = useCallback(async (convId: number, content: string, systemInstruction?: string) => {
    const body: Record<string, string> = { content };
    if (systemInstruction?.trim()) body.systemInstruction = systemInstruction.trim();
    await runStream(convId, `/api/gemini/conversations/${convId}/messages`, body);
  }, [runStream]);

  const regenerateResponse = useCallback(async (convId: number) => {
    await runStream(convId, `/api/gemini/conversations/${convId}/regenerate`, {});
  }, [runStream]);

  const editMessage = useCallback(async (convId: number, messageId: number, content: string, systemInstruction?: string) => {
    const body: Record<string, string | number> = { messageId, content };
    if (systemInstruction?.trim()) body.systemInstruction = systemInstruction.trim();
    await runStream(convId, `/api/gemini/conversations/${convId}/edit`, body);
  }, [runStream]);

  return {
    sendMessage,
    regenerateResponse,
    editMessage,
    stopGeneration,
    isStreaming,
    streamingMessage,
  };
}
