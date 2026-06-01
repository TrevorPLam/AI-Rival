import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import type { Components } from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: string | Date;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7 transition-opacity", className)}
      onClick={handleCopy}
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ role, content, createdAt, isStreaming, isLastAssistant, onRegenerate }: MessageBubbleProps) {
  const isUser = role === "user";
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const codeText = String(children).replace(/\n$/, "");
      const isBlock = !!match || codeText.includes("\n");

      if (isBlock) {
        const language = match ? match[1] : "text";
        return (
          <div className="relative group/code my-3 rounded-lg overflow-hidden border border-border">
            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/80 border-b border-border text-xs text-muted-foreground">
              <span className="font-mono">{language}</span>
              <CopyButton text={codeText} />
            </div>
            <SyntaxHighlighter
              style={isDark ? oneDark : oneLight}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: "0.85rem",
                background: "transparent",
              }}
            >
              {codeText}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code
          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div
      className={cn(
        "py-6 px-4 md:px-8 flex w-full group/msg",
        isUser ? "bg-background" : "bg-muted/50"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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

        <div className="flex-1 space-y-2 overflow-hidden min-w-0">
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
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

          {!isStreaming && content && (
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity",
                hovered ? "opacity-100" : "opacity-0"
              )}
            >
              <CopyButton text={content} />
              {!isUser && isLastAssistant && onRegenerate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onRegenerate}
                  title="Regenerate response"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              {createdAt && (
                <span className="text-xs text-muted-foreground ml-1 select-none">
                  {formatTime(createdAt)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
