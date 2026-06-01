import { useState, useCallback } from "react";

const STORAGE_KEY = "aria-system-instruction";

export function useSystemInstruction() {
  const [instruction, setInstructionState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );

  const setInstruction = useCallback((value: string) => {
    if (value.trim()) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setInstructionState(value);
  }, []);

  return { instruction, setInstruction };
}
