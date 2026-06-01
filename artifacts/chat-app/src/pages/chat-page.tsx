import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { useSystemInstruction } from "@/hooks/use-system-instruction";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useCreateGeminiConversation, getListGeminiConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { GeminiModelId } from "@/components/chat/chat-input";

const DEFAULT_MODEL: GeminiModelId = "gemini-2.5-flash";

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id ? parseInt(params.id, 10) : null;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [model, setModel] = useState<GeminiModelId>(DEFAULT_MODEL);
  const { instruction, setInstruction } = useSystemInstruction();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateGeminiConversation();

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const handleNewChat = useCallback(() => {
    createMutation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
          setLocation(`/${newConv.id}`);
        },
      }
    );
  }, [createMutation, queryClient, setLocation]);

  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onToggleSidebar: toggleSidebar,
  });

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {sidebarOpen && (
        <Sidebar
          activeId={conversationId}
          onCollapse={toggleSidebar}
          systemInstruction={instruction}
          onSaveInstruction={setInstruction}
          onNewChat={handleNewChat}
        />
      )}
      <ChatArea
        conversationId={conversationId}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        systemInstruction={instruction}
        model={model}
        onModelChange={setModel}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
