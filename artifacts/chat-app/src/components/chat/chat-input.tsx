import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  };

  return (
    <div className="p-4 bg-background border-t border-border">
      <div className="max-w-3xl mx-auto relative flex items-end shadow-sm rounded-xl border border-border bg-card">
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
            disabled={!input.trim() || disabled}
            onClick={handleSend}
            data-testid="button-send-chat"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="text-center text-xs text-muted-foreground mt-3">
        Aria can make mistakes. Consider verifying important information.
      </div>
    </div>
  );
}
