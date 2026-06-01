import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "py-6 px-4 md:px-8 flex w-full",
        isUser ? "bg-background" : "bg-muted/50"
      )}
      data-testid={`message-${role}`}
    >
      <div className="max-w-3xl mx-auto flex w-full gap-4 md:gap-6">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}
          >
            {isUser ? "U" : "A"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex items-center gap-1 h-6">
                <div className="w-2 h-2 rounded-full bg-foreground/30 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-foreground/30 animate-pulse delay-75" />
                <div className="w-2 h-2 rounded-full bg-foreground/30 animate-pulse delay-150" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}