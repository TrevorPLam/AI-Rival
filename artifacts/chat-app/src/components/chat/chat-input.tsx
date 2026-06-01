import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_CHARS = 4000;

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  initialValue?: string;
  onCancelEdit?: () => void;
  isEditing?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming, initialValue, onCancelEdit, isEditing }: ChatInputProps) {
  const [input, setInput] = useState(initialValue ?? "");
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
        <div className="text-xs text-muted-foreground">
          Aria can make mistakes. Consider verifying important information.
        </div>
        {nearLimit && (
          <div className={cn("text-xs tabular-nums", overLimit ? "text-destructive font-medium" : "text-muted-foreground")}>
            {charCount}/{MAX_CHARS}
          </div>
        )}
      </div>
    </div>
  );
}
