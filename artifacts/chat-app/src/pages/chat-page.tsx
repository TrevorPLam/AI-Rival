import { useState, useCallback } from "react";
import { useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { useSystemInstruction } from "@/hooks/use-system-instruction";

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id ? parseInt(params.id, 10) : null;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { instruction, setInstruction } = useSystemInstruction();

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {sidebarOpen && (
        <Sidebar
          activeId={conversationId}
          onCollapse={toggleSidebar}
          systemInstruction={instruction}
          onSaveInstruction={setInstruction}
        />
      )}
      <ChatArea
        conversationId={conversationId}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        systemInstruction={instruction}
      />
    </div>
  );
}
