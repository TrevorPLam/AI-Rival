import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemInstruction: string;
  onSave: (instruction: string) => void;
}

export function SettingsDialog({ open, onOpenChange, systemInstruction, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState(systemInstruction ?? "");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setDraft(systemInstruction ?? "");
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const handleClear = () => {
    setDraft("");
    onSave("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Custom Instructions
          </DialogTitle>
          <DialogDescription>
            Tell Aria how to respond — your role, tone, preferred format, or any context it should always know.
            These instructions apply to all new messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="system-instruction">Instructions</Label>
          <Textarea
            id="system-instruction"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`e.g. "You are a helpful assistant. Always respond concisely. When writing code, prefer TypeScript."`}
            className="min-h-[140px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {draft.length} characters · Saved to this browser
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {systemInstruction && (
            <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={handleClear}>
              Clear
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
