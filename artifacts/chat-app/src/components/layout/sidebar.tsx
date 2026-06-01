import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, MessageSquare, Trash2, Moon, Sun, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import {
  useListGeminiConversations,
  useCreateGeminiConversation,
  useDeleteGeminiConversation,
  getListGeminiConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeId: number | null;
}

export function Sidebar({ activeId }: SidebarProps) {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useListGeminiConversations();
  const createMutation = useCreateGeminiConversation();
  const deleteMutation = useDeleteGeminiConversation();

  const handleNewChat = () => {
    createMutation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
          setLocation(`/${newConv.id}`);
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
          if (activeId === id) {
            setLocation("/");
          }
        },
      }
    );
  };

  const filtered = search.trim()
    ? (conversations ?? []).filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : conversations ?? [];

  return (
    <div className="w-64 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="font-semibold text-lg tracking-tight">Aria</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <Button
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="pl-8 pr-7 h-8 text-sm"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 p-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {search ? "No matching chats" : "No conversations yet"}
            </div>
          ) : (
            filtered.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors",
                  activeId === conv.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocation(`/${conv.id}`)}
                data-testid={`link-conversation-${conv.id}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${conv.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
