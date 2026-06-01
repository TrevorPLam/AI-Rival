import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Square, ChevronDown, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_CHARS = 4000;

export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Flash 2.5", description: "Fast & smart" },
  { id: "gemini-2.5-pro", label: "Pro 2.5", description: "Most capable" },
  { id: "gemini-2.0-flash", label: "Flash 2.0", description: "Fastest" },
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number]["id"];

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  initialValue?: string;
  onCancelEdit?: () => void;
  isEditing?: boolean;
  model: GeminiModelId;
  onModelChange: (model: GeminiModelId) => void;
}

function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const shortcuts = [
    { keys: ["Ctrl", "Shift", "O"], label: "New chat" },
    { keys: ["Ctrl", "B"], label: "Toggle sidebar" },
    { keys: ["Ctrl", "K"], label: "Focus search" },
    { keys: ["Enter"], label: "Send message" },
    { keys: ["Shift", "Enter"], label: "New line" },
    { keys: ["Esc"], label: "Cancel edit" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 text-xs rounded border border-border bg-muted font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChatInput({ onSend, onStop, disabled, isStreaming, initialValue, onCancelEdit, isEditing, model, onModelChange }: ChatInputProps) {
  const [input, setInput] = useState(initialValue ?? "");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue !== undefined) {
      setInput(initialValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(initialValue.length, initialValue.length);
        }
      }, 0);
    }
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && isEditing && onCancelEdit) {
      onCancelEdit();
    }
  };

  const charCount = input.length;
  const nearLimit = charCount > MAX_CHARS * 0.8;
  const overLimit = charCount > MAX_CHARS;
  const activeModel = GEMINI_MODELS.find((m) => m.id === model) ?? GEMINI_MODELS[0];

  return (
    <div className="p-4 bg-background border-t border-border">
      {isEditing && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Editing message</span>
          <button className="hover:text-foreground transition-colors" onClick={onCancelEdit}>Cancel (Esc)</button>
        </div>
      )}
      <div className={cn(
        "max-w-3xl mx-auto relative flex items-end shadow-sm rounded-xl border bg-card",
        isEditing ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
      )}>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Aria..."
          className="min-h-[56px] max-h-[200px] w-full resize-none border-0 focus-visible:ring-0 px-4 py-4 bg-transparent"
          disabled={isStreaming}
          data-testid="input-chat"
        />
        {isStreaming ? (
          <Button
            size="icon"
            variant="outline"
            className="absolute bottom-2 right-2 h-10 w-10 shrink-0"
            onClick={onStop}
            title="Stop generating"
            data-testid="button-stop-chat"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-10 w-10 shrink-0"
            disabled={!input.trim() || disabled || overLimit}
            onClick={handleSend}
            data-testid="button-send-chat"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="max-w-3xl mx-auto flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-accent">
                <span className="font-medium">{activeModel.label}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {GEMINI_MODELS.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => onModelChange(m.id)}
                  className={cn("flex items-center justify-between", model === m.id && "bg-accent")}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Aria can make mistakes.
          </div>
          {nearLimit && (
            <div className={cn("text-xs tabular-nums", overLimit ? "text-destructive font-medium" : "text-muted-foreground")}>
              {charCount}/{MAX_CHARS}
            </div>
          )}
        </div>
      </div>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
