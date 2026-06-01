import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, MessageSquare, Trash2, Moon, Sun, Search, X, Settings, Pencil, Check, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import {
  useListGeminiConversations,
  useCreateGeminiConversation,
  useDeleteGeminiConversation,
  useUpdateGeminiConversationTitle,
  getListGeminiConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeId: number | null;
  onCollapse: () => void;
  systemInstruction: string;
  onSaveInstruction: (v: string) => void;
}

export function Sidebar({ activeId, onCollapse, systemInstruction, onSaveInstruction }: SidebarProps) {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: conversations, isLoading } = useListGeminiConversations();
  const createMutation = useCreateGeminiConversation();
  const deleteMutation = useDeleteGeminiConversation();
  const renameMutation = useUpdateGeminiConversationTitle();

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

  const startRename = (e: React.MouseEvent, id: number, currentTitle: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const commitRename = (id: number) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameMutation.mutate(
        { id, data: { title: trimmed } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
          },
        }
      );
    }
    setRenamingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename(id);
    }
    if (e.key === "Escape") {
      setRenamingId(null);
    }
  };

  const conversationsList = Array.isArray(conversations) ? conversations : [];
  const filtered = search.trim()
    ? conversationsList.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : conversationsList;

  return (
    <div className="w-64 border-r border-border bg-sidebar flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="font-semibold text-lg tracking-tight">Aria</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
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
                onClick={() => renamingId !== conv.id && setLocation(`/${conv.id}`)}
                data-testid={`link-conversation-${conv.id}`}
              >
                {renamingId === conv.id ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, conv.id)}
                      onBlur={() => commitRename(conv.id)}
                      className="h-6 text-xs px-1 py-0 flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => commitRename(conv.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => startRename(e, conv.id, conv.title)}
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${conv.id}`}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
          Custom Instructions
          {systemInstruction && (
            <span className="ml-auto h-2 w-2 rounded-full bg-primary" title="Active" />
          )}
        </Button>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        systemInstruction={systemInstruction}
        onSave={onSaveInstruction}
      />
    </div>
  );
}
