import { useEffect } from "react";

interface ShortcutHandlers {
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts({ onNewChat, onToggleSidebar }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "TEXTAREA" || tag === "INPUT";

      if (e.ctrlKey && e.shiftKey && e.key === "O") {
        e.preventDefault();
        onNewChat?.();
      }

      if (e.ctrlKey && !e.shiftKey && e.key === "b") {
        e.preventDefault();
        onToggleSidebar?.();
      }

      if (e.ctrlKey && !e.shiftKey && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[placeholder="Search chats..."]');
        searchInput?.focus();
      }

      if (!isTyping && e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewChat, onToggleSidebar]);
}
