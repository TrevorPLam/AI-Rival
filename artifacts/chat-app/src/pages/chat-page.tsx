import { useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatArea } from "@/components/chat/chat-area";

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id ? parseInt(params.id, 10) : null;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar activeId={conversationId} />
      <ChatArea conversationId={conversationId} />
    </div>
  );
}