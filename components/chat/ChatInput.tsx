"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { forwardRef } from "react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isDisabled: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  function ChatInput(
    { input, isLoading, isDisabled, onInputChange, onSubmit },
    ref,
  ) {
    return (
      <form
        className="flex-shrink-0 p-4 border-t border-border bg-card/50 backdrop-blur-xl"
        onSubmit={onSubmit}
      >
        <div className="flex items-center gap-3">
          <Input
            ref={ref}
            type="text"
            autoFocus
            placeholder="Ask anything about your documents..."
            value={input}
            onChange={onInputChange}
            className="flex-1 h-12 bg-background/60 border-2 border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl px-4 text-base"
          />
          <Button
            type="submit"
            disabled={isLoading || isDisabled}
            className="h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 mr-2" />
            Send
          </Button>
        </div>
      </form>
    );
  },
);
